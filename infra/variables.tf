variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1" # N. Virginia; change if you prefer another region
}

variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "school-app"
}

variable "key_name" {
  description = "Name of an EXISTING EC2 key pair (create one in the console first) for SSH"
  type        = string
}

variable "my_ip_cidr" {
  description = "Your public IP in CIDR form for SSH + Workbench access, e.g. 49.205.10.20/32"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS instance size"
  type        = string
  default     = "db.t3.micro"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "RDS master password (8+ chars). Keep it secret."
  type        = string
  sensitive   = true
}

# --- GitHub source for the UI (cloned + built on the EC2 at boot) ----------
variable "github_repo" {
  description = "Public HTTPS git URL of your UI repo, e.g. https://github.com/you/school-app-poc.git"
  type        = string
}

variable "github_branch" {
  description = "Branch to deploy"
  type        = string
  default     = "main"
}

variable "app_subdir" {
  description = "Subfolder inside the repo where package.json lives. Empty if it's at the repo root."
  type        = string
  default     = ""
}
