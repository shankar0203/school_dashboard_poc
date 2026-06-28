#!/bin/bash
# ============================================================================
#  Generates the app's config from AWS SSM Parameter Store (no manual editing).
#  Writes:  src/config/env.js  (frontend)  and  api/.env  (backend)
#  Run on the EC2 (it has an IAM role allowing ssm:GetParameter).
#  Region + prefix come from env, with sensible defaults.
# ============================================================================
set -e
REGION="${AWS_REGION:-us-east-1}"
PREFIX="${SSM_PREFIX:-/school-app}"
APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"   # repo root (scripts/ is one level down)

get() { aws ssm get-parameter --region "$REGION" --name "$PREFIX/$1" --with-decryption --query Parameter.Value --output text; }

POOL=$(get cognito_user_pool_id)
CLIENT=$(get cognito_client_id)
DBHOST=$(get rds_host)
DBNAME=$(get db_name)
DBUSER=$(get db_user)
DBPASS=$(get db_password)

echo "==> writing src/config/env.js"
cat > "$APP_ROOT/src/config/env.js" <<EOF
// AUTO-GENERATED from SSM by gen-config-from-ssm.sh — do not edit.
export const env = {
  region: "$REGION",
  cognito: { userPoolId: "$POOL", clientId: "$CLIENT" },
  apiBaseUrl: "/api",
};
export default env;
EOF

echo "==> writing api/.env"
mkdir -p "$APP_ROOT/api"
cat > "$APP_ROOT/api/.env" <<EOF
PORT=4000
DEFAULT_SCHOOL_ID=1
DB_HOST=$DBHOST
DB_PORT=3306
DB_NAME=$DBNAME
DB_USER=$DBUSER
DB_PASSWORD=$DBPASS
AWS_REGION=$REGION
COGNITO_USER_POOL_ID=$POOL
COGNITO_CLIENT_ID=$CLIENT
EOF

echo "==> config generated from SSM."
