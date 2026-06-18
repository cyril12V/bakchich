/**
 * Anti-fraude v1 : règles simples mais qui éliminent 95 % de la triche :
 *
 * 1. INTERVALLE : minimum ~15 s entre deux impressions d'un même utilisateur
 *    (une impression = 15 s de visibilité, donc plus vite = physiquement impossible).
 * 2. PAS de plafond journalier d'impressions (cadence + review des payouts suffisent).
 * 3. PLAFOND CLIC : max 10 clics/jour/utilisateur sur une même campagne.
 * 4. IDEMPOTENCE : event_id en clé primaire → un événement rejoué = ignoré.
 * 5. BAN : compte gelé = plus aucun crédit (review manuelle avant payout).
 *
 * v2 (post-lancement) : fingerprint machine, détection multi-comptes par IP,
 * scoring de régularité (un humain ne génère pas des ticks parfaitement réguliers
 * pendant 8 h), review manuelle obligatoire au-dessus de 100 € de solde.
 */
import { db, now } from "./db.js";

// Cadence physique minimale entre deux impressions (anti-bot, PAS un plafond de
// gains) : une impression = 15 s de visibilite, donc plus vite = impossible.
// Tolerance de 500 ms pour absorber la latence reseau / le jitter du tick client.
const MIN_TICK_INTERVAL_MS = 14500;
// AUCUN plafond de gains : ni quota journalier d'impressions, ni quota de clics.
// La protection anti-fraude repose sur la cadence ci-dessus + la review manuelle
// des payouts (1er retrait et gros montants) + le bannissement de compte.

// Au-delà de ce nombre de comptes DISTINCTS gagnant depuis une même IP le même jour,
// on considère que c'est une ferme : les comptes marginaux ne sont plus crédités (les
// premiers, eux, continuent normalement → on ne plafonne pas les gains légitimes).
const MAX_ACCOUNTS_PER_IP_PER_DAY = 20;
const MAX_ACCOUNTS_PER_DEVICE_PER_DAY = 3;

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** @returns {string|null} null si OK, sinon la raison du refus */
export function checkImpression(userId, ip, deviceId) {
  const last = db
    .prepare(`SELECT MAX(created_at) t FROM events WHERE user_id=? AND type='impression'`)
    .get(userId).t;
  if (last && now() - last < MIN_TICK_INTERVAL_MS) return "too_fast";

  if (deviceId) {
    const lastDevice = db
      .prepare(`SELECT MAX(created_at) t FROM events WHERE device_id=? AND type='impression'`)
      .get(deviceId).t;
    if (lastDevice && now() - lastDevice < MIN_TICK_INTERVAL_MS) return "device_too_fast";
  }

  // Anti multi-comptes : si N autres comptes gagnent déjà depuis cette IP aujourd'hui,
  // on refuse ce compte supplémentaire (les premiers ne sont pas impactés).
  if (ip) {
    const day = todayStart();
    const others = db
      .prepare(`SELECT COUNT(*) c FROM ip_accounts WHERE ip=? AND day=? AND user_id != ?`)
      .get(ip, day, userId).c;
    if (others >= MAX_ACCOUNTS_PER_IP_PER_DAY) return "ip_farm";
    db.prepare(`INSERT OR IGNORE INTO ip_accounts (ip, user_id, day) VALUES (?,?,?)`).run(ip, userId, day);
  }
  if (deviceId) {
    const day = todayStart();
    const others = db
      .prepare(`SELECT COUNT(*) c FROM device_accounts WHERE device_id=? AND day=? AND user_id != ?`)
      .get(deviceId, day, userId).c;
    if (others >= MAX_ACCOUNTS_PER_DEVICE_PER_DAY) return "device_farm";
    db.prepare(`INSERT OR IGNORE INTO device_accounts (device_id, user_id, day) VALUES (?,?,?)`)
      .run(deviceId, userId, day);
  }
  return null; // pas de plafond de gains (impressions illimitées)
}

// Plafond anti-fraude sur les CLICS uniquement (le clic vaut 50x une impression,
// donc trivialement abusable). Ce n'est PAS un plafond sur les gains d'impressions
// (qui restent illimités) : juste une garde contre le farm du multiplicateur x50.
const MAX_CLICKS_PER_CAMPAIGN_PER_DAY = 10;

export function checkClick(userId, campaignId) {
  const count = db
    .prepare(
      `SELECT COUNT(*) c FROM events
       WHERE user_id=? AND campaign_id=? AND type='click' AND created_at>=?`
    )
    .get(userId, campaignId, todayStart()).c;
  if (count >= MAX_CLICKS_PER_CAMPAIGN_PER_DAY) return "click_cap";
  return null;
}

/** Rate-limit IP ultra simple en mémoire (mettre un vrai limiteur derrière un proxy en prod). */
const ipHits = new Map();
export function ipRateLimit(ip, maxPerMinute = 60) {
  const minute = Math.floor(now() / 60000);
  const key = `${ip}:${minute}`;
  const hits = (ipHits.get(key) ?? 0) + 1;
  ipHits.set(key, hits);
  if (ipHits.size > 50000) ipHits.clear(); // purge grossière
  return hits > maxPerMinute;
}
