#!/usr/bin/env bash
# =============================================================================
#  Bakchich : deploiement "une commande" (idempotent)
#  -------------------------------------------------------------------------
#  Usage (sur le VPS, en tant qu'utilisateur ayant sudo) :
#      /opt/bakchich/ops/deploy.sh
#
#  Ce que fait le script :
#    1. Recupere le dernier code (git pull)
#    2. Installe les deps de prod (npm ci --omit=dev)
#    3. Synchronise le front statique vers /var/www/bakchich
#    4. Redemarre le service backend
#    5. Verifie et recharge nginx
#    6. Affiche le statut + un health-check HTTPS
#
#  Idempotent : peut etre relance sans risque autant de fois que voulu.
# =============================================================================
set -euo pipefail

# --- Chemins (coherents avec systemd / nginx / docs) -------------------------
APP_DIR="/opt/bakchich"
BACKEND_DIR="${APP_DIR}/backend"
WWW_DIR="/var/www/bakchich"
SERVICE="bakchich-backend"
HEALTH_URL="https://api.bakchich.dev/health"

echo "==> [1/6] Mise a jour du code (git pull) dans ${APP_DIR}"
cd "${APP_DIR}"
git pull --ff-only

echo "==> [2/6] Installation des dependances de production"
cd "${BACKEND_DIR}"
# npm ci = install reproductible depuis package-lock.json. --omit=dev : pas de devDeps.
npm ci --omit=dev

echo "==> [3/6] Build du front React (Vite) + publication vers ${WWW_DIR}"
cd "${APP_DIR}/web"
npm ci
npm run build                                     # genere web/dist
sudo mkdir -p "${WWW_DIR}"
sudo rsync -a --delete "${APP_DIR}/web/dist/" "${WWW_DIR}/"
sudo chown -R www-data:www-data "${WWW_DIR}"

echo "==> [4/6] Redemarrage du backend (${SERVICE})"
sudo systemctl restart "${SERVICE}"

echo "==> [5/6] Verification de la conf nginx puis rechargement"
# nginx -t echoue si la conf est invalide -> grace a set -e, on stoppe ici.
sudo nginx -t
sudo systemctl reload nginx

echo "==> [6/6] Statut du service et health-check"
# --no-pager : sortie non interactive ; on ne fait pas echouer le script si
# systemctl status renvoie un code non nul (service actif suffit).
sudo systemctl status "${SERVICE}" --no-pager --lines=5 || true

echo "--> Health-check ${HEALTH_URL}"
# -f : echoue (donc set -e stoppe) si le backend ne repond pas 2xx.
curl -fsS "${HEALTH_URL}"
echo ""
echo "==> Deploiement termine avec succes."
