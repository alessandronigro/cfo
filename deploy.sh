#!/bin/bash
set -e

VPS_USER="root"
VPS_HOST="microelearning.formazioneintermediari.com"
VPS_PASS="Giuseppe78"
VPS_DIR="/var/www/cfo.findmeyou.app"

echo "➡️ Buid del frontend React in corso..."
cd frontend
npm install
npm run build
cd ..

echo "➡️ Sincronizzazione file Backend sul VPS..."
sshpass -p "$VPS_PASS" rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'cfo.db' \
  --exclude '.DS_Store' \
  backend/ "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/backend/"

echo "➡️ Sincronizzazione file Frontend (build) sul VPS..."
sshpass -p "$VPS_PASS" rsync -avz --delete \
  frontend/dist/ "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/frontend/"

echo "➡️ Installazione dipendenze e avvio/riavvio PM2 sul VPS..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" << 'EOF'
  cd /var/www/cfo.findmeyou.app/backend
  npm install
  # Se il processo esiste, PM2 lo riavvia accogliendo il nuovo ENV, altrimenti lo avvia.
  pm2 list | grep "cfo-backend" && PORT=3033 pm2 restart cfo-backend --update-env || PORT=3033 pm2 start server.js --name cfo-backend
  pm2 save
EOF

echo "✅ Deploy completato con successo!"
