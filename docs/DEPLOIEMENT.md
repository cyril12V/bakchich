# 🚀 Déploiement VPS : Bakchich

Runbook pas-à-pas pour déployer Bakchich sur un VPS Ubuntu/Debian.
Architecture cible :

```
                        Internet (HTTPS)
                              │
                   ┌──────────┴──────────┐
                   │       nginx         │  (terminaison TLS, certbot)
                   └──────────┬──────────┘
            ┌─────────────────┼──────────────────┐
            │                 │                  │
   bakchich.dev        www.bakchich.dev    api.bakchich.dev
   (site statique       (redirige vers       (reverse-proxy pur)
    + proxy /api/        bakchich.dev)              │
    /auth/ /c/                                      │
    /webhooks/)                                     │
        │                                           │
        └─────────────► 127.0.0.1:3939 ◄───────────┘
                         backend Node
                       (systemd: bakchich-backend)
                              │
                        bakchich.db (SQLite, WAL)
```

**Pourquoi cette répartition ?** Le site web (`bakchich.dev`) appelle l'API en
**same-origin** via les chemins `/api/ /auth/ /c/ /webhooks/` → **zéro CORS**.
L'extension VS Code, elle, tape directement `https://api.bakchich.dev`.

> **Convention de chemins** (identique dans tous les fichiers `ops/`) :
> - Code : `/opt/bakchich` (clone git)
> - Backend : `/opt/bakchich/backend`
> - `.env` : `/opt/bakchich/backend/.env`
> - DB SQLite : `/opt/bakchich/backend/bakchich.db`
> - Site statique : `/var/www/bakchich`
> - Utilisateur système : `bakchich`
> - Port interne : `3939`

---

## ⚠️ Prérequis CRITIQUE côté backend : `trust proxy`

Le backend tourne **derrière nginx**. Sans configuration, `req.ip` vaut
`127.0.0.1` pour TOUTES les requêtes → l'anti-fraude (`ipRateLimit(req.ip)` dans
`backend/src/server.js`) et le rate-limit deviennent inutiles, et tous les
clients partagent la même IP.

**Action requise (à faire par le dev backend, hors de ce runbook) :** ajouter
dans `backend/src/server.js`, juste après `const app = express();` :

```js
app.set('trust proxy', 1); // 1 seul proxy de confiance (nginx) devant le backend
```

Express lira alors `X-Forwarded-For` (envoyé par nos vhosts nginx) pour obtenir
la vraie IP client. **Ne pas déployer en prod sans ce réglage.**

---

## 1. Provisioning du VPS

1. Commander un VPS Ubuntu 22.04/24.04 LTS (ou Debian 12), 1 vCPU / 1–2 Go RAM
   suffisent pour démarrer.
2. Se connecter en root, puis mettre à jour :

```bash
apt-get update && apt-get upgrade -y
apt-get install -y git curl sqlite3 ufw
```

3. Pare-feu minimal (SSH + HTTP + HTTPS) :

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

> Le port **3939 n'est PAS ouvert** au pare-feu : le backend n'écoute qu'en
> local (`127.0.0.1`), seul nginx y accède.

---

## 2. Installer Node.js 20 (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v    # doit afficher v20.x
which node # doit afficher /usr/bin/node (chemin attendu par le service systemd)
```

---

## 3. Créer l'utilisateur système `bakchich`

Compte dédié sans privilèges, sans shell de connexion :

```bash
adduser --system --group --home /opt/bakchich --shell /usr/sbin/nologin bakchich
```

---

## 4. Cloner le projet dans `/opt/bakchich`

```bash
git clone <URL_DU_REPO> /opt/bakchich
chown -R bakchich:bakchich /opt/bakchich
```

Installer les dépendances de prod :

```bash
cd /opt/bakchich/backend
sudo -u bakchich npm ci --omit=dev
```

Initialiser la base (au premier déploiement uniquement) :

```bash
sudo -u bakchich npm run seed   # crée la DB + données de test
```

---

## 5. Configurer le `.env` de production

```bash
cp /opt/bakchich/ops/env.production.example /opt/bakchich/backend/.env
nano /opt/bakchich/backend/.env        # remplir les vraies valeurs
chmod 600 /opt/bakchich/backend/.env
chown bakchich:bakchich /opt/bakchich/backend/.env
```

À remplir impérativement :
- `BASE_URL=https://api.bakchich.dev`
- `SITE_URL=https://bakchich.dev` : **CRITIQUE** : sans cette variable, les redirections Stripe (success_url) et le retour de connexion web (`#token`) pointent vers `api.bakchich.dev` → 404. Le tunnel de paiement et la connexion web seraient cassés.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  (redirect URI Google : `https://api.bakchich.dev/auth/google/callback`)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `ADMIN_SECRET` → générer avec `openssl rand -hex 32`

