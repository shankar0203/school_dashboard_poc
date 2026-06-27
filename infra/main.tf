# ===========================================================================
#  Root — provider, shared data lookups, and module wiring.
#  Resources live in:  modules/ec2  modules/rds  modules/cognito
# ===========================================================================

terraform {
  required_version = ">= 1.3"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.0" }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}

# --- Default VPC + subnets + latest Ubuntu AMI -----------------------------
data "aws_vpc" "default" { default = true }

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ssm_parameter" "ubuntu" {
  name = "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
}

# --- EC2 (app server) ------------------------------------------------------
module "ec2" {
  source        = "./modules/ec2"
  project       = var.project
  vpc_id        = data.aws_vpc.default.id
  subnet_id     = data.aws_subnets.default.ids[0]
  ami_id        = data.aws_ssm_parameter.ubuntu.value
  instance_type = var.instance_type
  key_name      = var.key_name
  my_ip_cidr    = var.my_ip_cidr
  github_repo   = var.github_repo
  github_branch = var.github_branch
  app_subdir    = var.app_subdir
}

# --- RDS (MySQL) -----------------------------------------------------------
module "rds" {
  source                = "./modules/rds"
  project               = var.project
  vpc_id                = data.aws_vpc.default.id
  subnet_ids            = data.aws_subnets.default.ids
  ec2_security_group_id = module.ec2.security_group_id
  my_ip_cidr            = var.my_ip_cidr
  db_instance_class     = var.db_instance_class
  db_username           = var.db_username
  db_password           = var.db_password
}

# --- Cognito (auth: user pool + 3 role groups) -----------------------------
module "cognito" {
  source        = "./modules/cognito"
  project       = var.project
  callback_urls = var.cognito_callback_urls
  logout_urls   = var.cognito_logout_urls
}
