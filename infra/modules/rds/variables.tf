variable "project"               { type = string }
variable "vpc_id"                { type = string }
variable "subnet_ids"            { type = list(string) }
variable "ec2_security_group_id" { type = string }
variable "my_ip_cidr"            { type = string }
variable "db_instance_class"     { type = string }
variable "db_username"           { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}
