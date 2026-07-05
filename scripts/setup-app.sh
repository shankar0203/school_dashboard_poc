#!/bin/bash
# =============================================================================
# scripts/setup-app.sh
# Builds the app, loads DB schema + seed, starts PM2, configures Nginx.
# Run after setup-env.sh: sudo bash scripts/setup-app.sh
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Vidyam App Setup ==="

# Fix home directory permissions so Nginx (www-data) can read dist
chmod 755 /home/ubuntu

# ── Pre-check ─────────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/api/.env" ]; then
  echo "ERROR: api/.env not found. Run scripts/setup-env.sh first."
  exit 1
fi

# Load DB credentials from .env
set -a; source "$APP_DIR/api/.env"; set +a

# ── [1/6] Install frontend dependencies ───────────────────────────────────
echo ""
echo "=== [1/6] npm install (frontend) ==="
cd "$APP_DIR"
npm install

# ── [2/6] Build frontend ───────────────────────────────────────────────────
echo ""
echo "=== [2/6] npm run build ==="
npm run build

# ── [3/6] Install API dependencies ────────────────────────────────────────
echo ""
echo "=== [3/6] npm install (api) ==="
cd "$APP_DIR/api"
npm install

# ── [4/6] Load DB schema ───────────────────────────────────────────────────
echo ""
echo "=== [4/6] Loading DB schema ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < "$APP_DIR/db/schema.sql"
echo "schema loaded"

# ── [5/6] Load DB seed data ────────────────────────────────────────────────
echo ""
echo "=== [5/6] Loading DB seed data ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < "$APP_DIR/db/seed.sql"
echo "  seed.sql loaded (school, classes, subjects, users, first 6 students)"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < "$APP_DIR/db/seed_extra.sql"
echo "  seed_extra.sql loaded (50+ students, marks, fees, attendance)"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < "$APP_DIR/db/migration_user_linking.sql"
echo "  migration_user_linking.sql run (user_id on students, cognito_sub on users)"

# ── [6/6] Configure Nginx + start PM2 ─────────────────────────────────────
echo ""
echo "=== [6/6] Configuring Nginx ==="
cat > /etc/nginx/conf.d/vidyam.conf <<EOF
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /health {
        proxy_pass http://localhost:4000/health;
    }

    location / {
        root $APP_DIR/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Remove default Nginx site to avoid port 80 conflict
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
echo "Nginx configured and started"

echo ""
echo "=== Starting API with PM2 ==="
cd "$APP_DIR/api"
pm2 delete vidyam-api 2>/dev/null || true
pm2 start server.js --name vidyam-api
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "=== Setup complete ==="
echo "Test: curl http://localhost/health"