---

## 6. DNS

Chez le registrar / hébergeur DNS du domaine `bakchich.dev`, créer :

| Type | Nom   | Valeur            |
|------|-------|-------------------|
| A    | `@`   | `IP_DU_VPS`       |
| A    | `www` | `IP_DU_VPS`       |
| A    | `api` | `IP_DU_VPS`       |

(Et les enregistrements `AAAA` équivalents si le VPS a une IPv6.)

Vérifier la propagation avant de continuer :

```bash
dig +short bakchich.dev
dig +short www.bakchich.dev
dig +short api.bakchich.dev
```

---

## 7. Site statique

Créer le dossier servi par nginx et y copier le site.

> **Hypothèse :** le repo place la landing dans `landing/`. On copie son contenu
> à la **racine** de `/var/www/bakchich` (donc `index.html` à la racine), et les
> pages `dashboard/`, `annonceurs/`, `legal/` en sous-dossiers du même répertoire.

Pour le **premier déploiement** :

```bash
mkdir -p /var/www/bakchich
cp -r /opt/bakchich/landing/.     /var/www/bakchich/
cp -r /opt/bakchich/dashboard     /var/www/bakchich/dashboard
cp -r /opt/bakchich/annonceurs    /var/www/bakchich/annonceurs
cp -r /opt/bakchich/legal         /var/www/bakchich/legal
chown -R www-data:www-data /var/www/bakchich
```

> **Déploiements suivants :** inutile de refaire ces copies à la main :
> `ops/deploy.sh` resynchronise automatiquement le front statique (landing +
> dashboard + annonceurs + legal) vers `/var/www/bakchich` à chaque exécution.

---

## 8. nginx : installer les vhosts

```bash
apt-get install -y nginx
cp /opt/bakchich/ops/nginx/bakchich.dev.conf      /etc/nginx/sites-available/
cp /opt/bakchich/ops/nginx/api.bakchich.dev.conf  /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/bakchich.dev.conf     /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api.bakchich.dev.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # retire le vhost par défaut
nginx -t                                 # DOIT afficher "syntax is ok"
systemctl reload nginx
```

> À ce stade les vhosts écoutent en HTTP (port 80). C'est normal : certbot
> ajoutera le HTTPS à l'étape suivante.

---

## 9. HTTPS avec certbot (Let's Encrypt)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d bakchich.dev -d www.bakchich.dev -d api.bakchich.dev
```

Certbot va :
- valider chaque domaine (challenge HTTP-01),
- insérer les directives `# managed by certbot` (listen 443 ssl, certificats…)
  aux emplacements réservés dans nos vhosts,
- configurer le renouvellement automatique.

Vérifier le renouvellement auto :

```bash
systemctl status certbot.timer
certbot renew --dry-run
```

> Rappel zone `.dev` : HTTPS est **obligatoire** (HSTS preload navigateur).
> Sans certificat valide, le site est inaccessible.

---

## 10. Service systemd

```bash
cp /opt/bakchich/ops/systemd/bakchich-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now bakchich-backend
systemctl status bakchich-backend --no-pager
journalctl -u bakchich-backend -f      # suivre les logs
```

Vérifier que le backend répond en local :

```bash
curl -fsS http://127.0.0.1:3939/health      # {"ok":true}
curl -fsS https://api.bakchich.dev/health   # via nginx + TLS
```

---

## 11. Cron de sauvegarde

```bash
chmod +x /opt/bakchich/ops/backup-db.sh
mkdir -p /var/backups/bakchich
chown bakchich:bakchich /var/backups/bakchich
touch /var/log/bakchich-backup.log
chown bakchich:bakchich /var/log/bakchich-backup.log

# Cron toutes les 6 h pour l'utilisateur bakchich :
crontab -u bakchich -e
```

