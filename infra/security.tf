# EC2 security group (kept at root so RDS can depend on it without a cycle).
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
