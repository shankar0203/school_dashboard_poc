# Config the EC2 reads at boot. Terraform fills these from the other modules,
# so there's no manual env editing — the instance self-configures.
resource "aws_ssm_parameter" "cognito_pool"   { name = "${var.ssm_prefix}/cognito_user_pool_id" type = "String" value = module.cognito.user_pool_id }
resource "aws_ssm_parameter" "cognito_client" { name = "${var.ssm_prefix}/cognito_client_id"    type = "String" value = module.cognito.client_id }
resource "aws_ssm_parameter" "rds_host"       { name = "${var.ssm_prefix}/rds_host"             type = "String" value = module.rds.endpoint }
resource "aws_ssm_parameter" "db_name"        { name = "${var.ssm_prefix}/db_name"              type = "String" value = module.rds.database }
resource "aws_ssm_parameter" "db_user"        { name = "${var.ssm_prefix}/db_user"              type = "String" value = var.db_username }
resource "aws_ssm_parameter" "db_password"    { name = "${var.ssm_prefix}/db_password"          type = "SecureString" value = var.db_password }
