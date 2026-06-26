# ===========================================================================
#  EC2 app server + its security group.
#  On boot it installs the runtime, clones your GitHub repo, builds the UI,
#  and serves it with Nginx — fully automatic.
# ===========================================================================

locals {
  # where the Vite app ends up after cloning (handles an optional subfolder)
  app_path = var.app_subdir == "" ? "/home/ubuntu/app" : "/home/ubuntu/app/${var.app_subdir}"
}

resource "aws_security_group" "ec2" {
  name        = "${var.project}-ec2-sg"
  description = "Web + SSH for the app server"
  vpc_id      = data.aws_vpc.default.id

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
  ami                         = data.aws_ssm_parameter.ubuntu.value
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  key_name                    = var.key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  # ---- startup script: runtime + dependencies + UI build + Nginx ----------
  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1   # logs at /var/log/user-data.log
    export DEBIAN_FRONTEND=noninteractive

    # 1) Runtime + tools
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get update -y
    apt-get install -y nodejs nginx git
    npm install -g pm2

    # 2) Get the UI code from GitHub
    cd /home/ubuntu
    sudo -u ubuntu git clone -b ${var.github_branch} ${var.github_repo} app

    # 3) Install deps + build the UI
    cd ${local.app_path}
    sudo -u ubuntu npm install
    sudo -u ubuntu npm run build

    # 4) Serve the built UI with Nginx (SPA fallback + /api proxy for later)
    cat > /etc/nginx/sites-available/default <<'NGINX'
    server {
        listen 80 default_server;
        server_name _;
        root ${local.app_path}/dist;
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
