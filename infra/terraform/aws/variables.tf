variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "production"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "name_prefix" {
  type    = string
  default = "edusprouts-justeasy"
}

variable "backend_image" {
  type = string
}

variable "frontend_image" {
  type = string
}

# Retained for backward-compatible GHCR deployments. ECR images use the ECS
# execution role and do not consume these credentials.
variable "registry_username" {
  type    = string
  default = "unused-for-ecr"
}

variable "registry_password" {
  type      = string
  sensitive = true
  default   = "unused-for-ecr"
}

variable "database_instance_class" {
  type    = string
  default = "db.r7g.large"
}

variable "database_allocated_storage" {
  type    = number
  default = 100
}

variable "database_max_allocated_storage" {
  type    = number
  default = 1000
}

variable "database_multi_az" {
  type    = bool
  default = true
}

variable "backup_retention_days" {
  type    = number
  default = 35
}

variable "backend_desired_count" {
  type    = number
  default = 4
}

variable "backend_max_count" {
  type    = number
  default = 20
}

variable "frontend_desired_count" {
  type    = number
  default = 2
}

variable "frontend_max_count" {
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

variable "email_from" {
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

variable "send_verification_emails" {
  description = "Enable verification email delivery only after production SMTP/SES credentials are validated."
  type        = bool
  default     = false
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
  type = string
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

variable "allow_incomplete_legal_config" {
  description = "Temporary migration escape hatch; production legal details must still be supplied before launch sign-off."
  type        = bool
  default     = false
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

variable "custom_domain" {
  description = "Canonical application hostname. Leave empty to use the CloudFront-generated hostname."
  type        = string
  default     = ""

  validation {
    condition     = var.custom_domain == "" || can(regex("^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$", var.custom_domain))
    error_message = "custom_domain must be an unqualified hostname such as justeasy.in."
  }
}

variable "additional_custom_domains" {
  description = "Additional CloudFront aliases, such as the www hostname."
  type        = list(string)
  default     = []
}

variable "cloudfront_certificate_arn" {
  description = "ARN of an ISSUED ACM certificate in us-east-1 covering every custom domain."
  type        = string
  default     = ""

  validation {
    condition = (
      var.cloudfront_certificate_arn == "" ||
      can(regex("^arn:aws:acm:us-east-1:[0-9]{12}:certificate/", var.cloudfront_certificate_arn))
    )
    error_message = "cloudfront_certificate_arn must be an ACM certificate ARN from us-east-1."
  }
}
