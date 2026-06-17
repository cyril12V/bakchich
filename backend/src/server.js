/**
 * Serveur Bakchich : API complète.
 *
 * Endpoints extension :
 *   GET  /api/state          → kill-switch + pub gagnante (1 appel = tout)
 *   POST /api/events         → tick d'impression (idempotent, anti-fraude)
 *   GET  /api/me/balance     → solde du dev
 *
 * Clics (publics, trackés serveur : infalsifiables côté client) :
 *   GET  /c/:campaignId      → enregistre le clic puis redirige vers l'annonceur
 *
 * Auth :
 *   GET  /auth/google/start?redirect_port=NNNN
 *   GET  /auth/google/callback
 *
 * Annonceurs :
 *   GET  /api/auction        → file d'attente publique de l'enchère
 *   POST /api/campaigns      → créer une campagne (passe en modération)
 *
 * Admin (header x-admin-secret) :
 *   POST /admin/killswitch   { on: true|false }
 *   POST /admin/moderate     { campaignId, decision: "active"|"rejected" }
 */
import express from "express";
import crypto from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { db, now } from "./db.js";
import {
  currentWinner, auctionQueue, leaderboard, recordImpression, recordClick,
  balanceOf, reservePayout, markPayoutPaid, markPayoutRejected, MIN_BID_CENTS,
  IMPRESSIONS_PER_BLOCK,
} from "./auction.js";
import { checkImpression, checkClick, ipRateLimit } from "./antifraud.js";
import {
  stripeConfigured, createCheckoutSession, createEditCheckoutSession, constructWebhookEvent,
  createConnectOnboarding, connectStatus, transferToDev,
  MIN_PAYOUT_CENTS, MANUAL_REVIEW_THRESHOLD_CENTS,
} from "./payments.js";

const app = express();
// Derrière nginx : faire confiance au 1er proxy pour récupérer la vraie IP client
// (sinon req.ip = 127.0.0.1 et l'anti-fraude/rate-limit IP est inopérant).
app.set("trust proxy", 1);
// En-têtes de sécurité (nosniff, X-Frame-Options, HSTS si HTTPS, etc.).
app.use(helmet());

const PORT = process.env.PORT ?? 3939;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
// URL publique du site (redirections Stripe Checkout / Connect / login web).
const SITE_URL = process.env.SITE_URL ?? BASE_URL;

// Secret admin : refuser de démarrer sur la valeur par défaut (sécurité fail-fast).
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "change-moi-absolument";
if (process.env.NODE_ENV === "production" &&
    (!process.env.ADMIN_SECRET || ADMIN_SECRET === "change-moi-absolument")) {
  console.error("FATAL : ADMIN_SECRET non défini ou laissé à la valeur par défaut. Arrêt.");
  process.exit(1);
}

/* ---------- Webhook Stripe (corps BRUT, avant express.json) ---------- */
// La vérification de signature exige le payload brut non parsé.
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  let event;
  try {
    event = constructWebhookEvent(req.body, req.headers["stripe-signature"]);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // Idempotence : Stripe peut rejouer le même événement → on ne le traite qu'une fois.
  const seen = db.prepare(`SELECT 1 FROM stripe_events WHERE id=?`).get(event.id);
  if (seen) return res.json({ received: true, duplicate: true });

  db.transaction(() => {
    db.prepare(`INSERT INTO stripe_events (id, processed_at) VALUES (?, ?)`).run(event.id, Date.now());
    if (event.type === "checkout.session.completed") {
      const md = event.data.object.metadata ?? {};
      const campaignId = md.campaignId;
      const editBid = md.editBid ? parseInt(md.editBid, 10) : null;
      const editBlocks = md.editBlocks ? parseInt(md.editBlocks, 10) : null;

      if (campaignId && Number.isInteger(editBid) && Number.isInteger(editBlocks)) {
        // Paiement de la DIFFÉRENCE (modification) → on applique le nouveau bid/blocs.
        const c = db.prepare(`SELECT text, url, status, impressions FROM campaigns WHERE id=?`).get(campaignId);
        if (c) {
          const verdict = autoModerate(c.text, c.url);
          const status = verdict === "rejected"
            ? "rejected"
            : c.status === "paused"
              ? "paused"
              : editBlocks * IMPRESSIONS_PER_BLOCK > c.impressions ? "active" : "exhausted";
          db.prepare(`UPDATE campaigns SET bid_cents=?, blocks=?, paid_cents=?, status=? WHERE id=?`)
            .run(editBid, editBlocks, editBid * editBlocks, status, campaignId);
        }
      } else if (campaignId) {
        // Paiement INITIAL → modération AUTOMATIQUE (diffusion immédiate sauf contenu interdit).
        const c = db.prepare(`SELECT text, url FROM campaigns WHERE id=? AND status='pending_payment'`).get(campaignId);
        if (c) {
          db.prepare(`UPDATE campaigns SET status=? WHERE id=? AND status='pending_payment'`)
            .run(autoModerate(c.text, c.url), campaignId);
        }
      }
    }
  })();
  res.json({ received: true });
});

