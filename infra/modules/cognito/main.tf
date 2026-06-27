# Cognito module — user pool, SPA app client, and 3 role groups.

terraform {
  required_providers {
    aws    = { source = "hashicorp/aws" }
    random = { source = "hashicorp/random" }
  }
}

# unique suffix for the globally-unique hosted-UI domain
resource "random_string" "suffix" {
  length  = 6
  upper   = false
  special = false
}

resource "aws_cognito_user_pool" "this" {
  name = "${var.project}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_uppercase = true
    require_symbols   = false
  }

  admin_create_user_config {
    allow_admin_create_user_only = true # admins create accounts (no public self-signup)
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

# SPA app client — no secret, SRP auth flow (matches a React frontend)
resource "aws_cognito_user_pool_client" "spa" {
  name         = "${var.project}-web"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
  ]

  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

# Hosted-UI domain (optional but handy for testing the login page)
resource "aws_cognito_user_pool_domain" "this" {
  domain       = "${var.project}-${random_string.suffix.result}"
  user_pool_id = aws_cognito_user_pool.this.id
}

# --- the 3 roles --------------------------------------------------------
resource "aws_cognito_user_group" "student" {
  name         = "student"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Students — read-only access"
  precedence   = 30
}

resource "aws_cognito_user_group" "teacher" {
  name         = "teacher"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Teachers — class attendance, marks, notes"
  precedence   = 20
}

resource "aws_cognito_user_group" "principal" {
  name         = "principal"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Principal / Admin — full school access"
  precedence   = 10
}
