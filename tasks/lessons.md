# Leçons : Bakchich

## 2026-06-15

### Argent : le solde doit être débité, pas seulement crédité
**Contexte :** le ledger `events` ne contient que des crédits. Calculer le solde par `SUM(events)` seul aurait permis de retirer plusieurs fois le même argent.
**Leçon :** solde retirable = crédits − payouts non-rejetés, et la création d'un payout doit **réserver** atomiquement (transaction qui recalcule le solde dedans). Un payout `rejected` libère la réserve.
**Règle :** toute écriture d'argent passe par une transaction qui (re)lit le solde à l'intérieur. Idempotency key Stripe sur les transfers pour qu'un rejeu ne double jamais un virement.

### `SITE_URL` ≠ `BASE_URL` : ne jamais faire pointer un fallback sur le mauvais domaine
**Contexte :** `SITE_URL` retombait sur `BASE_URL` (= `api.bakchich.dev`). Les `success_url` Stripe et le retour de login web auraient renvoyé vers le domaine API (404), cassant paiement + connexion en prod : et exposant le token sur le mauvais domaine.
**Leçon :** un fallback silencieux entre deux variables d'URL est un piège. Documenter la variable comme **obligatoire** dans `.env.example` + runbook + checklist go-live.

### Architecture same-origin pour éviter tout CORS
**Décision :** `bakchich.dev` sert le front statique ET proxifie `/api /auth /c /webhooks` vers le backend → le site appelle l'API en chemins relatifs (zéro CORS). `api.bakchich.dev` proxifie tout (pour l'extension, qui fait du fetch côté Node, donc pas de CORS non plus).
**Leçon :** choisir l'archi réseau AVANT d'écrire le front fige le contrat (URLs relatives) et supprime une classe entière de bugs.

### Dépendances natives : prebuilds vs version de Node
**Contexte :** `better-sqlite3@11` n'a pas de binaire prébuilt pour Node 24 → tentative de compilation source → échec (pas de VS Build Tools sur Windows).
**Leçon :** quand un module natif échoue à l'install, vérifier d'abord la matrice prebuilds × version de Node avant d'installer une toolchain C++. Bump → ^12 a réglé le problème.

### Les sous-agents front réintroduisent systématiquement des fautes d'accents
**Contexte :** à chaque passe d'un sous-agent frontend, du texte FR est réécrit sans accents (« moderation », « creer », « Modele economique », « reverses »…), malgré la consigne explicite.
**Leçon :** ne jamais faire confiance à un agent pour l'orthographe FR. Après CHAQUE délégation front, lancer un sweep `grep` large des mots FR fréquents dé-accentués + corriger via script node (split/join, UTF-8) AVANT de montrer au user. Inclure systématiquement : moderation, creer, modele, economique, reverse(s), calcule, consomme(s), caracteres, icone, publicite, reel, encheres, developpeur, donnees, qualifie, speculative, integral, eleve, tete, cote, acces, paye, ça/ca, gagnés.
**Règle :** sweep accents = étape obligatoire de vérif front, comme le build.

### Tester un front « same-origin » sans nginx local
**Astuce :** un mini serveur Node jetable (static + proxy des routes API vers le backend) dans le dossier temp permet un vrai test e2e au navigateur (token via `#`, soldes réels) sans toucher au repo ni installer nginx.
