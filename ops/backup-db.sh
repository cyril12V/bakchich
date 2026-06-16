#!/usr/bin/env bash
# =============================================================================
#  Bakchich — sauvegarde SQLite SURE (WAL-safe) + rotation
#  -------------------------------------------------------------------------
#  Pourquoi pas un simple `cp` ?
#    La base tourne en mode WAL : un cp pendant une ecriture peut copier une
#    DB incoherente (le WAL n'est pas encore fusionne). La commande
#    `sqlite3 ... ".backup"` realise une copie atomique et coherente, meme
#    si le backend ecrit en parallele. C'est LA methode officielle.
#
#  Usage :
#      /opt/bakchich/ops/backup-db.sh
#
#  Prerequis : paquet sqlite3 installe  ->  sudo apt-get install -y sqlite3
# =============================================================================
set -euo pipefail

# --- Configuration -----------------------------------------------------------
DB_PATH="/var/www/bakchich/backend/bakchich.db"   # doit correspondre a DB_PATH du .env
BACKUP_DIR="/var/backups/bakchich"            # stockage local des sauvegardes
RETENTION_DAYS=14                             # on garde 14 jours d'historique

# Horodatage : 2026-06-15_03-00-00
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
DEST="${BACKUP_DIR}/bakchich-${STAMP}.db"

# --- Verifications -----------------------------------------------------------
if [[ ! -f "${DB_PATH}" ]]; then
  echo "ERREUR : base introuvable a ${DB_PATH}" >&2
  exit 1
fi
mkdir -p "${BACKUP_DIR}"

# --- Sauvegarde atomique (WAL-safe) ------------------------------------------
echo "==> Sauvegarde de ${DB_PATH} -> ${DEST}"
# Les quotes imbriquees sont importantes : .backup attend un chemin entre apostrophes.
sqlite3 "${DB_PATH}" ".backup '${DEST}'"

# Verifie l'integrite de la copie produite (defense en profondeur).
echo "==> Verification d'integrite"
sqlite3 "${DEST}" "PRAGMA integrity_check;" | grep -q "^ok$" \
  && echo "    integrite OK" \
  || { echo "ERREUR : copie corrompue, on la supprime" >&2; rm -f "${DEST}"; exit 1; }

# Compression pour economiser l'espace.
gzip -f "${DEST}"
echo "==> Sauvegarde compressee : ${DEST}.gz"

# --- Rotation : supprime les sauvegardes de plus de RETENTION_DAYS jours -----
echo "==> Rotation (> ${RETENTION_DAYS} jours)"
find "${BACKUP_DIR}" -name 'bakchich-*.db.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete

# --- Copie HORS-SERVEUR (a configurer) ---------------------------------------
# IMPORTANT : une sauvegarde sur le meme serveur ne protege pas d'une perte
# totale du VPS. Decommente et adapte UNE des options ci-dessous.
#
# Option A — rsync vers un autre serveur (cle SSH sans passphrase recommandee) :
#   rsync -az --delete "${BACKUP_DIR}/" backup@mon-autre-serveur:/backups/bakchich/
#
# Option B — scp de la derniere sauvegarde :
#   scp "${DEST}.gz" backup@mon-autre-serveur:/backups/bakchich/
#
# Option C — synchro vers un bucket objet (S3 / Backblaze B2 / Scaleway) :
#   rclone copy "${BACKUP_DIR}/" remote-bakchich:bucket-backups/ --max-age 7d

echo "==> Sauvegarde terminee."

# =============================================================================
#  CRON — editer avec :  sudo crontab -u bakchich -e
#  Sauvegarde toutes les 6 heures (00:00, 06:00, 12:00, 18:00) :
#
#    0 */6 * * * /opt/bakchich/ops/backup-db.sh >> /var/log/bakchich-backup.log 2>&1
#
#  (Pense a : sudo touch /var/log/bakchich-backup.log && sudo chown bakchich /var/log/bakchich-backup.log)
# =============================================================================
