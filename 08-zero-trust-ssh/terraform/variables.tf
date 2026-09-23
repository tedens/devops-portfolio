variable "aws_region" {
  description = "Region for the cluster. The audit log group and the recording bucket follow it; nothing is pinned to a second region."
  type        = string
  default     = "us-east-2"
}

variable "owner" {
  description = "Tag value used to attribute cost and to answer 'who do I ask about this'."
  type        = string
  default     = "tj"
}

variable "cluster_name" {
  description = "Teleport cluster name. Also the public DNS name, so it has to be a name you control."
  type        = string
  default     = "teleport-demo"
}

variable "public_dns_name" {
  description = <<-EOT
    Fully qualified name pointed at the load balancer. Teleport issues its own
    certificate over ACME for this name, so it must resolve publicly before the
    proxy starts. Leave empty to run with a self-signed certificate, which is
    fine for a first apply and not fine for anything else.
  EOT
  type        = string
  default     = ""
}

variable "acme_email" {
  description = "Contact address for the ACME account. Required when public_dns_name is set."
  type        = string
  default     = ""
}

variable "teleport_version" {
  description = "Pinned Teleport version. Unpinned installs mean two applies a week apart produce different clusters."
  type        = string
  default     = "16.4.6"
}

variable "vpc_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

variable "proxy_instance_type" {
  type    = string
  default = "t3.small"
}

variable "node_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "allowed_web_cidrs" {
  description = <<-EOT
    Who may reach the proxy on 443. Defaults to the whole internet because an
    identity-aware proxy is meant to be reachable; everything behind it still
    requires SSO and a hardware second factor. Narrow it if you can.
  EOT
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "log_retention_days" {
  description = "CloudWatch retention for flow logs and the Teleport audit stream."
  type        = number
  default     = 365

  validation {
    condition     = var.log_retention_days >= 365
    error_message = "HIPAA 164.312(b) evidence is usually asked for over a year or more; do not drop below 365 days."
  }
}

variable "session_recording_retention_days" {
  description = "How long session recordings are kept in S3 before expiry."
  type        = number
  default     = 365
}
