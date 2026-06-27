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

echo "==> 1/4  Pull latest code"
git pull || echo "(skipping git pull)"

echo "==> 2/4  Install dependencies + build"
npm install
npm run build

echo "==> 3/4  Publish build to Nginx web root"
sudo rm -rf /var/www/html/*
sudo cp -r "$APP_DIR"/dist/* /var/www/html/

echo "==> 4/4  Write Nginx config + restart"
sudo tee /etc/nginx/sites-available/default >/dev/null <<'NGINX'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/html;
    index index.html;

    location / { try_files $uri /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:4000/; }
}
NGINX
sudo nginx -t && sudo systemctl restart nginx

echo "==> Done. Open  http://<EC2_PUBLIC_IP>"
