#!/bin/bash
# Redeploy the latest UI code on the EC2 (run this ON the instance).
# Usage:  ./redeploy.sh
set -e

APP_DIR="/home/ubuntu/app"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull

echo "==> Installing deps + building..."
npm install
npm run build

echo "==> Publishing to nginx web root..."
sudo rm -rf /var/www/html/*
sudo cp -r "$APP_DIR"/dist/* /var/www/html/
sudo systemctl reload nginx

echo "==> Done. Refresh the app in your browser."