// JSON pour tout le reste (le webhook ci-dessus a déjà consommé sa route).
// limit 1mb : autorise une icône de marque jusqu'à ~512 Ko (base64) + champs.
// nginx borne déjà la requête à 4 Mo (défense en profondeur).
app.use(express.json({ limit: "1mb" }));

// Rate-limit global sur les routes d'écriture/sensibles (en plus de l'anti-fraude par user).
const writeLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
app.use(["/api/events", "/api/campaigns", "/api/me", "/auth"], writeLimiter);
// Rate-limit STRICT sur l'admin : anti brute-force du secret (en plus du timingSafeEqual).
const adminLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use("/admin", adminLimiter);
// Limiteur dédié aux clics (lien public) : empêche d'épuiser le quota d'un dev concurrent.
const clickLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

/* ---------- helpers ---------- */

function authUser(req) {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (!token) return null;
  const session = db
    .prepare(`SELECT user_id FROM sessions WHERE token=? AND (expires_at IS NULL OR expires_at > ?)`)
    .get(token, now());
  if (!session) return null;
  const user = db.prepare(`SELECT * FROM users WHERE id=? AND banned=0`).get(session.user_id);
  return user ?? null;
}

function killswitchOn() {
  return db.prepare(`SELECT value FROM config WHERE key='killswitch'`).get().value === "1";
}

/** Hyperlien terminal OSC 8 : affiche `label` cliquable, l'URL reste masquée.
 *  Les terminaux sans support OSC 8 ignorent la séquence et montrent juste le
 *  label (dégradation propre : jamais de caractères parasites, juste non cliquable). */
function osc8(url, label) {
  const ESC = "\u001b";
  const ST = ESC + "\\"; // String Terminator (ESC \)
  return `${ESC}]8;;${url}${ST}${label}${ESC}]8;;${ST}`;
}

/** La ligne affichée dans le spinner : texte + nom de marque CLIQUABLE.
 *  Le lien de clic tracké est masqué derrière le mot (bien plus lisible que l'URL
 *  brute). Attribution du clic (Option A du cahier des charges) : on injecte
 *  ?u=<userId> pour créditer le dev qui a diffusé. La falsification est bornée par
 *  l'anti-fraude (plafond clics/jour/campagne) + la review manuelle avant payout. */
function adLine(campaign, userId) {
  const u = userId ? `?u=${encodeURIComponent(userId)}` : "";
  const url = `${BASE_URL}/c/${campaign.id}${u}`;
  const label = campaign.brand_name || campaign.id;
  return `${campaign.text} ↗ ${osc8(url, label)}`;
}

