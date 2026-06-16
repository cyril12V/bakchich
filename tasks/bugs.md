# Bugs — Bakchich

> Bugs trouvés (souvent par les revues) et corrigés. Symptôme · Cause · Fix · Leçon.

## 2026-06-15

### #1 — Double-retrait possible du même solde
- **Symptôme :** rien encore en prod, repéré à la conception du payout.
- **Cause :** solde calculé uniquement depuis les crédits ; rien ne déduisait les retraits déjà demandés.
- **Fix :** `reservePayout()` atomique (transaction qui recalcule le solde dedans) ; `reservedPayoutCents` = somme des payouts non-`rejected` ; idempotency key Stripe sur le transfer.
- **Leçon :** voir [lessons.md] — toute écriture d'argent dans une transaction relisant le solde.

### #2 — Redirections Stripe/login cassées en prod (SITE_URL)
- **Symptôme :** (potentiel prod) après paiement Stripe ou login web → 404, utilisateur jamais connecté, token exposé sur le domaine API.
- **Cause :** `SITE_URL` retombait sur `BASE_URL` (`api.bakchich.dev`) et n'était documenté nulle part.
- **Fix :** `SITE_URL=https://bakchich.dev` ajouté à `env.production.example`, `DEPLOIEMENT.md`, checklist.
- **Leçon :** un fallback silencieux entre deux URLs est un piège ; variable rendue obligatoire.

### #3 — Enchère sous-facturée en saisie française
- **Symptôme :** un annonceur tapant `1,50 €` envoyait `1 €` (100 c au lieu de 150).
- **Cause :** `parseFloat("1,50")` s'arrête à la virgule.
- **Fix :** `parseFloat(value.replace(',', '.'))` aux 3 points de calcul du portail.
- **Leçon :** normaliser la virgule décimale FR avant tout parse de montant côté client.

### #4 — Webhook Stripe rejouable
- **Symptôme :** Stripe peut livrer le même événement plusieurs fois.
- **Cause :** pas de déduplication des événements reçus.
- **Fix :** table `stripe_events` + insertion dans la transaction du handler.
- **Leçon :** tout webhook = idempotent par event id.

### Artefacts de test (pas des bugs produit)
- Le `.db` ne se supprime pas tant que le serveur tourne (verrou fichier Windows) → tuer le process d'abord.
- Changer uniquement le `#hash` de l'URL ne recharge pas la page → forcer un reload pour re-déclencher `init()`.
