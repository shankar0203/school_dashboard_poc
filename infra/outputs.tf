output "ec2_public_ip" {
  description = "Public IP of the app server"
  value       = module.ec2.public_ip
}

output "app_url" {
  description = "Open this in a browser"
  value       = module.ec2.app_url
}

output "ec2_ssh" {
  description = "SSH command (replace the .pem path)"
  value       = "ssh -i your-key.pem ubuntu@${module.ec2.public_ip}"
}

# RDS outputs deferred (module not provisioned yet).

output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.client_id
}

output "cognito_hosted_ui_domain" {
  value = module.cognito.hosted_ui_domain
}
