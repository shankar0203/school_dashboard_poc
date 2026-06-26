output "ec2_public_ip" {
  description = "Public IP of the app server"
  value       = aws_instance.app.public_ip
}

output "ec2_ssh" {
  description = "Ready-to-use SSH command (replace the .pem path)"
  value       = "ssh -i your-key.pem ubuntu@${aws_instance.app.public_ip}"
}

output "app_url" {
  description = "Open this once the UI is built + served by Nginx"
  value       = "http://${aws_instance.app.public_ip}"
}

output "rds_endpoint" {
  description = "RDS hostname — use this in MySQL Workbench and in the API .env"
  value       = aws_db_instance.mysql.address
}

output "rds_port" {
  value = aws_db_instance.mysql.port
}

output "rds_database" {
  value = aws_db_instance.mysql.db_name
}
