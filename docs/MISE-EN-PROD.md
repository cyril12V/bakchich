# 🚀 Mise en prod : expliqué simplement

## Le modèle mental : 2 choses, 2 destinations

Beaucoup de confusion vient de là. Bakchich, ce sont **deux produits séparés** qui ne vont PAS au même endroit :

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  1. LE SERVEUR (backend+site)│        │  2. L'EXTENSION VS Code       │
│  → va sur TON VPS            │        │  → va sur le MARKETPLACE      │
│                              │        │     (PAS sur le VPS !)        │
│  • backend/  (l'API Node)    │        │  • le fichier .vsix           │
│  • landing/ me/ annonceurs/  │        │                               │
│    faq/ + pages légales      │        │  Les devs l'installent depuis │
│  • ops/  docs/  logo.png     │        │  VS Code en 1 clic.           │
└─────────────────────────────┘        └──────────────────────────────┘
        bakchich.dev                       marketplace.visualstudio.com
        api.bakchich.dev
```

**Règle simple :** le VPS héberge l'API + le site web. L'extension, elle, n'est jamais sur le VPS : elle est publiée sur le Marketplace, et elle *parle* à ton VPS via `https://api.bakchich.dev`.

---

## PARTIE A : Ce que tu uploades sur le VPS

### Option 1 : Git (recommandé, et de toute façon le code doit être public)
Sur ta machine, mets le repo sur GitHub une fois :
```bash
cd C:/Users/cyril/Desktop/bakchich
git init && git add . && git commit -m "Bakchich"
git remote add origin https://github.com/TON-COMPTE/bakchich.git
git push -u origin main
```
Puis sur le VPS, tu cloneras dedans `/var/www/bakchich`. Les mises à jour = `git push` chez toi puis `ops/deploy.sh` sur le VPS.

> Le `.gitignore` exclut déjà `.env`, les `*.db` et `node_modules` → aucun secret ne part sur GitHub.

### Option 2 : Archive (sans git, le plus simple pour démarrer)
J'ai déjà fabriqué l'archive : **`C:/Users/cyril/Desktop/bakchich-prod.tar.gz`** (1,8 Mo).
Pour la régénérer plus tard : `bash ops/package-prod.sh`.

Tu l'envoies sur le VPS :
```bash
scp C:/Users/cyril/Desktop/bakchich-prod.tar.gz  root@IP_DU_VPS:/tmp/
```

**Ce que l'archive contient** (et donc ce qui tourne sur le VPS) :
- `backend/` : l'API Node + SQLite
- `web/` : le site en **React (Vite + TypeScript)**, sources. Il est **buildé sur le VPS** (`npm run build` → `web/dist`, fait automatiquement par `setup-app.sh` et `deploy.sh`), puis publié dans `/var/www/bakchich`.
- `legal/` : les textes légaux sources (le contenu est aussi intégré dans les pages React)
- `ops/` : les scripts d'install/déploiement/backup + confs nginx/systemd
- `docs/`, `logo.png`

**Ce qui n'y est PAS** (volontairement) : `.env` (tes secrets : tu le crées sur le VPS), la base `*.db` (créée au 1er lancement), `node_modules` (réinstallé sur le VPS), `web/dist` (rebuildé sur le VPS), le `.vsix` (lui part au Marketplace).

> Le build React tourne sur le VPS (Node 20 est installé par `provision.sh`). Tu n'as donc rien à builder côté front avant d'uploader.

---

## PARTIE B : Installer sur le VPS (étapes, 3 scripts)

> Prérequis : un VPS Ubuntu/Debian + ses DNS pointés (cf. `docs/SETUP-MANUEL.md` §1).

```bash
# 1. Bootstrap du serveur (Node, nginx, certbot, pare-feu, utilisateur) : UNE fois
sudo bash provision.sh        # (extrais d'abord ops/ ou clone le repo pour l'avoir)

# 2. Mettre le code dans /var/www/bakchich
#   : option git :
sudo git clone https://github.com/TON-COMPTE/bakchich.git /var/www/bakchich
#   : option archive :
sudo mkdir -p /var/www/bakchich && sudo tar -xzf /tmp/bakchich-prod.tar.gz -C /var/www/bakchich

# 3. Créer le fichier secret .env (et le remplir : cf. SETUP-MANUEL.md)
sudo cp /var/www/bakchich/ops/env.production.example /var/www/bakchich/backend/.env
sudo nano /var/www/bakchich/backend/.env        # remplis Google, Stripe, ADMIN_SECRET, SITE_URL...
sudo chmod 600 /var/www/bakchich/backend/.env

# 4. Installer l'appli (nginx + systemd + deps + front + cron backup) : UNE fois
sudo bash /var/www/bakchich/ops/setup-app.sh

# 5. Activer le HTTPS (obligatoire en .dev)
sudo certbot --nginx -d bakchich.dev -d www.bakchich.dev -d api.bakchich.dev

# 6. Vérifier
curl -fsS https://api.bakchich.dev/health      # → {"ok":true}
```

**Mises à jour ensuite** (après un `git push` ou un nouvel upload) : `sudo bash /var/www/bakchich/ops/deploy.sh`.

---

## PARTIE C : L'extension : où la mettre

L'extension **ne va pas sur le VPS**. Le fichier est déjà construit :
**`C:/Users/cyril/Desktop/bakchich/extension/bakchich-0.1.0.vsix`**

Tu as 2 usages :

### Pour TESTER tout de suite sur ta machine (sans rien publier)
Dans VS Code : `Ctrl+Shift+P` → **« Extensions: Install from VSIX… »** → choisis le `.vsix`.
Puis règle `bakchich.apiUrl` sur ton API (en local `http://localhost:3939`, en prod `https://api.bakchich.dev`).

### Pour PUBLIER (que tout le monde l'installe)
Cf. `docs/SETUP-MANUEL.md` §4 :
```bash
cd extension
npx vsce login bakchich     # avec ton token Azure DevOps (PAT)
npx vsce publish            # envoie au Marketplace
```
Après publication, les devs l'installent en cherchant « Bakchich » dans l'onglet Extensions de VS Code. Pour publier une mise à jour : change la `version` dans `extension/package.json`, `npm run package`, `vsce publish`.

> Note : `npm run package` regénère le `.vsix`. L'icône (`extension/media/icon.png`, déjà générée depuis ton logo) et le `.vscodeignore` (pour un paquet propre) sont en place.

---

## Récap ultra-court
1. **VPS** ← `bakchich-prod.tar.gz` (ou `git clone`) → `provision.sh` → `.env` → `setup-app.sh` → `certbot`.
2. **Marketplace** ← `extension/bakchich-0.1.0.vsix` via `vsce publish`.
3. L'extension parle au VPS via `https://api.bakchich.dev`. C'est tout. 🪙
