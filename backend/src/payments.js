/**
 * Stripe — encaissement annonceurs (Checkout) + reversements devs (Connect Express).
 *
 * Tout est en lazy-init : le serveur DOIT pouvoir démarrer SANS clés Stripe
 * (dev local, seed, tests). Les fonctions qui en ont besoin renvoient un état
 * clair quand Stripe n'est pas configuré, au lieu de planter au boot.
 *
 * Règles métier (cf. docs/STRIPE.md + cahier des charges) :
 *   · Checkout : unit_amount = bid d'1 bloc, quantity = nb de blocs, metadata { campaignId }.
 *   · La campagne reste 'pending_payment' jusqu'au webhook checkout.session.completed,
 *     puis passe en 'pending' (file de modération manuelle).
 *   · Payout : solde retirable ≥ 10 €. Règle d'or anti-fraude : tout 1er retrait
 *     et tout retrait portant sur un solde > 100 € part en review manuelle
 *     (pending_review) — aucun virement automatique dans ces cas.
 */
import Stripe from "stripe";

export const MIN_PAYOUT_CENTS = 1000; // 10 €
export const MANUAL_REVIEW_THRESHOLD_CENTS = 10000; // > 100 € → review manuelle

let _stripe = null;

/** Instance Stripe, ou null si la clé n'est pas configurée. */
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Crée une session Checkout pour l'achat de blocs d'une campagne.
 * @returns {Promise<{url: string, sessionId: string}>}
 */
export async function createCheckoutSession({ campaign, blocks, bidCents, advertiserEmail, baseSiteUrl }) {
  const stripe = getStripe();
  if (!stripe) throw new Error("stripe_not_configured");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: advertiserEmail,
    line_items: [
      {
        quantity: blocks,
        price_data: {
          currency: "eur",
          unit_amount: bidCents, // prix d'1 bloc = 1000 impressions
          product_data: {
            name: "Bloc Bakchich : 1 000 impressions",
            description: `Campagne « ${campaign.text} »`,
          },
        },
      },
    ],
    // TVA FR auto : activer Stripe Tax dans le dashboard puis décommenter.
    // automatic_tax: { enabled: true },
    metadata: { campaignId: campaign.id },
    success_url: `${baseSiteUrl}/annonceurs/espace?paid=1&campaign=${campaign.id}`,
    cancel_url: `${baseSiteUrl}/annonceurs/espace?canceled=1`,
  });
  return { url: session.url, sessionId: session.id };
}

/** Vérifie et parse un événement webhook Stripe (signature obligatoire). */
export function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe) throw new Error("stripe_not_configured");
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("webhook_secret_missing");
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Crée (si besoin) un compte Connect Express pour le dev et renvoie un Account Link
 * d'onboarding (Stripe gère KYC, infos fiscales, IBAN).
 * @returns {Promise<{url: string, accountId: string}>}
 */
export async function createConnectOnboarding({ user, baseSiteUrl, saveAccountId }) {
  const stripe = getStripe();
  if (!stripe) throw new Error("stripe_not_configured");

  let accountId = user.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: user.email,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      metadata: { userId: user.id },
    });
    accountId = account.id;
    saveAccountId(accountId);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseSiteUrl}/me/?connect=refresh`,
    return_url: `${baseSiteUrl}/me/?connect=done`,
    type: "account_onboarding",
  });
  return { url: link.url, accountId };
}

/** Statut d'onboarding Connect : le dev peut-il recevoir des virements ? */
export async function connectStatus(user) {
  if (!user.stripe_account_id) return { connected: false, payoutsEnabled: false };
  const stripe = getStripe();
  if (!stripe) return { connected: true, payoutsEnabled: false };
  const acct = await stripe.accounts.retrieve(user.stripe_account_id);
  return {
    connected: true,
    payoutsEnabled: Boolean(acct.payouts_enabled),
    detailsSubmitted: Boolean(acct.details_submitted),
  };
}

/** Exécute le virement réel vers le compte Connect du dev.
 *  La clé d'idempotence = payoutId → un rejeu (crash/retry) ne crée JAMAIS un 2e virement. */
export async function transferToDev({ amountCents, destination, payoutId }) {
  const stripe = getStripe();
  if (!stripe) throw new Error("stripe_not_configured");
  const transfer = await stripe.transfers.create(
    {
      amount: amountCents,
      currency: "eur",
      destination,
      metadata: { payoutId },
    },
    { idempotencyKey: `payout_${payoutId}` }
  );
  return transfer.id;
}
