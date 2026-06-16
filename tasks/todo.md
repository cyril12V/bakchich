# TODO — Bakchich

## Session 2026-06-15 — Branchement Stripe + front + déploiement + durcissement

Objectif : reprendre le squelette livré et le mener au niveau « prêt à lancer » sur les 4 tracks.

### ✅ Fait cette session

#### Baseline
- [x] `npm install` backend (bump `better-sqlite3` → ^12 pour prebuilds Node 24) + extension
- [x] Extension : 6/6 tests vitest verts → puis 9/9 après durcissement
- [x] Backend : seed + boot + `/api/state` sert la pub gagnante, impression idempotente, kill-switch OK

#### Stripe (backend — fait par l'orchestrateur, chemin critique)
- [x] `payments.js` : Checkout (annonceurs), Connect Express (onboarding + status), transfers (payouts) — lazy-init, le serveur démarre sans clés Stripe
- [x] `POST /api/campaigns` → Checkout si Stripe configuré (`pending_payment`), sinon mode dev (`pending`)
- [x] Webhook `/webhooks/stripe` (corps brut + signature) → `checkout.session.completed` passe la campagne en modération
- [x] `POST /api/me/connect/onboard` + `GET /api/me/connect/status`
- [x] `POST /api/me/payout` : réservation **atomique** (anti double-retrait), 1er retrait & >100 € → review manuelle
- [x] Admin : `GET /admin/campaigns`, `GET /admin/payouts`, `POST /admin/payouts/approve|reject`
- [x] Solde retirable = gains − payouts non-rejetés (`auction.js`)
- [x] Tests `node --test` (7) sur la logique d'argent : double-retrait, seuils, libération de réserve

#### Front (sous-agent frontend-dev, vérifié e2e au navigateur)
- [x] `dashboard/` : login Google web (token via `#fragment`), solde, historique, Connect, retrait
- [x] `annonceurs/` : formulaire campagne + coût live + file d'enchère publique
- [x] `annonceurs/merci.html` : confirmation post-paiement
- [x] OAuth web ajouté côté backend (`?web=1` → redirect `SITE_URL/dashboard/#token=`)
- [x] `GET /api/me/history` (ledger) ajouté

#### Déploiement (sous-agent)
- [x] `ops/nginx/*.conf`, `ops/systemd/bakchich-backend.service`, `ops/deploy.sh`, `ops/backup-db.sh`, `ops/env.production.example`, `docs/DEPLOIEMENT.md`
- [x] `trust proxy` + `express-rate-limit` côté backend

#### Extension (sous-agent)
- [x] Notification first-run opt-in, logo SVG, doc packaging, 3 tests vitest en plus
- [x] Attribution du clic Option A (`?u=<userId>` injecté côté serveur dans `adLine`)

#### Durcissement (FIX — suite aux 2 revues sécurité/qualité)
- [x] `.gitignore` (protège `.env` + `*.db`)
- [x] `ADMIN_SECRET` fail-fast en prod + comparaison timing-safe
- [x] Idempotence webhook Stripe (table `stripe_events`)
- [x] Idempotency key Stripe sur les transfers + verrou `processing` avant virement
- [x] Anti-SSRF sur l'URL de campagne (IP privées/localhost/non-https rejetées)
- [x] Sanitize du texte de campagne (strip `< >`)
- [x] Expiration des sessions (90 j) + route `POST /api/me/logout`
- [x] Rate-limit dédié sur `/c/:id` + TTL/validation du flow OAuth + helmet
- [x] Front : parsing FR `1,50` corrigé, gestion 401 sur le retrait
- [x] Ops : `SITE_URL` ajouté (sinon paiement/login cassés en prod), sync front dans `deploy.sh`

### ⛔ Reste à faire (hors périmètre code / manuel)
- [ ] Créer les credentials Google OAuth + tester le flow e2e réel
- [ ] Clés Stripe en mode test → e2e Checkout (carte 4242) + onboarding Connect + 1er payout → bascule live
- [ ] Pages légales servies en `/legal/cgu`, `/legal/confidentialite` (le repo a des `.md` dans `legal/`, à convertir en HTML ou ajuster les liens du footer)
- [ ] Export PNG 128×128 de `extension/media/icon.svg` + `npm run package` → `.vsix` → publisher `bakchich`
- [ ] Provisionner le VPS, DNS, certbot, systemd (suivre `docs/DEPLOIEMENT.md`)
- [ ] Tester l'extension sur macOS + Linux (chemins `~/.claude`)
- [ ] Favicon (cube) pour tuer le 404 `/favicon.ico` sur les pages web

### Revue
4 tracks livrés et vérifiés (tests + e2e navigateur). 2 revues (sécurité backend, qualité front/ops) → 14 findings corrigés. Le cœur argent est jugé sûr par l'audit (réservation atomique, pas d'IDOR, webhook signé, pas de SQLi). Les éléments restants sont des actions manuelles (credentials externes, VPS, publication) documentées.

---

## Session 2026-06-15 (suite) — Guide manuel + refonte DA complète

