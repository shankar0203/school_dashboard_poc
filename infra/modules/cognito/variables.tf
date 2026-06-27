variable "project" { type = string }

variable "callback_urls" {
  description = "Allowed sign-in redirect URLs. Cognito requires HTTPS except for http://localhost."
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "logout_urls" {
  description = "Allowed sign-out redirect URLs."
  type        = list(string)
  default     = ["http://localhost:5173"]
}
