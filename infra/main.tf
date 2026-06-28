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

# --- EC2 (app server) — depends on SSM config existing first ----------------
module "ec2" {
  source               = "./modules/ec2"
  project              = var.project
  subnet_id            = data.aws_subnets.default.ids[0]
  ami_id               = data.aws_ssm_parameter.ubuntu.value
  instance_type        = var.instance_type
  key_name             = var.key_name
  security_group_id    = aws_security_group.ec2.id
  iam_instance_profile = aws_iam_instance_profile.ec2.name
  region               = var.aws_region
  ssm_prefix           = var.ssm_prefix
  github_repo          = var.github_repo
  github_branch        = var.github_branch
  app_subdir           = var.app_subdir

  depends_on = [
    aws_ssm_parameter.cognito_pool,
    aws_ssm_parameter.cognito_client,
    aws_ssm_parameter.rds_host,
    aws_ssm_parameter.db_name,
    aws_ssm_parameter.db_user,
    aws_ssm_parameter.db_password,
  ]
}

# --- RDS (MySQL) -----------------------------------------------------------
module "rds" {
  source                = "./modules/rds"
  project               = var.project
  vpc_id                = data.aws_vpc.default.id
  subnet_ids            = data.aws_subnets.default.ids
  ec2_security_group_id = aws_security_group.ec2.id
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