/** URL de campagne sûre : HTTPS public uniquement (anti-SSRF/IP privées/phishing interne). */
function isValidCampaignUrl(url) {
  if (typeof url !== "string" || url.length > 2000) return false;
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (/^(localhost$|127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|\[)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  return true;
}

/** Retire les caractères HTML d'un texte de campagne (défense en profondeur). */
function sanitizeText(text) {
  return String(text).replace(/[<>]/g, "").trim();
}

/** Modération AUTOMATIQUE : on accepte tout par défaut (diffusion immédiate),
 *  sauf contenu manifestement interdit (adulte, scam, crypto pump, malware, haine).
 *  @returns {"active"|"rejected"} */
const BLOCKLIST = [
  "porn", "porno", "xxx", "escort", "sexe", "nude", "casino", "viagra", "cialis",
  "pump", "1000x", "100x", "moonshot", "rug", "memecoin", "shitcoin",
  "rendement garanti", "gains garantis", "guaranteed returns", "double ton argent",
  "malware", "keylogger", "hack ton", "crack", "warez", "carding", "ponzi",
  "arnaque", "nazi", "terror",
];
function autoModerate(text, url) {
  const hay = `${text} ${url}`.toLowerCase();
  return BLOCKLIST.some((w) => hay.includes(w)) ? "rejected" : "active";
}

/** Icône de marque : data URL image (png/jpeg/webp) ≤ 64 Ko. Renvoie null si absente. */
function validateBrandIcon(icon) {
  if (!icon) return { ok: true, value: null };
  if (typeof icon !== "string") return { ok: false };
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(icon)) return { ok: false };
  // 512 Ko de binaire ≈ 700 Ko de base64. On borne la chaîne pour être large mais sûr.
  if (icon.length > 720_000) return { ok: false };
  return { ok: true, value: icon };
}

/* ---------- API extension ---------- */

app.get("/api/state", (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  if (killswitchOn()) return res.json({ killswitch: true, ad: null });

  const winner = currentWinner();
  res.json({
    killswitch: false,
    ad: winner ? { campaignId: winner.id, line: adLine(winner, user.id) } : null,
  });
});

app.post("/api/events", (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  if (killswitchOn()) return res.json({ ok: false, reason: "killswitch" });
  if (ipRateLimit(req.ip)) return res.status(429).json({ error: "rate_limited" });

  const { eventId, type, campaignId } = req.body ?? {};
  if (!eventId || type !== "impression" || !campaignId) {
    return res.status(400).json({ error: "bad_request" });
  }

  // Idempotence : déjà vu → OK silencieux.
  const seen = db.prepare(`SELECT 1 FROM events WHERE event_id=?`).get(eventId);
  if (seen) return res.json({ ok: true, duplicate: true });

  // La campagne doit être CELLE qui diffuse réellement (pas un id forgé).
  const winner = currentWinner();
  if (!winner || winner.id !== campaignId) {
    return res.json({ ok: false, reason: "not_current_ad" });
  }

  const refusal = checkImpression(user.id, req.ip);
  if (refusal) return res.json({ ok: false, reason: refusal });

  const credit = recordImpression(eventId, user.id, winner);
  res.json({ ok: true, creditCents: credit });
});

app.get("/api/me/balance", (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json(balanceOf(user.id));
});

/** Profil du compte connecté (dev et/ou annonceur, même compte Google). */
app.get("/api/me/profile", (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ email: user.email, name: user.name ?? "" });
});

/** Campagnes de l'annonceur connecté (associées à son email). */
app.get("/api/me/campaigns", (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const rows = db
    .prepare(
      `SELECT id, text, url, bid_cents, blocks, impressions, clicks, status, created_at,
              brand_name, show_on_leaderboard
       FROM campaigns WHERE advertiser_user_id = ? OR advertiser_email = ?
       ORDER BY created_at DESC`
    )
    .all(user.id, user.email);
  res.json({ campaigns: rows });
});

/** Déconnexion : invalide le token de session courant. */
app.post("/api/me/logout", (req, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (token) db.prepare(`DELETE FROM sessions WHERE token=?`).run(token);
  res.json({ ok: true });
});

/** Historique récent des gains du dev (depuis le ledger immuable). */
app.get("/api/me/history", (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const rows = db
    .prepare(
      `SELECT e.type, e.credit_cents, e.created_at, c.text AS campaign_text
       FROM events e LEFT JOIN campaigns c ON c.id = e.campaign_id
       WHERE e.user_id = ?
       ORDER BY e.created_at DESC
       LIMIT 100`
    )
    .all(user.id);
  res.json({ events: rows });
});

/* ---------- Clics : lien de redirection tracké ---------- */

// Fenêtre pendant laquelle un dev ayant affiché la pub peut être crédité d'un clic.
const CLICK_ATTRIBUTION_WINDOW_MS = 10 * 60 * 1000;