### ✅ Fait
- [x] `docs/SETUP-MANUEL.md` — guide pas-à-pas de TOUT ce qui est manuel (Stripe test→live, Google OAuth, domaine/DNS, Marketplace, VPS, juridique) + tableau des variables `.env`
- [x] Backend : champs marque `brand_name` / `brand_icon` (data URL ≤ 64 Ko validée) / `show_on_leaderboard`
- [x] Backend : `GET /api/leaderboard` (marques opt-in, classées par dépense) + `created_at`/`brand_name` dans `/api/auction`
- [x] Backend : ligne de pub passée à **3–60 caractères** (`text_length_3_60`)
- [x] Backend : espace dev déplacé sur **`/me`** (redirects OAuth web + Connect return/refresh + `openDashboard` de l'extension)
- [x] DA : logo.png copié à la racine web (`/logo.png`) + favicon ; **noir & blanc**, **Inter + Plus Jakarta Sans**
- [x] Refonte **toutes les pages** (sous-agent frontend-dev, vérifiées e2e au navigateur) :
  - `landing/` : header collant, hero (démo spinner côte à côte + compteur live + CTA install), section annonceurs (formulaire complet : email, ligne 0/60, url, nom de marque, icône drag&drop ≤64Ko, case leaderboard, bid, blocs, estimation live, indicateur top-bid), Bid Market (filtres 24h/Tout), 3 étapes, transparence, FAQ, footer
  - `annonceurs/` : formulaire étendu + Bid Market + Leaderboard + formats/modération + FAQ annonceurs
  - `me/` : espace dev (login Google web, soldes, virements Connect, retrait, historique)
  - `faq/` + pages légales `confidentialite/` `cgu/` `mentions-legales/` `cgv-annonceurs/` (converties depuis `legal/*.md`)
- [x] Vérifs e2e navigateur : landing, /me (authentifié, données réelles), /annonceurs, pages légales → 0 erreur console
- [x] Vérifs API : ligne 3-60, brand+leaderboard, rejet icône invalide, leaderboard, auction enrichi
- [x] Tests : backend 7/7, extension 9/9 toujours verts

### ⛔ Reste (manuel — voir docs/SETUP-MANUEL.md)
Identique à la session précédente : credentials Google + Stripe, VPS/DNS/certbot, export PNG icône + publication `.vsix`, test cross-OS. La landing et toutes les pages sont maintenant à la charte définitive.

---

## Session 2026-06-15 (suite 2) — Passage React + prod + identifiants + polish

### ✅ Fait
- [x] **Front migré en React (Vite + TypeScript)** dans `web/` : Home, Annonceurs, Me, FAQ, 4 pages légales, composants (Header/Footer, CampaignForm, BidMarket, Leaderboard, LiveCounter, SpinnerDemo, Accordion…). Build vert, tsc 0 erreur. Vérifié e2e au navigateur (Home, /me authentifié avec données réelles).
- [x] **DA conservée** : noir & blanc, Inter + Plus Jakarta Sans, logo `/logo.png` + favicon. Routing SPA (react-router), API en chemins relatifs (proxy Vite en dev, nginx en prod).
- [x] **Tirets cadratins « — » supprimés** de l'UI (React + extension + seed). CTA « Se connecter » → **« Activer mes gains · via Google »** ; logout → « Déconnexion ».
- [x] **~120 corrections d'accents** sur 10 fichiers React (français impeccable) via passe dédiée.
- [x] **Identifiants Google** intégrés dans `backend/.env` (gitignoré) + `ADMIN_SECRET` généré.
- [x] **Vraies mentions légales** (SHALABY Cyril, micro-entreprise, SIREN/SIRET/TVA, Hostinger) dans `legal/mentions-legales.md` + page React.
- [x] **Extension** : logo en icône (`media/icon.png` 128×128 depuis logo.png), `.vscodeignore`, `.vsix` packagé (`extension/bakchich-0.1.0.vsix`).
- [x] **Prod préparée** : `ops/provision.sh` (bootstrap VPS), `ops/setup-app.sh` (install appli, build React), `ops/package-prod.sh` (archive), nginx en **fallback SPA** + cache assets, `deploy.sh` build React. Archive `bakchich-prod.tar.gz` régénérée (web/ sources).
- [x] **Docs** : `docs/SETUP-MANUEL.md` (tout le manuel) + `docs/MISE-EN-PROD.md` (modèle mental VPS vs Marketplace, étapes).
- [x] Nettoyage : anciens dossiers HTML supprimés, `backend/.claude/` retiré, `.gitignore` à jour (web/dist, .vsix, archive).
- [x] Tests finaux : backend 7/7, extension 9/9, web tsc 0 erreur.

### ⚠️ Note sécurité
Le secret Google a transité en clair dans le chat → régénérable côté console Google si besoin. `.env` est gitignoré et exclu de l'archive de prod.

### ⛔ Reste (manuel)
Clés Stripe (test→live), VPS/DNS/certbot (suivre `docs/MISE-EN-PROD.md`), publication `.vsix` au Marketplace, test extension cross-OS.
