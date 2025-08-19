variable "region" {
  default = "us-east-2"
}

variable "management_role_arn" {
  description = "ARN of the IAM role in the management account allowed to assume this one"
  type        = string
}