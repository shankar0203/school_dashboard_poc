# ===========================================================================
#  Deploy + test the app ON the EC2 after EC2/RDS/Cognito exist.
#  (The API is not a separate AWS resource — it's a process on the EC2.)
#  This:
#   1. waits for the instance bootstrap (cloud-init) to finish
#   2. writes api/.env with the live RDS endpoint + DB creds + Cognito IDs
#   3. runs deploy.sh (builds UI, configures Nginx, starts the API via pm2)
#   4. curls the API health endpoint as a smoke test
#  Re-runs whenever the instance changes; force a redeploy with:
#     terraform apply -replace=null_resource.deploy
# ===========================================================================

resource "null_resource" "deploy" {
  depends_on = [module.ec2, module.rds, module.cognito]

  triggers = {
    instance = module.ec2.public_ip
  }

  connection {
    type        = "ssh"
    host        = module.ec2.public_ip
    user        = "ubuntu"
    private_key = file(pathexpand(var.private_key_path))
    timeout     = "6m"
  }

  provisioner "remote-exec" {
    inline = [
      "cloud-init status --wait || true",
      "mkdir -p /home/ubuntu/app/api",
      "cat > /home/ubuntu/app/api/.env <<'ENV'",
      "PORT=4000",
      "DEFAULT_SCHOOL_ID=1",
      "DB_HOST=${module.rds.endpoint}",
      "DB_PORT=3306",
      "DB_NAME=${module.rds.database}",
      "DB_USER=${var.db_username}",
      "DB_PASSWORD=${var.db_password}",
      "AWS_REGION=${var.aws_region}",
      "COGNITO_USER_POOL_ID=${module.cognito.user_pool_id}",
      "COGNITO_CLIENT_ID=${module.cognito.client_id}",
      "ENV",
      "cd /home/ubuntu/app && git pull && ./deploy.sh",
      "sleep 3",
      "echo '--- API health check ---'",
      "curl -s http://localhost:4000/health || true",
      "echo",
    ]
  }
}
