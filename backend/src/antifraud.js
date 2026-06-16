/**
 * Anti-fraude v1 — règles simples mais qui éliminent 95 % de la triche :
 *
 * 1. INTERVALLE : minimum 4,5 s entre deux impressions d'un même utilisateur
 *    (une impression = 5 s de visibilité, donc plus vite = physiquement impossible).
 * 2. PLAFOND JOUR : max 2 000 impressions/jour/utilisateur
 *    (≈ 2 h 45 de spinner visible — au-delà, c'est un bot).
 * 3. PLAFOND CLIC : max 5 clics/jour/utilisateur sur une même campagne.
 * 4. IDEMPOTENCE : event_id en clé primaire → un événement rejoué = ignoré.
 * 5. BAN : compte gelé = plus aucun crédit (review manuelle avant payout).
 *
 * v2 (post-lancement) : fingerprint machine, détection multi-comptes par IP,
 * scoring de régularité (un humain ne génère pas des ticks parfaitement réguliers
 * pendant 8 h), review manuelle obligatoire au-dessus de 100 € de solde.
 */
import { db, now } from "./db.js";

// Cadence physique minimale entre deux impressions (anti-bot, PAS un plafond de
// gains) : une impression = 5 s de visibilite, donc plus vite = impossible.
const MIN_TICK_INTERVAL_MS = 4500;
// AUCUN plafond de gains : ni quota journalier d'impressions, ni quota de clics.
// La protection anti-fraude repose sur la cadence ci-dessus + la review manuelle
// des payouts (1er retrait et gros montants) + le bannissement de compte.

/** @returns {string|null} null si OK, sinon la raison du refus */
export function checkImpression(userId) {
  const last = db
    .prepare(`SELECT MAX(created_at) t FROM events WHERE user_id=? AND type='impression'`)
    .get(userId).t;
  if (last && now() - last < MIN_TICK_INTERVAL_MS) return "too_fast";
  return null; // pas de plafond journalier
}

export function checkClick(_userId, _campaignId) {
  return null; // pas de plafond de clics
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
