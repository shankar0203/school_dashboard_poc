#!/bin/bash
# =============================================================================
# scripts/install-deps.sh
# Installs all server-side dependencies on Ubuntu 22.04 LTS.
# Called automatically by UserData on first boot.
# Can also be run manually: sudo bash scripts/install-deps.sh
# =============================================================================
set -e
exec > >(tee /var/log/vidyam-deps.log) 2>&1

echo "=== [1/5] Updating apt ==="
apt-get update -y
apt-get upgrade -y

echo "=== [2/5] Installing system packages ==="
apt-get install -y git nginx mysql-client curl awscli

echo "=== [3/5] Installing Node.js 20 ==="
apt-get remove -y nodejs npm 2>/dev/null || true
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== [4/5] Installing PM2 ==="
npm install -g pm2

echo "=== [5/5] Enabling Nginx on boot ==="
systemctl enable nginx

echo ""
echo "=== Dependencies installed successfully ==="
echo "Next: run  bash /home/ubuntu/vidyam/scripts/setup-env.sh  to configure .env"
