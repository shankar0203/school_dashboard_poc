output "endpoint" {
  value = aws_db_instance.mysql.address
}

output "port" {
  value = aws_db_instance.mysql.port
}

output "database" {
  value = aws_db_instance.mysql.db_name
}

output "security_group_id" {
  value = aws_security_group.rds.id
}
