#!/usr/bin/env bash
# =============================================================================
#  Bakchich : installation de l'appli (1re fois), APRÈS provision.sh + upload
#  -------------------------------------------------------------------------
#  Prérequis : code présent dans /opt/bakchich, et /opt/bakchich/backend/.env rempli.
#  À lancer une fois, en root :
#      sudo bash /opt/bakchich/ops/setup-app.sh
#
#  Branche nginx + systemd, installe les deps backend, publie le front statique.
#  Le SSL (certbot) se fait juste après, séparément.
# =============================================================================
set -euo pipefail

APP_DIR="/opt/bakchich"
BACKEND_DIR="${APP_DIR}/backend"
WWW_DIR="/var/www/bakchich"

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "ERREUR : ${BACKEND_DIR}/.env manquant. Copie ops/env.production.example et remplis-le d'abord."
  exit 1
fi

echo "==> [1/5] Dépendances backend (prod)"
cd "${BACKEND_DIR}"
npm ci --omit=dev

echo "==> [2/5] Build du front React (Vite) → ${WWW_DIR}"
cd "${APP_DIR}/web"
npm ci
npm run build                      # genere web/dist
mkdir -p "${WWW_DIR}"
rsync -a --delete "${APP_DIR}/web/dist/" "${WWW_DIR}/"
chown -R www-data:www-data "${WWW_DIR}"

echo "==> [3/5] nginx (vhosts)"
cp "${APP_DIR}/ops/nginx/bakchich.dev.conf"     /etc/nginx/sites-available/bakchich.dev.conf
cp "${APP_DIR}/ops/nginx/api.bakchich.dev.conf" /etc/nginx/sites-available/api.bakchich.dev.conf
ln -sf /etc/nginx/sites-available/bakchich.dev.conf     /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api.bakchich.dev.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> [4/5] Service systemd backend"
cp "${APP_DIR}/ops/systemd/bakchich-backend.service" /etc/systemd/system/
chown -R bakchich:bakchich "${BACKEND_DIR}"
systemctl daemon-reload
systemctl enable --now bakchich-backend
systemctl status bakchich-backend --no-pager --lines=5 || true

echo "==> [5/5] Backup quotidien (cron)"
( crontab -l 2>/dev/null | grep -v backup-db.sh ; echo "0 */6 * * * /opt/bakchich/ops/backup-db.sh >> /var/log/bakchich-backup.log 2>&1" ) | crontab -

cat <<'NEXT'

✅ Appli installée.
   Le backend tourne en HTTP (port interne 3939, proxifié par nginx en :80).
   ÉTAPE SUIVANTE : activer le HTTPS (obligatoire en .dev) :
     sudo certbot --nginx -d bakchich.dev -d www.bakchich.dev -d api.bakchich.dev
   Puis vérifier : curl -fsS https://api.bakchich.dev/health
NEXT
