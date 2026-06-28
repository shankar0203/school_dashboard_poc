output "public_ip" {
  value = aws_eip.app.public_ip
}

output "security_group_id" {
  value = aws_security_group.ec2.id
}

output "app_url" {
  value = "http://${aws_eip.app.public_ip}"
}