app.get("/c/:campaignId", clickLimiter, (req, res) => {
  const campaign = db.prepare(`SELECT * FROM campaigns WHERE id=?`).get(req.params.campaignId);
  if (!campaign) return res.status(404).send("Campagne introuvable");

  // ANTI-FRAUDE : le `?u=` est public et forgeable. On NE crédite un clic que si
  // l'utilisateur revendiqué a RÉELLEMENT affiché cette campagne récemment
  // (preuve = une impression dans le ledger sur la fenêtre ci-dessus). Sans ça,
  // n'importe qui pourrait forger /c/<id>?u=<n'importe quel userId>.
  const userId = typeof req.query.u === "string" ? req.query.u : null;
  if (userId && !killswitchOn()) {
    const user = db.prepare(`SELECT * FROM users WHERE id=? AND banned=0`).get(userId);
    const sawIt = user && db
      .prepare(
        `SELECT 1 FROM events
         WHERE user_id=? AND campaign_id=? AND type='impression' AND created_at > ?
         LIMIT 1`
      )
      .get(userId, campaign.id, now() - CLICK_ATTRIBUTION_WINDOW_MS);
    if (user && sawIt && !checkClick(user.id, campaign.id)) {
      recordClick(crypto.randomUUID(), user.id, campaign);
    }
  }
  res.redirect(302, campaign.url);
});

/* ---------- Auth Google OAuth ---------- */

const pendingAuth = new Map(); // state → { redirectPort?, web?, createdAt }
const PENDING_TTL_MS = 10 * 60 * 1000;

app.get("/auth/google/start", (req, res) => {
  // Purge des flows OAuth abandonnés (évite la croissance mémoire non bornée).
  for (const [k, v] of pendingAuth) {
    if (now() - v.createdAt > PENDING_TTL_MS) pendingAuth.delete(k);
  }

  // Mode web ou extension. Pour l'extension : valider le port (1024–65535).
  const web = req.query.web === "1";
  let redirectPort = null;
  if (!web) {
    redirectPort = parseInt(req.query.redirect_port, 10);
    if (isNaN(redirectPort) || redirectPort < 1024 || redirectPort > 65535) {
      return res.status(400).send("Port de redirection invalide.");
    }
  }

  // Destination web après login : LISTE BLANCHE stricte (le token revient dans le
  // fragment de l'URL, donc on ne laisse pointer que vers nos 2 espaces connus).
  const ALLOWED_NEXT = new Set(["/me/", "/annonceurs/espace"]);
  const next = ALLOWED_NEXT.has(req.query.next) ? req.query.next : "/me/";

  const state = crypto.randomUUID();
  pendingAuth.set(state, { redirectPort, web, next, createdAt: now() });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${BASE_URL}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  const ctx = pendingAuth.get(state);
  pendingAuth.delete(state);
  if (!code || !ctx || (!ctx.redirectPort && !ctx.web)) {
    return res.status(400).send("Flow OAuth invalide.");
  }
  if (now() - ctx.createdAt > PENDING_TTL_MS) {
    return res.status(400).send("Flow OAuth expiré, réessaie.");
  }

  try {
    // Échange code → tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: `${BASE_URL}/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error || !tokens.id_token) throw new Error("token_exchange_failed");

    // On VALIDE l'id_token côté Google (signature, expiration, audience) au lieu de
    // faire confiance à l'userinfo seul : tokeninfo rejette tout token forgé/expiré.
    const tiRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`
    );
    const claims = await tiRes.json();
    if (!tiRes.ok || claims.error) throw new Error("id_token_invalid");
    if (claims.aud !== (process.env.GOOGLE_CLIENT_ID ?? "")) throw new Error("aud_mismatch");
    if (claims.iss !== "accounts.google.com" && claims.iss !== "https://accounts.google.com") {
      throw new Error("iss_mismatch");
    }
    if (claims.email_verified !== "true" && claims.email_verified !== true) {
      throw new Error("email_unverified");
    }
    const email = claims.email;
    const name = claims.name ?? "";
    if (!email) throw new Error("no email");

    // Upsert user + session
    let user = db.prepare(`SELECT * FROM users WHERE email=?`).get(email);
    if (!user) {
      user = { id: crypto.randomUUID(), email, name };
      db.prepare(`INSERT INTO users (id,email,name,created_at) VALUES (?,?,?,?)`)
        .run(user.id, user.email, user.name, now());
    }
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = now() + 30 * 24 * 60 * 60 * 1000; // 30 jours (limite la fenêtre d'un token volé)
    db.prepare(`INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES (?,?,?,?)`)
      .run(sessionToken, user.id, now(), expiresAt);

    if (ctx.web) {
      // Web : token dans le fragment (#) → jamais envoyé au serveur ni loggé.
      // ctx.next = destination (/me/ pour les devs, /annonceurs/espace pour les annonceurs).
      return res.redirect(`${SITE_URL}${ctx.next}#token=${sessionToken}`);
    }
    // Retour vers l'extension (mini-serveur localhost)
    res.redirect(`http://127.0.0.1:${ctx.redirectPort}/?token=${sessionToken}`);
  } catch {
    if (ctx.web) return res.redirect(`${SITE_URL}${ctx.next}#error=auth`);
    res.redirect(`http://127.0.0.1:${ctx.redirectPort}/`);
  }
});

