#!/usr/bin/env bash
# =============================================================================
#  Bakchich — provisioning d'un VPS NEUF (Ubuntu/Debian)
#  -------------------------------------------------------------------------
#  À lancer UNE SEULE FOIS, en root, sur un serveur fraîchement créé :
#      sudo bash provision.sh
#
#  Installe : Node 20, nginx, certbot, git, sqlite3, ufw (pare-feu).
#  Crée     : l'utilisateur `bakchich`, les dossiers, le pare-feu.
#  N'installe PAS l'appli (→ upload + setup-app.sh ensuite).
# =============================================================================
set -euo pipefail

echo "==> [1/6] Mise à jour du système"
apt-get update -y && apt-get upgrade -y

echo "==> [2/6] Node.js 20 (via NodeSource)"
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* && "$(node -v)" != v2[1-9]* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> [3/6] nginx, certbot, git, sqlite3"
apt-get install -y nginx certbot python3-certbot-nginx git sqlite3 rsync

echo "==> [4/6] Utilisateur applicatif 'bakchich'"
id -u bakchich >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin bakchich

echo "==> [5/6] Dossiers"
mkdir -p /opt/bakchich /var/www/bakchich /var/backups/bakchich
touch /var/log/bakchich-backup.log
chown -R bakchich:bakchich /opt/bakchich /var/backups/bakchich /var/log/bakchich-backup.log
chown -R www-data:www-data /var/www/bakchich

echo "==> [6/6] Pare-feu (ufw) : SSH + HTTP/HTTPS uniquement"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
yes | ufw enable || true
ufw status

cat <<'NEXT'

✅ Provisioning terminé.

Étapes suivantes (voir docs/MISE-EN-PROD.md) :
  1. Uploader le code dans /opt/bakchich (git clone OU archive).
  2. Créer /opt/bakchich/backend/.env (à partir de ops/env.production.example).
  3. Lancer : sudo bash /opt/bakchich/ops/setup-app.sh
  4. SSL : sudo certbot --nginx -d bakchich.dev -d www.bakchich.dev -d api.bakchich.dev
NEXT
