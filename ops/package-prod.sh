#!/usr/bin/env bash
# =============================================================================
#  Bakchich — fabrique l'archive de PROD à uploader sur le VPS
#  -------------------------------------------------------------------------
#  À lancer depuis la racine du repo (sur ta machine) :
#      bash ops/package-prod.sh
#
#  Produit ../bakchich-prod.tar.gz SANS : secrets (.env), base (*.db),
#  node_modules, .git, .vsix, sourcemaps. C'est ça que tu envoies au VPS.
# =============================================================================
set -euo pipefail

OUT="../bakchich-prod.tar.gz"
cd "$(dirname "$0")/.."   # racine du repo

tar -czf "${OUT}" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='*.env' \
  --exclude='.env' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='*.vsix' \
  --exclude='*.map' \
  --exclude='web/dist' \
  --exclude='extension/dist' \
  backend web legal ops docs README.md CHECKLIST.md

echo "✅ Archive prête : $(cd .. && pwd)/bakchich-prod.tar.gz"
echo "   Upload : scp bakchich-prod.tar.gz user@IP_VPS:/tmp/"
echo "   Sur le VPS : sudo tar -xzf /tmp/bakchich-prod.tar.gz -C /opt/bakchich"
