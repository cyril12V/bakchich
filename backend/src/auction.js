/**
 * Règles économiques de Bakchich (identiques au modèle d'origine) :
 *   · 1 bloc        = 1 000 impressions de 5 secondes
 *   · 1 clic        = facturé 50× le prix d'une impression
 *   · part du dev   = 50 % de chaque centime dépensé
 *   · enchère       = la campagne ACTIVE au bid le plus haut diffuse en premier ;
 *                     les autres font la queue derrière, dans l'ordre des bids.
 */
import crypto from "crypto";
import { db, now } from "./db.js";

export const IMPRESSIONS_PER_BLOCK = 1000;
export const CLICK_MULTIPLIER = 50;
export const DEV_SHARE = 0.5;
export const MIN_BID_CENTS = 100; // 1 € le bloc minimum

/** Prix d'une impression pour une campagne, en centimes (peut être < 1). */
export function impressionPriceCents(campaign) {
  return campaign.bid_cents / IMPRESSIONS_PER_BLOCK;
}

export function clickPriceCents(campaign) {
  return impressionPriceCents(campaign) * CLICK_MULTIPLIER;
}

/** La campagne qui diffuse MAINTENANT : bid max, encore du budget.
 *  À bid égal, on sert la MOINS diffusée (impressions ASC) → rotation équitable :
 *  plusieurs campagnes au même bid tournent en continu au lieu d'en figer une. */
export function currentWinner() {
  return db
    .prepare(
      `SELECT * FROM campaigns
       WHERE status = 'active'
         AND impressions < blocks * ?
       ORDER BY bid_cents DESC, impressions ASC, created_at ASC
       LIMIT 1`
    )
    .get(IMPRESSIONS_PER_BLOCK);
}

/** La file d'attente complète (pour l'affichage public de l'enchère). */
export function auctionQueue() {
  return db
    .prepare(
      `SELECT id, text, brand_name, bid_cents, blocks, impressions, created_at,
              (blocks * ? - impressions) AS impressions_left
       FROM campaigns
       WHERE status = 'active' AND impressions < blocks * ?
       ORDER BY bid_cents DESC, created_at ASC`
    )
    .all(IMPRESSIONS_PER_BLOCK, IMPRESSIONS_PER_BLOCK);
}

/** Leaderboard public des marques : total dépensé = impressions servies × prix d'impression. */
export function leaderboard(limit = 20) {
  return db
    .prepare(
      `SELECT brand_name, brand_icon,
              SUM(impressions * (bid_cents * 1.0 / ?)) AS spent_cents,
              SUM(impressions) AS impressions
       FROM campaigns
       WHERE show_on_leaderboard = 1 AND brand_name IS NOT NULL AND impressions > 0
       GROUP BY brand_name, brand_icon
       ORDER BY spent_cents DESC
       LIMIT ?`
    )
    .all(IMPRESSIONS_PER_BLOCK, limit)
    .map((r) => ({ ...r, spent_cents: Math.round(r.spent_cents) }));
}

/** Enregistre une impression : incrémente la campagne + crédite le dev. */
export function recordImpression(eventId, userId, campaign) {
  const credit = impressionPriceCents(campaign) * DEV_SHARE;
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO events (event_id, user_id, campaign_id, type, credit_cents, created_at)
       VALUES (?, ?, ?, 'impression', ?, ?)`
    ).run(eventId, userId, campaign.id, credit, now());
    db.prepare(`UPDATE campaigns SET impressions = impressions + 1 WHERE id = ?`).run(campaign.id);
    // Budget épuisé → la campagne sort de l'enchère.
    db.prepare(
      `UPDATE campaigns SET status = 'exhausted'
       WHERE id = ? AND impressions >= blocks * ${IMPRESSIONS_PER_BLOCK}`
    ).run(campaign.id);
  });
  tx();
  return credit;
}

/** Enregistre un clic (déclenché par le lien de redirection /c/:id). */
export function recordClick(eventId, userId, campaign) {
  const credit = clickPriceCents(campaign) * DEV_SHARE;
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO events (event_id, user_id, campaign_id, type, credit_cents, created_at)
       VALUES (?, ?, ?, 'click', ?, ?)`
    ).run(eventId, userId, campaign.id, credit, now());
    db.prepare(`UPDATE campaigns SET clicks = clicks + 1 WHERE id = ?`).run(campaign.id);
  });
  tx();
  return credit;
}

/**
 * Centimes déjà « réservés » par des retraits en cours ou effectués.
 * Seul un payout 'rejected' libère sa réserve ; tous les autres états la retiennent
 * (pending_review, processing, paid) → impossible de retirer deux fois le même solde.
 */
export function reservedPayoutCents(userId) {
  return db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents),0) c FROM payouts
       WHERE user_id=? AND status != 'rejected'`
    )
    .get(userId).c;
}

/**
 * Réserve atomiquement un retrait : recalcule le solde retirable DANS la transaction,
 * décide review-manuelle-ou-auto, insère la ligne payouts. Garantit qu'on ne peut pas
 * réserver deux fois le même solde (la réserve est prise dès l'insertion).
 *
 * @returns {{ok:true, payoutId:string, amountCents:number, status:string, needsReview:boolean}
 *          | {ok:false, reason:string, availableCents:number}}
 */
export function reservePayout(userId, { minPayoutCents, reviewThresholdCents }) {
  const tx = db.transaction(() => {
    const { availableCents } = balanceOf(userId);
    if (availableCents < minPayoutCents) {
      return { ok: false, reason: "below_min", availableCents };
    }
    // 1er retrait (aucun payout déjà versé) OU gros montant → review manuelle obligatoire.
    const hasPaid = db
      .prepare(`SELECT 1 FROM payouts WHERE user_id=? AND status='paid' LIMIT 1`)
      .get(userId);
    const needsReview = !hasPaid || availableCents > reviewThresholdCents;

    const payoutId = crypto.randomUUID();
    const status = needsReview ? "pending_review" : "processing";
    db.prepare(
      `INSERT INTO payouts (id, user_id, amount_cents, status, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(payoutId, userId, availableCents, status, now());

    return { ok: true, payoutId, amountCents: availableCents, status, needsReview };
  });
  return tx();
}

/** Marque un payout comme versé (après transfer Stripe réussi). */
export function markPayoutPaid(payoutId, stripeRef) {
  db.prepare(`UPDATE payouts SET status='paid', stripe_ref=? WHERE id=?`).run(stripeRef, payoutId);
}

/** Annule un payout (transfer échoué ou refus admin) → libère la réserve. */
export function markPayoutRejected(payoutId) {
  db.prepare(`UPDATE payouts SET status='rejected' WHERE id=?`).run(payoutId);
}

export function balanceOf(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = db
    .prepare(`SELECT COALESCE(SUM(credit_cents),0) c FROM events WHERE user_id=? AND created_at>=?`)
    .get(userId, startOfDay.getTime()).c;
  const lifetime = db
    .prepare(`SELECT COALESCE(SUM(credit_cents),0) c FROM events WHERE user_id=?`)
    .get(userId).c;
  // Solde retirable = gains cumulés − retraits déjà réservés/versés, arrondi au centime entier inférieur.
  const available = Math.max(0, Math.floor(lifetime - reservedPayoutCents(userId)));
  return {
    todayCents: Math.round(today * 100) / 100,
    lifetimeCents: Math.round(lifetime * 100) / 100,
    availableCents: available,
  };
}
