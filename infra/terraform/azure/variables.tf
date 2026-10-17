variable "azure_subscription_id" {
  description = "Azure subscription that owns the platform."
  type        = string
}

variable "location" {
  type    = string
  default = "centralindia"
}

variable "environment" {
  type    = string
  default = "staging"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "name_prefix" {
  type    = string
  default = "jecc"
}

variable "backend_image" {
  type = string
}

variable "frontend_image" {
  type = string
}

variable "registry_server" {
  type    = string
  default = "ghcr.io"
}

variable "registry_username" {
  type = string
}

variable "registry_password" {
  type      = string
  sensitive = true
}

variable "database_sku" {
  type    = string
  default = "GP_Standard_D2s_v3"
}

variable "database_storage_mb" {
  type    = number
  default = 131072
}

variable "database_high_availability" {
  type    = bool
  default = true
}

variable "database_geo_redundant_backup" {
  type    = bool
  default = false
}

variable "backup_retention_days" {
  type    = number
  default = 35
}

variable "backend_min_replicas" {
  type    = number
  default = 2
}

variable "backend_max_replicas" {
  type    = number
  default = 10
}

variable "frontend_min_replicas" {
  type    = number
  default = 2
}

variable "frontend_max_replicas" {
  type    = number
  default = 10
}

variable "email_host" {
  type = string
}

variable "email_port" {
  type    = number
  default = 587
}

variable "email_user" {
  type = string
}

variable "email_password" {
  type      = string
  sensitive = true
}

variable "resend_api_key" {
  description = "Resend API key used for transactional email delivery over HTTPS."
  type        = string
  sensitive   = true
}

variable "resend_from_email" {
  description = "Sender address for Resend; must belong to the domain verified in Resend."
  type        = string
}

variable "resend_from_name" {
  description = "Friendly sender name applied to Resend messages."
  type        = string
  default     = "Just Easy CA Classes"
}

variable "login_otp_enabled" {
  description = "Offer students an emailed one-time code as an alternative to password sign-in. Staff accounts are always password-only."
  type        = bool
  default     = true
}

variable "support_email" {
  type = string
}

variable "support_phone" {
  type = string
}

variable "grievance_email" {
  type = string
}

variable "livekit_api_url" {
  description = "Provider-neutral LiveKit API URL, for example https://live.example.com."
  type        = string
}

variable "livekit_ws_url" {
  type = string
}

variable "livekit_api_key" {
  type      = string
  sensitive = true
}

variable "livekit_api_secret" {
  type      = string
  sensitive = true
}

variable "company_legal_name" {
  type    = string
  default = "Just Easy CA Classes Private Limited"
}

variable "legal_address" {
  type    = string
  default = ""
}

variable "grievance_officer_name" {
  type    = string
  default = ""
}

variable "cin" {
  type    = string
  default = ""
}

variable "gstin" {
  type    = string
  default = ""
}

variable "alert_email" {
  type    = string
  default = ""
}

variable "release" {
  type    = string
  default = "manual"
}

variable "allow_self_enrollment" {
  type    = bool
  default = false
}