Ajouter la ligne :

```cron
0 */6 * * * /opt/bakchich/ops/backup-db.sh >> /var/log/bakchich-backup.log 2>&1
```

> Penser à configurer la **copie hors-serveur** (rsync/scp/rclone) dans
> `backup-db.sh` : une sauvegarde locale ne protège pas d'une perte du VPS.

---

## 12. Monitoring `/health` (UptimeRobot, gratuit)

1. Créer un compte sur https://uptimerobot.com (offre gratuite).
2. Add New Monitor → type **HTTP(s)**.
3. URL : `https://api.bakchich.dev/health`.
4. Intervalle : 5 min. Alertes par email.
5. (Optionnel) un 2ᵉ monitor sur `https://bakchich.dev` pour le site.

---

## 13. Déploiements suivants (mises à jour)

Une fois tout en place, déployer une nouvelle version se résume à :

```bash
/opt/bakchich/ops/deploy.sh
```

Le script fait : `git pull` → `npm ci --omit=dev` → restart backend →
`nginx -t` + reload → statut + health-check.

---

## ✅ Checklist go-live

- [ ] `app.set('trust proxy', 1)` présent dans `backend/src/server.js`
- [ ] DNS `@`, `www`, `api` pointent vers l'IP du VPS (vérifié au `dig`)
- [ ] Pare-feu : 80/443 ouverts, 3939 fermé (local only)
- [ ] `.env` rempli, `chmod 600`, **`ADMIN_SECRET` fort** (pas la valeur par défaut)
- [ ] `nginx -t` OK, vhosts activés, `default` retiré
- [ ] Certificats Let's Encrypt émis pour les 3 domaines, `renew --dry-run` OK
- [ ] `systemctl status bakchich-backend` = active (running), enable au boot
- [ ] `curl https://api.bakchich.dev/health` → `{"ok":true}`
- [ ] `https://bakchich.dev` affiche la landing ; `https://www...` redirige
- [ ] Le site appelle `/api/...` en same-origin (DevTools : pas d'erreur CORS)
- [ ] Stripe : webhook configuré sur `https://api.bakchich.dev/webhooks/stripe`,
      `STRIPE_WEBHOOK_SECRET` renseigné (passer en mode LIVE)
- [ ] Google OAuth : redirect URI `https://api.bakchich.dev/auth/google/callback`
- [ ] Cron de backup actif + 1ʳᵉ sauvegarde vérifiée + copie hors-serveur OK
- [ ] UptimeRobot surveille `/health`
- [ ] **Kill-switch testé** (POST `/admin/killswitch`) avant l'annonce publique

---

## ⏪ Rollback

### Revenir à la version de code précédente

```bash
cd /opt/bakchich
git log --oneline -n 5          # repérer le commit stable précédent
git checkout <SHA_STABLE>       # ou: git reset --hard <SHA_STABLE>
cd backend && sudo -u bakchich npm ci --omit=dev
sudo systemctl restart bakchich-backend
curl -fsS https://api.bakchich.dev/health
```

(Puis revenir sur la branche : `git checkout main` une fois le correctif prêt.)

### Restaurer la base depuis une sauvegarde

```bash
sudo systemctl stop bakchich-backend
# Choisir la sauvegarde voulue dans /var/backups/bakchich/
gunzip -c /var/backups/bakchich/bakchich-AAAA-MM-JJ_HH-MM-SS.db.gz \
  > /opt/bakchich/backend/bakchich.db
# Retirer d'éventuels fichiers WAL/SHM périmés.
rm -f /opt/bakchich/backend/bakchich.db-wal /opt/bakchich/backend/bakchich.db-shm
chown bakchich:bakchich /opt/bakchich/backend/bakchich.db
sudo systemctl start bakchich-backend
curl -fsS https://api.bakchich.dev/health
```

### Coupure d'urgence sans rollback

Activer le kill-switch (l'extension cesse d'afficher les pubs sans toucher au code) :

```bash
curl -X POST https://api.bakchich.dev/admin/killswitch \
  -H "x-admin-secret: <ADMIN_SECRET>" -H "content-type: application/json" \
  -d '{"on": true}'
```
