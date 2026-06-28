# Rebuild runbook (destroy → bring back)

Each full rebuild creates a **new Cognito pool** (new IDs), a **new RDS** (new
endpoint + empty database), and possibly a **new EC2 IP**. So a few values must
be refreshed each time. Follow this top to bottom.

---

## Before you destroy (today)
Push any local code changes — the new EC2 clones from GitHub, so anything not
pushed is lost:
```
cd ~/Documents/school-app-poc
git add -A && git commit -m "save work" && git push
```

## Destroy
```
cd ~/Documents/school-app-poc/infra
terraform destroy        # type yes
```

---

## Bring it back (tomorrow)

### 1. Check your IP (it may have changed overnight)
```
curl https://checkip.amazonaws.com
```
If different from `my_ip_cidr` in `infra/terraform.tfvars`, update it (append `/32`).

### 2. Provision
```
cd ~/Documents/school-app-poc/infra
terraform apply
terraform output        # copy: cognito_user_pool_id, cognito_client_id, rds_endpoint, ec2_public_ip
```

### 3. Point the app at the NEW Cognito + RDS
Edit `config.values` (in the repo root):
```
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=<from output>
COGNITO_CLIENT_ID=<from output>
DB_HOST=<rds_endpoint>
DB_PASSWORD=<your db password>
```
Generate the source files + push (env.js must be in git for the build):
```
cd ~/Documents/school-app-poc
bash scripts/apply-config.sh
grep clientId src/config/env.js     # confirm real id, not XXXX
git add -A && git commit -m "env for rebuild" && git push
```

### 4. Load the database (RDS is empty after a destroy)
SSH in and load the SQL from the box (it can reach RDS directly):
```
ssh -i ~/.ssh/vidyam-server.pem ubuntu@<ec2_public_ip>
sudo apt-get update -y && sudo apt-get install -y mysql-client
ENDPOINT=<rds_endpoint>
mysql -h $ENDPOINT -u admin -p            < ~/app/db/schema.sql
mysql -h $ENDPOINT -u admin -p school_app < ~/app/db/seed.sql
mysql -h $ENDPOINT -u admin -p school_app < ~/app/db/dummy_students.sql
mysql -h $ENDPOINT -u admin -p -e "USE school_app; SELECT COUNT(*) FROM students;"   # ~34
```

### 5. Put the API's .env on the EC2 + deploy
```
# laptop:
scp -i ~/.ssh/vidyam-server.pem api/.env ubuntu@<ec2_public_ip>:~/app/api/.env
# EC2:
cd ~/app && ./deploy.sh
curl -s http://localhost:4000/health        # {"ok":true,"db":"up"}
```

### 6. Recreate the 3 Cognito users (old ones were destroyed)
```
POOL=$(terraform -chdir=infra output -raw cognito_user_pool_id)
for u in student teacher principal; do
  aws cognito-idp admin-create-user --user-pool-id $POOL --username $u@test.com \
    --message-action SUPPRESS --user-attributes Name=email,Value=$u@test.com Name=email_verified,Value=true
  aws cognito-idp admin-set-user-password --user-pool-id $POOL --username $u@test.com --password 'Test@1234' --permanent
  aws cognito-idp admin-add-user-to-group --user-pool-id $POOL --username $u@test.com --group-name $u
done
```

### 7. Test
- Open `http://<ec2_public_ip>`, log in as each user (password `Test@1234`)
- `curl -s http://<ec2_public_ip>/api/students` → real rows
- Principal → Students → class 9-B should show Qadir Hussain / Reshma J.

---

## The 4 things that change every rebuild (don't skip)
1. **Cognito IDs** → update `config.values` → `apply-config.sh` → push (step 3)
2. **RDS endpoint** → `config.values` DB_HOST + reload SQL (steps 3–4)
3. **Database is empty** → reload schema/seed/dummy (step 4)
4. **Cognito users gone** → recreate them (step 6)

(If your IP changed, also step 1.)
