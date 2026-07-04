# Vidyam (வித்யம்) — School Management Platform

A multi-role school management SaaS for Tamil Nadu schools.
Stack: React 18 + Vite · Node.js + Express · MySQL (AWS RDS) · AWS Cognito · Nginx + PM2 on Ubuntu EC2.

Live: https://test.invisos.in

---

## Local Development

```bash
npm install
npm run dev          # http://localhost:5173
```

---

## Production Deployment

### Prerequisites
- AWS account with VPC, public + private subnets
- EC2 key pair
- ACM wildcard cert for `*.invisos.in` (already issued)
- Route 53 hosted zone for `invisos.in`
- GitHub repo access

---

### Step 1 — Deploy Infrastructure (CloudFormation)

```
AWS Console → CloudFormation → Create stack
Upload: infra/cloudformation/vidyam-infra.yaml
```

Parameters to fill in:

| Parameter | Value |
|-----------|-------|
| VpcId | your VPC |
| ALBSubnetIds | 2 public subnets (different AZs) |
| EC2SubnetId | 1 public subnet |
| DBSubnetIds | 2 private subnets (different AZs) |
| KeyPairName | your EC2 key pair |
| DBPassword | strong password (min 8 chars) |

Stack creates: Ubuntu EC2, RDS MySQL 8.0, Cognito User Pool (5 groups), ALB + Target Group.
UserData auto-installs all dependencies on first boot.

---

### Step 2 — SSH and wait for boot to finish

```bash
ssh -i key.pem ubuntu@<EC2PublicIP>
tail -f /var/log/vidyam-deps.log
# wait for: "Dependencies installed successfully"
```

---

### Step 3 — Generate .env from stack outputs

```bash
cd ~/<repo-folder>
bash scripts/setup-env.sh
# enter DB password when prompted — everything else is auto-detected
```

This writes `api/.env` and `src/config/env.js` automatically using CloudFormation outputs.

---

### Step 4 — Build and start the app

```bash
sudo bash scripts/setup-app.sh
```

This runs in order:
1. `npm install` + `npm run build` (frontend)
2. `npm install` (API)
3. Loads `db/schema.sql` + `db/seed.sql` into RDS
4. Writes Nginx config + removes default site
5. Starts API with PM2

Verify:
```bash
curl http://localhost/health
# expect: {"ok":true,"db":"up"}
```

---

### Step 5 — Wire domain and HTTPS

**Route 53** → `test.invisos.in` → ALIAS → ALBDNSName (from stack outputs)

**ALB HTTPS listener** (AWS Console):
```
EC2 → Load Balancers → vidyam-alb-prod → Listeners → Add listener
Port: 443 | Protocol: HTTPS | Cert: *.invisos.in (ACM) | Forward to: vidyam-tg-prod
```

---

### Step 6 — Create Cognito users

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <CognitoUserPoolId> \
  --username user@example.com \
  --temporary-password Vidyam@2026! \
  --region us-east-1

aws cognito-idp admin-add-user-to-group \
  --user-pool-id <CognitoUserPoolId> \
  --username user@example.com \
  --group-name vidyam-school-admin \
  --region us-east-1
```

Available groups: `vidyam-leadership`, `vidyam-school-admin`, `vidyam-teacher`, `vidyam-parent`, `vidyam-guest`

---

## Redeploying App Changes (no infra change)

```bash
# on EC2
cd ~/<repo-folder>
git pull origin main
npm run build
pm2 restart vidyam-api
```

---

## Scripts Reference

| Script | Purpose | When to run |
|--------|---------|-------------|
| `scripts/install-deps.sh` | Installs Node 20, Nginx, PM2, MySQL client, AWS CLI | Auto on boot (UserData) |
| `scripts/setup-env.sh` | Pulls CFT outputs → writes .env | Once after new stack |
| `scripts/setup-app.sh` | Builds app, loads DB, starts services | Once after setup-env.sh |
| `scripts/apply-config.sh` | Writes api/.env + src/config/env.js from config.values | Called by setup-env.sh |

---

## Infrastructure

| Resource | Details |
|----------|---------|
| EC2 | Ubuntu 22.04 LTS, t3.micro, Nginx + PM2 |
| RDS | MySQL 8.0, db.t3.micro, 20GB gp2 |
| ALB | Internet-facing, HTTP:80 + HTTPS:443 |
| Cognito | User Pool with 5 role groups |
| S3 | `eduos-reports-prod` for PDFs/logos |
| Domain | `invisos.in` (GoDaddy) → Route 53 → ALB |
| SSL | ACM wildcard `*.invisos.in` |

IaC: `infra/cloudformation/vidyam-infra.yaml` (primary)
Backup: `infra/` (Terraform)

---

## Project Structure

```
src/
  config/appConfig.js     ← product name, theme, school config
  config/env.js           ← Cognito IDs (auto-generated, do not edit)
  lib/auth.js             ← Cognito SRP auth, role mapping
  services/dataService.js ← all API calls
  roles/
    principal.jsx         ← principal/admin screens
    teacher.jsx           ← teacher screens
    student.jsx           ← student screens
    registry.js           ← maps role → screens
  components/             ← shared UI components
api/
  server.js               ← Express app (port 4000)
  routes/                 ← students, attendance, marks, fees, messages...
  db.js                   ← MySQL connection pool
db/
  schema.sql              ← all 14 tables (run once)
  seed.sql                ← sample data
infra/
  cloudformation/
    vidyam-infra.yaml     ← primary IaC (Ubuntu + RDS + Cognito + ALB)
scripts/
  install-deps.sh
  setup-env.sh
  setup-app.sh
  apply-config.sh
```

---

## Cognito Role Mapping

| Cognito Group | App Role | Access |
|---------------|----------|--------|
| `vidyam-leadership` | principal | Full platform view |
| `vidyam-school-admin` | principal | Full school access |
| `vidyam-teacher` | teacher | Own class + marks |
| `vidyam-parent` | parent | Own child read-only |
| `vidyam-guest` | guest | Demo access |
