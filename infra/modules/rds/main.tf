# RDS MySQL module.

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "MySQL access for the app server and your laptop"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MySQL from the app server"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [var.ec2_security_group_id]
  }
  ingress {
    description = "MySQL from your IP (Workbench)"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-db-subnets"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "mysql" {
  identifier             = "${var.project}-db"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  storage_type           = "gp3"
  db_name                = "school_app"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible    = true
  skip_final_snapshot    = true
  multi_az               = false
  deletion_protection    = false
}
