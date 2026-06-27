# EC2 app server module — builds & serves the UI from GitHub on boot.

locals {
  app_path = var.app_subdir == "" ? "/home/ubuntu/app" : "/home/ubuntu/app/${var.app_subdir}"
}

resource "aws_security_group" "ec2" {
  name        = "${var.project}-ec2-sg"
  description = "Web + SSH for the app server"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH (your IP only)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "app" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  key_name                    = var.key_name
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

    # 0) Swap so the Vite build doesn't OOM on a small instance
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # 1) Runtime + tools
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get update -y
    apt-get install -y nodejs nginx git
    npm install -g pm2

    # 2) Get the UI code from GitHub
    cd /home/ubuntu
    sudo -u ubuntu git clone -b ${var.github_branch} ${var.github_repo} app

    # 3) Install deps + build
    cd ${local.app_path}
    sudo -u ubuntu npm install
    sudo -u ubuntu npm run build

    # 4) Copy build into nginx web root (avoids /home permission issues)
    rm -rf /var/www/html/*
    cp -r ${local.app_path}/dist/* /var/www/html/

    # 5) Nginx: SPA fallback + /api proxy for the backend later
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
    echo "DONE: UI built and served."
  EOF

  tags = { Name = "${var.project}-app" }
}
