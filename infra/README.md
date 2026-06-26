# Infra (Terraform) — EC2 + RDS MySQL

Provisions everything in your **default VPC** (no networking to build):

- 1 × EC2 (Ubuntu 22.04) — on boot it installs Node 20 + Nginx + pm2,
  **clones your GitHub repo, builds the UI, and serves it** automatically
- 1 × RDS MySQL 8 (db.t3.micro, database `school_app`)
- 2 × security groups (web/SSH for EC2; MySQL for RDS)

Files:

| File | What it creates |
|------|-----------------|
| `main.tf` | provider + shared data lookups (VPC, subnets, AMI) |
| `ec2.tf`  | EC2 instance + its security group + startup script |
| `rds.tf`  | RDS MySQL + its security group + subnet group |
| `variables.tf` / `outputs.tf` | inputs and outputs |

---

## Prerequisites (one time)

1. **Terraform** installed — `brew install terraform`
2. **AWS CLI** installed + credentials configured — `aws configure`
   (needs an IAM user/role allowed to create EC2 + RDS).
3. An **EC2 key pair** in your target region: EC2 → Key Pairs → Create →
   download the `.pem`. Put its **name** in `terraform.tfvars`.

---

## Deploy

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # then edit the values
terraform init
terraform plan        # review what will be created
terraform apply       # type 'yes' to confirm
```

When it finishes, Terraform prints the outputs:

```
app_url       = "http://<EC2_IP>"
ec2_ssh       = "ssh -i your-key.pem ubuntu@<EC2_IP>"
rds_endpoint  = "school-app-db.xxxxx.ap-south-1.rds.amazonaws.com"
rds_port      = 3306
rds_database  = "school_app"
```

---

## Push the UI to GitHub first

The EC2 builds the UI **from GitHub**, so push it before `terraform apply`:

```bash
cd ~/Documents/school-app-poc
git init && git add . && git commit -m "UI"
git branch -M main
git remote add origin https://github.com/your-username/school-app-poc.git
git push -u origin main
```

Put that repo URL in `github_repo` in your `terraform.tfvars`. (Use a **public**
repo for this test — a private repo needs a deploy token, which we can add later.)

## After apply

1. **The UI is already live** — open the `app_url` output (`http://<EC2_IP>`).
   The startup script cloned, built, and served it. If the page isn't up yet,
   the build is still running; check progress with:
   ```bash
   ssh -i your-key.pem ubuntu@<EC2_IP> "tail -f /var/log/user-data.log"
   ```

2. **Load the database** — in MySQL Workbench, new connection to `rds_endpoint`
   (port 3306, user/password from your tfvars), open and run
   `../db/aws-rds-setup.sql`. Check: `USE school_app; SELECT COUNT(*) FROM students;` → 6.

3. **API** — the Express backend (still to be built) goes on the same EC2, reads
   `rds_endpoint` from its `.env`, and Nginx already proxies `/api/` to port 4000.

---

## Tear it all down (stop billing)

```bash
terraform destroy
```

---

## Notes
- `publicly_accessible = true` on RDS is for this test phase (Workbench from your
  laptop). For production, set it to `false` and reach the DB only via the EC2.
- `db_password` is sensitive — it lives in `terraform.tfvars`, which is gitignored.
  For production, move it to AWS Secrets Manager / SSM Parameter Store.
- Free-tier sizes are used (t3.micro / db.t3.micro). Running both still incurs
  small charges if you're past free tier — `terraform destroy` when done testing.
