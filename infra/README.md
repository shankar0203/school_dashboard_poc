# Infra (Terraform) — module-based: EC2 + RDS + Cognito

Provisions, in your **default VPC**:

- **module `ec2`** — Ubuntu app server; on boot adds swap, clones your GitHub
  repo, builds the UI, and serves it via Nginx from `/var/www/html`
- **module `rds`** — RDS MySQL 8 (database `school_app`)
- **module `cognito`** — user pool + SPA app client + 3 role groups
  (`principal`, `teacher`, `student`) + hosted-UI domain

## Layout
```
infra/
├─ main.tf                 # provider, data lookups, module wiring
├─ variables.tf            # all inputs
├─ outputs.tf              # re-exports module outputs
├─ terraform.tfvars.example
└─ modules/
   ├─ ec2/      (main, variables, outputs)
   ├─ rds/      (main, variables, outputs)
   └─ cognito/  (main, variables, outputs)
```

## Deploy
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # edit values
terraform init        # re-run after the module refactor to install modules
terraform plan
terraform apply
```

Key outputs after apply: `app_url`, `rds_endpoint`, `cognito_user_pool_id`,
`cognito_client_id`, `cognito_hosted_ui_domain`.

## Updating UI code (no infra rebuild)
SSH to the instance and run the helper:
```bash
ssh -i your-key.pem ubuntu@<EC2_IP>
~/app/redeploy.sh        # git pull + build + publish to nginx
```

## Cognito — what's created now vs later
- **Now (infra):** user pool, app client, and the 3 groups. After apply, you can
  create test users in the Cognito console and assign them to a group.
- **Later (app):** the React frontend wires sign-in to this pool (Amplify or
  `amazon-cognito-identity-js`) and routes by group. We'll add that after the
  EC2/UI testing is signed off, then move on to DB + backend.

## Notes
- The flat `ec2.tf` / `rds.tf` files are now empty placeholders (kept because the
  environment couldn't delete them); all resources live under `modules/`.
- `terraform init` must be re-run after this refactor (new modules + the random
  provider for the Cognito domain suffix).
- `terraform destroy` tears everything down.
