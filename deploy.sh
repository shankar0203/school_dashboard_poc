#!/bin/bash
# ===========================================================================
#  MANUAL DEPLOY — run this on the EC2 after SSHing in.
#    cd ~/app && ./deploy.sh
#
#  The Terraform startup script only bootstraps the box (installs Node/Nginx
#  and clones this repo). This file holds the actual deploy steps so you can
#  run them by hand for now, and automate later (just call it from user_data).
# ===========================================================================
set -e

# run from the repo dir this script lives in (where package.json is)
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"
echo "==> Deploying from: $APP_DIR"

echo "==> 1/5  Pull latest code"
git checkout -- src/config/env.js 2>/dev/null || true   # drop generated file so pull is clean
git pull || echo "(skipping git pull)"

echo "==> 2/5  Apply config from config.values (Cognito + RDS)"
# Edit ~/app/config.values ONCE on the server; this regenerates env.js + api/.env
# from it every deploy, so config never drifts back to placeholders.
bash scripts/apply-config.sh || echo "(!) config.values not set yet — using committed placeholder env.js"

echo "==> 3/5  Install dependencies + build"
npm install
npm run build

echo "==> 4/5  Publish build to Nginx web root"
sudo rm -rf /var/www/html/*
sudo cp -r "$APP_DIR"/dist/* /var/www/html/

echo "==> 5/5  Nginx config + restart"
# If certbot has already added SSL, DON'T overwrite the config (that would
# wipe HTTPS). Just reload so the new build is served.
if sudo grep -q "ssl_certificate" /etc/nginx/sites-available/default 2>/dev/null; then
  echo "   nginx already has HTTPS (certbot) — keeping config, reloading."
  sudo systemctl reload nginx
else
  sudo tee /etc/nginx/sites-available/default >/dev/null <<'NGINX'
server {
    listen 80 default_server;
    server_name invisos.in www.invisos.in;
    root /var/www/html;
    index index.html;

    location / { try_files $uri /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:4000/; }
}
NGINX
  sudo nginx -t && sudo systemctl restart nginx
fi

echo "==> Start/restart the API (Express on :4000 via pm2)"
if [ -d "$APP_DIR/api" ]; then
  if [ ! -f "$APP_DIR/api/.env" ]; then
    echo "!! api/.env is missing — create it first (see api/.env.example). Skipping API."
  else
    cd "$APP_DIR/api"
    npm install
    pm2 restart school-api 2>/dev/null || pm2 start server.js --name school-api
    pm2 save
    cd "$APP_DIR"
    echo "   API running. Check: curl -s http://localhost:4000/health"
  fi
fi

echo "==> Done. Open  http://<EC2_PUBLIC_IP>"
