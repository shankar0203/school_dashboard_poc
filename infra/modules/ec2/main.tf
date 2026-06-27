# EC2 app server module.
# Startup script only BOOTSTRAPS the box (runtime + clone). The actual build &
# serve steps are run manually via deploy.sh (see repo root). Automate later by
# appending "bash /home/ubuntu/app/${var.app_subdir}/deploy.sh" to user_data.

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

  # BOOTSTRAP ONLY: swap + runtime + clone. Deploy is run manually (deploy.sh).
  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1
    export DEBIAN_FRONTEND=noninteractive

    # Swap so the Vite build (run later via deploy.sh) won't OOM
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # Runtime + tools
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get update -y
    apt-get install -y nodejs nginx git
    npm install -g pm2

    # Clone the repo (so deploy.sh is on the box) — but do NOT build/serve yet
    cd /home/ubuntu
    sudo -u ubuntu git clone -b ${var.github_branch} ${var.github_repo} app
    chmod +x /home/ubuntu/app/deploy.sh || true

    echo "BOOTSTRAP DONE. SSH in and run:  cd ~/app/${var.app_subdir} && ./deploy.sh"
  EOF

  tags = { Name = "${var.project}-app" }
}
