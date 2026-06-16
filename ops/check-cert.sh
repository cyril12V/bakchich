#!/usr/bin/env bash
# =============================================================================
#  Bakchich : surveillance de l'expiration du certificat TLS.
#  certbot.timer renouvelle automatiquement ; ce script ALERTE (dans un log) si
#  l'echeance approche, signe que le renouvellement automatique a echoue.
#  Cron quotidien (root) :  0 7 * * * /var/www/bakchich/ops/check-cert.sh
# =============================================================================
set -euo pipefail
CERT=/etc/letsencrypt/live/bakchich.dev/cert.pem
LOG=/var/log/bakchich-cert.log

if [[ ! -f "$CERT" ]]; then
  echo "$(date -Is) ERREUR : certificat introuvable ($CERT)" >> "$LOG"
  exit 1
fi

END=$(date -d "$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)" +%s)
DAYS=$(( (END - $(date +%s)) / 86400 ))

if [[ "$DAYS" -lt 10 ]]; then
  echo "$(date -Is) ALERTE : le certificat bakchich.dev expire dans ${DAYS} jours (renouvellement certbot en echec ?)" >> "$LOG"
else
  echo "$(date -Is) OK : ${DAYS} jours restants" >> "$LOG"
fi
