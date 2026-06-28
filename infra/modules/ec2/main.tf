# EC2 app server module — fully self-configuring.
# On boot it reads config from SSM (Cognito + RDS), writes env.js + api/.env,
# builds the UI, and starts nginx + the API. No manual steps.

resource "aws_instance" "app" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [var.security_group_id]
  key_name                    = var.key_name
  iam_instance_profile        = var.iam_instance_profile
  associate_public_ip_address = true
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1
    export DEBIAN_FRONTEND=noninteractive

    # swap (so the Vite build won't OOM on a small instance)
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # runtime + tools (awscli reads SSM)
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get update -y
    apt-get install -y nodejs nginx git awscli
    npm install -g pm2

    # clone the app
    cd /home/ubuntu
    sudo -u ubuntu git clone -b ${var.github_branch} ${var.github_repo} app
    chown -R ubuntu:ubuntu /home/ubuntu/app

    # config comes from SSM (region + prefix passed to the helper)
    export AWS_REGION=${var.region}
    export SSM_PREFIX=${var.ssm_prefix}
    bash /home/ubuntu/app/scripts/gen-config-from-ssm.sh

    APP=/home/ubuntu/app/${var.app_subdir}

    # build UI
    cd $APP
    sudo -u ubuntu npm install
    sudo -u ubuntu npm run build
    rm -rf /var/www/html/*
    cp -r $APP/dist/* /var/www/html/

    # nginx: SPA + /api proxy
    cat > /etc/nginx/sites-available/default <<'NGINX'
    server {
        listen 80 default_server;
        server_name _;
        root /var/www/html;
        index index.html;
        location / { try_files $uri /index.html; }
        location /api/ { proxy_pass http://127.0.0.1:4000/; }
    }
    NGINX
    systemctl restart nginx

    # API under pm2
    cd /home/ubuntu/app/api
    sudo -u ubuntu npm install
    sudo -u ubuntu pm2 start server.js --name school-api
    sudo -u ubuntu pm2 save

    echo "DONE: configured from SSM, built, and serving."
  EOF

  tags = { Name = "${var.project}-app" }
}

# Stable public IP (used directly, or behind the ALB)
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Name = "${var.project}-eip" }
}
