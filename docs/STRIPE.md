# 💳 Brancher Stripe (encaissement + reversements)

## 1. Encaisser les annonceurs (Stripe Checkout)
Dans POST /api/campaigns (src/server.js, voir le TODO) :
1. `npm i stripe` puis créer une session :
   - line_items : "Bloc Bakchich" × blocks, unit_amount = bidCents
   - metadata : { campaignId }
   - success_url / cancel_url vers ta landing
2. La campagne reste en `status='pending_payment'` jusqu'au webhook.
3. Webhook `checkout.session.completed` → passer la campagne en `pending` (modération), puis `active` après validation manuelle (POST /admin/moderate).
4. Activer Stripe Tax pour la TVA FR automatique.

## 2. Reverser aux devs (Stripe Connect Express)
1. Activer Connect (comptes Express) dans le dashboard.
2. Bouton "Configurer mes virements" sur le dashboard utilisateur → Account Link d'onboarding (Stripe gère KYC + infos fiscales + IBAN).
3. Bouton "Retirer" (solde ≥ 10 €) → `transfers.create({ amount, currency:'eur', destination: acct_xxx })`, enregistrer dans la table `payouts`.
4. Règle d'or anti-fraude : review manuelle de tout premier payout et de tout solde > 100 €.

## 3. Checklist mise en prod
- [ ] Webhooks signés (STRIPE_WEBHOOK_SECRET vérifié)
- [ ] Mode test de bout en bout (carte 4242…)
- [ ] Bascule live + petit achat réel à 1 €
