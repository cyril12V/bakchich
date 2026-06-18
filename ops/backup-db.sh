#!/usr/bin/env bash
# =============================================================================
#  Bakchich : sauvegarde SQLite SURE (WAL-safe) + rotation
#  -------------------------------------------------------------------------
#  Pourquoi pas un simple `cp` ?
#    La base tourne en mode WAL : un cp pendant une ecriture peut copier une
#    DB incoherente (le WAL n'est pas encore fusionne). La commande
#    `sqlite3 ... ".backup"` realise une copie atomique et coherente, meme
#    si le backend ecrit en parallele. C'est LA methode officielle.
#
#  Usage :
#      /var/www/bakchich/ops/backup-db.sh
#
#  Prerequis : paquet sqlite3 installe  ->  sudo apt-get install -y sqlite3
# =============================================================================
set -euo pipefail

# --- Configuration -----------------------------------------------------------
DB_PATH="/var/www/bakchich/backend/bakchich.db"   # doit correspondre a DB_PATH du .env
BACKUP_DIR="/var/backups/bakchich"            # stockage local des sauvegardes
RETENTION_DAYS=14                             # on garde 14 jours d'historique
# Copie HORS-SERVEUR (opt-in) : definir l'une de ces variables d'env active l'envoi.
#   OFFSITE_DEST    cible rsync, ex. backup@autre-serveur:/backups/bakchich/
#   OFFSITE_RCLONE  remote rclone, ex. remote-bakchich:bucket-backups/
OFFSITE_DEST="${OFFSITE_DEST:-}"
OFFSITE_RCLONE="${OFFSITE_RCLONE:-}"

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

# --- Copie HORS-SERVEUR (opt-in via variables d'env) -------------------------
# IMPORTANT : une sauvegarde sur le meme serveur ne protege pas d'une perte
# totale du VPS. Definir OFFSITE_DEST et/ou OFFSITE_RCLONE active la replication.
if [[ -n "${OFFSITE_DEST}" ]]; then
  echo "==> Replication hors-serveur (rsync) -> ${OFFSITE_DEST}"
  rsync -az --delete "${BACKUP_DIR}/" "${OFFSITE_DEST}"
elif [[ -n "${OFFSITE_RCLONE}" ]]; then
  echo "==> Replication hors-serveur (rclone) -> ${OFFSITE_RCLONE}"
  rclone copy "${BACKUP_DIR}/" "${OFFSITE_RCLONE}" --max-age "$((RETENTION_DAYS))d"
else
  echo "==> (info) Pas de cible hors-serveur definie (OFFSITE_DEST / OFFSITE_RCLONE)."
  echo "    Sauvegardes LOCALES uniquement : non protege contre une perte totale du VPS."
fi

echo "==> Sauvegarde terminee."

# =============================================================================
#  CRON : editer avec :  sudo crontab -u bakchich -e
#  Sauvegarde toutes les 6 heures (00:00, 06:00, 12:00, 18:00) :
#
#    0 */6 * * * /var/www/bakchich/ops/backup-db.sh >> /var/log/bakchich-backup.log 2>&1
#
#  (Pense a : sudo touch /var/log/bakchich-backup.log && sudo chown bakchich /var/log/bakchich-backup.log)
# =============================================================================
