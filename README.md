# 🪙 Bakchich — Sois payé pendant que ça tourne

Régie publicitaire du spinner de Claude Code, version française.
Une ligne sponsorisée pendant que l'IA réfléchit → 50 % des revenus pour le dev, en €, dès le jour 1.

## Structure
```
extension/   Extension VS Code (TypeScript) — injection spinner, tracking, solde, kill-switch
backend/     API Node/Express + SQLite — enchères, ledger, anti-fraude, OAuth, admin
landing/     Landing page (HTML autonome, en français)
legal/       RGPD, CGU, CGV annonceurs, mentions légales (modèles à faire relire)
docs/        Plan de lancement + intégration Stripe
CHECKLIST.md La liste complète de tout ce que le projet doit cocher
```

## Démarrage rapide (10 minutes)

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env        # remplis au moins ADMIN_SECRET
npm run seed                # crée un user test + 2 campagnes → AFFICHE TON TOKEN DE TEST
npm run dev                 # → http://localhost:3939
```
Vérifie : `curl -H "Authorization: Bearer TON_TOKEN" http://localhost:3939/api/state`

### 2. Extension
```bash
cd extension
npm install
npm test                    # la suite de sécurité injection/restauration doit passer
npm run build
```
Puis dans VS Code : F5 (« Run Extension »), règle `bakchich.apiUrl` sur `http://localhost:3939`.
Pour tester sans OAuth : stocke le token du seed via la commande de connexion en le collant dans le SecretStorage (ou branche Google OAuth via .env).

### 3. Voir la magie
Ouvre `~/.claude/settings.json` → le champ `spinnerVerbs` contient la pub gagnante.
Lance Claude Code → ton spinner affiche la ligne sponsorisée.
Déconnecte-toi → tout est restauré à l'identique.

### 4. Kill-switch (à tester AVANT le lancement)
```bash
curl -X POST http://localhost:3939/admin/killswitch \
  -H "x-admin-secret: change-moi-absolument" -H "content-type: application/json" \
  -d '{"on": true}'
```

## Les règles économiques
1 bloc = 1 000 impressions de 5 s · clic = 50× l'impression · dev = 50 % · enchère ascendante, bid mini 1 €.

## Avant de publier
Lis `CHECKLIST.md` en entier. Les points non négociables : tests verts, kill-switch fonctionnel, modération des créas, payouts Stripe Connect, mentions légales remplies, disclaimer "non affilié à Anthropic".