/* ---------- Annonceurs ---------- */

app.get("/api/auction", (_req, res) => {
  res.json({ queue: auctionQueue(), minBidCents: MIN_BID_CENTS });
});

/** Icône d'une campagne servie comme une VRAIE image (cacheable). On NE met pas
 *  les data-URL dans les réponses JSON publiques (auction/leaderboard) pour éviter
 *  des réponses de plusieurs Mo (DoS) : le front référence cette URL via <img>. */
app.get("/api/campaigns/:id/icon", (req, res) => {
  const row = db.prepare(`SELECT brand_icon FROM campaigns WHERE id=?`).get(req.params.id);
  const icon = row?.brand_icon;
  const m = typeof icon === "string"
    ? icon.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/)
    : null;
  if (!m) return res.status(404).end();
  const buf = Buffer.from(m[2], "base64");
  res.set("Content-Type", m[1]);
  res.set("Cache-Control", "public, max-age=3600");
  res.send(buf);
});

/** Leaderboard public des marques (opt-in via show_on_leaderboard). */
app.get("/api/leaderboard", (_req, res) => {
  res.json({ leaderboard: leaderboard() });
});

app.post("/api/campaigns", async (req, res) => {
  // Si l'annonceur est connecté (token), on rattache la campagne à SON COMPTE
  // (en plus de l'email de contact libre) → elle apparaît dans son espace.
  const owner = authUser(req);

  const { advertiserEmail, url, bidCents, blocks } = req.body ?? {};
  const text = sanitizeText(req.body?.text ?? "");
  const brandName = req.body?.brandName ? sanitizeText(req.body.brandName).slice(0, 40) : "";
  const showOnLeaderboard = req.body?.showOnLeaderboard === true ? 1 : 0;
  if (!advertiserEmail || !text || !url || !bidCents || !blocks) {
    return res.status(400).json({ error: "bad_request" });
  }
  if (!/.+@.+\..+/.test(advertiserEmail)) return res.status(400).json({ error: "bad_email" });
  if (text.length < 3 || text.length > 60) return res.status(400).json({ error: "text_length_3_60" });
  if (!brandName) return res.status(400).json({ error: "brand_name_required" });
  if (!Number.isInteger(bidCents) || bidCents < MIN_BID_CENTS) return res.status(400).json({ error: "min_bid_1_euro" });
  if (!Number.isInteger(blocks) || blocks < 1) return res.status(400).json({ error: "blocks_min_1" });
  if (!isValidCampaignUrl(url)) return res.status(400).json({ error: "https_only" });
  const icon = validateBrandIcon(req.body?.brandIcon);
  if (!icon.ok) return res.status(400).json({ error: "bad_brand_icon" });
  if (!icon.value) return res.status(400).json({ error: "brand_icon_required" });

  const id = crypto.randomUUID().slice(0, 8);
  const campaign = { id, text, url };
  const ownerId = owner?.id ?? null;
  // Modération AUTOMATIQUE : diffusion immédiate sauf contenu interdit.
  const verdict = autoModerate(text, url); // "active" | "rejected"

  // Avec Stripe : on encaisse AVANT de diffuser. 'pending_payment' jusqu'au webhook,
  // qui applique ensuite la modération auto (→ active ou rejected).
  if (stripeConfigured()) {
    db.prepare(
      `INSERT INTO campaigns (id,advertiser_email,advertiser_user_id,text,url,bid_cents,blocks,brand_name,brand_icon,show_on_leaderboard,paid_cents,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, 'pending_payment', ?)`
    ).run(id, advertiserEmail, ownerId, text, url, bidCents, blocks, brandName, icon.value, showOnLeaderboard, bidCents * blocks, now());
    try {
      const { url: checkoutUrl } = await createCheckoutSession({
        campaign, blocks, bidCents, advertiserEmail, baseSiteUrl: SITE_URL,
      });
      return res.json({ ok: true, campaignId: id, status: "pending_payment", checkoutUrl });
    } catch (err) {
      db.prepare(`DELETE FROM campaigns WHERE id=? AND status='pending_payment'`).run(id);
      return res.status(502).json({ error: "checkout_failed" });
    }
  }

  // Sans Stripe (dev local) : pas d'encaissement, diffusion immédiate (modération auto).
  db.prepare(
    `INSERT INTO campaigns (id,advertiser_email,advertiser_user_id,text,url,bid_cents,blocks,brand_name,brand_icon,show_on_leaderboard,paid_cents,status,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, advertiserEmail, ownerId, text, url, bidCents, blocks, brandName, icon.value, showOnLeaderboard, bidCents * blocks, verdict, now());
  res.json({
    ok: true, campaignId: id, status: verdict,
    message: verdict === "active"
      ? "Campagne validée et diffusée (mode dev, Stripe non configuré)."
      : "Campagne refusée par la modération automatique (contenu interdit).",
  });
});

/** Statut résultant d'une campagne après édition (re-modération + budget restant). */
function resolvedStatus(verdict, prevStatus, blocks, impressions) {
  if (verdict === "rejected") return "rejected";
  if (prevStatus === "paused") return "paused";
  return blocks * IMPRESSIONS_PER_BLOCK > impressions ? "active" : "exhausted";
}

/** Modifier une campagne existante. Augmentation de bid/blocs → paiement de la différence. */
app.post("/api/campaigns/:id/edit", async (req, res) => {
  const owner = authUser(req);
  if (!owner) return res.status(401).json({ error: "unauthorized" });

  const campaign = db.prepare(`SELECT * FROM campaigns WHERE id=?`).get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "not_found" });
  // Ownership strict (anti-IDOR) : la campagne doit appartenir au compte connecté.
  if (campaign.advertiser_user_id !== owner.id && campaign.advertiser_email !== owner.email) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!["active", "paused", "exhausted"].includes(campaign.status)) {
    return res.status(400).json({ error: "not_editable" });
  }

  // Champs proposés (optionnels) : valeur courante si absent.
  const text = req.body?.text !== undefined ? sanitizeText(req.body.text) : campaign.text;
  const url = req.body?.url !== undefined ? req.body.url : campaign.url;
  const brandName = req.body?.brandName !== undefined ? sanitizeText(req.body.brandName).slice(0, 40) : campaign.brand_name;
  const showOnLeaderboard = req.body?.showOnLeaderboard !== undefined ? (req.body.showOnLeaderboard === true ? 1 : 0) : campaign.show_on_leaderboard;
  const newBid = req.body?.bidCents !== undefined ? req.body.bidCents : campaign.bid_cents;
  const newBlocks = req.body?.blocks !== undefined ? req.body.blocks : campaign.blocks;

  if (typeof text !== "string" || text.length < 3 || text.length > 60) return res.status(400).json({ error: "text_length_3_60" });
  if (!brandName) return res.status(400).json({ error: "brand_name_required" });
  if (!isValidCampaignUrl(url)) return res.status(400).json({ error: "https_only" });
  if (!Number.isInteger(newBid) || newBid < MIN_BID_CENTS) return res.status(400).json({ error: "min_bid_1_euro" });
  if (!Number.isInteger(newBlocks) || newBlocks < 1) return res.status(400).json({ error: "blocks_min_1" });
  if (newBlocks * IMPRESSIONS_PER_BLOCK < campaign.impressions) return res.status(400).json({ error: "blocks_below_served" });

  let brandIcon = campaign.brand_icon;
  if (req.body?.brandIcon !== undefined && req.body.brandIcon !== null) {
    const icon = validateBrandIcon(req.body.brandIcon);
    if (!icon.ok) return res.status(400).json({ error: "bad_brand_icon" });
    brandIcon = icon.value ?? campaign.brand_icon;
  }

  const newCost = newBid * newBlocks;
  const diff = newCost - (campaign.paid_cents ?? 0);
  const verdict = autoModerate(text, url);

  // Augmentation à payer → on encaisse la différence d'abord ; bid/blocs appliqués
  // au webhook. Les champs sans impact prix sont appliqués tout de suite.
  if (diff > 0 && stripeConfigured()) {
    db.prepare(`UPDATE campaigns SET text=?, url=?, brand_name=?, brand_icon=?, show_on_leaderboard=? WHERE id=?`)
      .run(text, url, brandName, brandIcon, showOnLeaderboard, campaign.id);
    try {
      const { url: checkoutUrl } = await createEditCheckoutSession({
        campaign, diffCents: diff, newBid, newBlocks,
        advertiserEmail: campaign.advertiser_email, baseSiteUrl: SITE_URL,
      });
      return res.json({ ok: true, status: "pending_payment", checkoutUrl, diffCents: diff });
    } catch {
      return res.status(502).json({ error: "checkout_failed" });
    }
  }

  // Pas d'augmentation (ou bid/blocs en baisse) → tout appliqué tout de suite.
  // On NE rembourse PAS : paid_cents reste au max déjà payé.
  const newPaid = Math.max(campaign.paid_cents ?? 0, newCost);
  const status = resolvedStatus(verdict, campaign.status, newBlocks, campaign.impressions);
  db.prepare(
    `UPDATE campaigns SET text=?, url=?, brand_name=?, brand_icon=?, show_on_leaderboard=?, bid_cents=?, blocks=?, paid_cents=?, status=? WHERE id=?`
  ).run(text, url, brandName, brandIcon, showOnLeaderboard, newBid, newBlocks, newPaid, status, campaign.id);
  res.json({ ok: true, status: "updated", campaignStatus: status });
});

/* ---------- Devs : reversements Stripe Connect ---------- */

app.get("/api/me/connect/status", async (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  try {
    res.json(await connectStatus(user));
  } catch {
    res.status(502).json({ error: "stripe_error" });
  }
});

app.post("/api/me/connect/onboard", async (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  if (!stripeConfigured()) return res.status(503).json({ error: "stripe_not_configured" });
  try {
    const { url } = await createConnectOnboarding({
      user,
      baseSiteUrl: SITE_URL,
      saveAccountId: (acctId) =>
        db.prepare(`UPDATE users SET stripe_account_id=? WHERE id=?`).run(acctId, user.id),
    });
    res.json({ url });
  } catch {
    res.status(502).json({ error: "stripe_error" });
  }
});

app.post("/api/me/payout", async (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  if (!stripeConfigured()) return res.status(503).json({ error: "stripe_not_configured" });

  // Anti double-retrait : refuser si un payout est déjà en cours (la fenêtre d'appel
  // Stripe connectStatus laisse sinon deux requêtes parallèles se faufiler).
  const inFlight = db
    .prepare(`SELECT 1 FROM payouts WHERE user_id=? AND status IN ('pending_review','processing') LIMIT 1`)
    .get(user.id);
  if (inFlight) return res.status(409).json({ error: "payout_already_in_progress" });

  // Le dev doit avoir terminé l'onboarding Connect (IBAN/KYC) côté Stripe.
  let status;
  try {
    status = await connectStatus(user);
  } catch {
    return res.status(502).json({ error: "stripe_error" });
  }
  if (!status.connected || !status.payoutsEnabled) {
    return res.status(400).json({ error: "connect_incomplete" });
  }

  // Réservation atomique : décide review-manuelle vs auto et bloque le double-retrait.
  const r = reservePayout(user.id, {
    minPayoutCents: MIN_PAYOUT_CENTS,
    reviewThresholdCents: MANUAL_REVIEW_THRESHOLD_CENTS,
  });
  if (!r.ok) {
    return res.status(400).json({ error: r.reason, availableCents: r.availableCents, minPayoutCents: MIN_PAYOUT_CENTS });
  }

  if (r.needsReview) {
    return res.json({ ok: true, status: "pending_review", amountCents: r.amountCents,
      message: "Retrait en cours de vérification manuelle (1er retrait ou montant élevé)." });
  }

  // Chemin auto : virement immédiat.
  try {
    const ref = await transferToDev({
      amountCents: r.amountCents, destination: user.stripe_account_id, payoutId: r.payoutId,
    });
    markPayoutPaid(r.payoutId, ref);
    res.json({ ok: true, status: "paid", amountCents: r.amountCents });
  } catch {
    markPayoutRejected(r.payoutId); // libère la réserve, le solde redevient retirable
    res.status(502).json({ error: "transfer_failed" });
  }
});

/* ---------- Admin ---------- */

function requireAdmin(req, res, next) {
  const provided = String(req.headers["x-admin-secret"] ?? "");
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_SECRET);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

app.post("/admin/killswitch", requireAdmin, (req, res) => {
  const on = req.body?.on === true;
  db.prepare(`UPDATE config SET value=? WHERE key='killswitch'`).run(on ? "1" : "0");
  res.json({ ok: true, killswitch: on });
});

app.post("/admin/moderate", requireAdmin, (req, res) => {
  const { campaignId, decision } = req.body ?? {};
  if (!["active", "rejected", "paused"].includes(decision)) {
    return res.status(400).json({ error: "bad_decision" });
  }
  db.prepare(`UPDATE campaigns SET status=? WHERE id=?`).run(decision, campaignId);
  res.json({ ok: true });
});

/** File de modération : campagnes payées en attente de validation (défaut: pending). */
app.get("/admin/campaigns", requireAdmin, (req, res) => {
  const status = req.query.status ?? "pending";
  const rows = db
    .prepare(`SELECT id, advertiser_email, text, url, bid_cents, blocks, status, created_at
              FROM campaigns WHERE status=? ORDER BY created_at ASC`)
    .all(status);
  res.json({ campaigns: rows });
});

/** Retraits en attente de review manuelle (1er retrait, gros montants). */
app.get("/admin/payouts", requireAdmin, (req, res) => {
  const status = req.query.status ?? "pending_review";
  const rows = db
    .prepare(`SELECT p.id, p.user_id, u.email, p.amount_cents, p.status, p.created_at
              FROM payouts p JOIN users u ON u.id=p.user_id
              WHERE p.status=? ORDER BY p.created_at ASC`)
    .all(status);
  res.json({ payouts: rows });
});

/** Approuver un retrait en review → exécute le virement Stripe réel. */
app.post("/admin/payouts/approve", requireAdmin, async (req, res) => {
  const { payoutId } = req.body ?? {};
  const payout = db.prepare(`SELECT * FROM payouts WHERE id=?`).get(payoutId);
  if (!payout || payout.status !== "pending_review") {
    return res.status(400).json({ error: "not_pending_review" });
  }
  const user = db.prepare(`SELECT * FROM users WHERE id=?`).get(payout.user_id);
  if (!user?.stripe_account_id) return res.status(400).json({ error: "no_connect_account" });
  if (!stripeConfigured()) return res.status(503).json({ error: "stripe_not_configured" });
  // Verrou : passer en 'processing' AVANT le transfer → un double-clic d'approbation
  // ne relance pas un 2e virement (et l'idempotency key Stripe protège en dernier recours).
  db.prepare(`UPDATE payouts SET status='processing' WHERE id=? AND status='pending_review'`).run(payoutId);
  try {
    const ref = await transferToDev({
      amountCents: payout.amount_cents, destination: user.stripe_account_id, payoutId,
    });
    markPayoutPaid(payoutId, ref);
    res.json({ ok: true, status: "paid" });
  } catch {
    markPayoutRejected(payoutId); // libère la réserve, le dev pourra réessayer
    res.status(502).json({ error: "transfer_failed" });
  }
});

/** Refuser un retrait en review → libère la réserve (le solde redevient retirable). */
app.post("/admin/payouts/reject", requireAdmin, (req, res) => {
  const { payoutId } = req.body ?? {};
  const payout = db.prepare(`SELECT * FROM payouts WHERE id=?`).get(payoutId);
  if (!payout || payout.status !== "pending_review") {
    return res.status(400).json({ error: "not_pending_review" });
  }
  markPayoutRejected(payoutId);
  res.json({ ok: true, status: "rejected" });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// Derrière nginx : on n'écoute QUE sur la boucle locale. Le port 3939 n'est
// jamais joignable depuis l'extérieur (défense en profondeur, en plus du pare-feu).
app.listen(PORT, "127.0.0.1", () => {
  console.log(`🪙 Bakchich backend → ${BASE_URL}`);
  console.log(`   Kill-switch : ${killswitchOn() ? "ACTIF ⛔" : "off ✅"}`);
  console.log(`   Stripe      : ${stripeConfigured() ? "configuré ✅" : "non configuré (mode dev) ⚠️"}`);
});
