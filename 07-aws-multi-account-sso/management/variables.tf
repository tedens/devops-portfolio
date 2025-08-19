variable "region" {
  default = "us-east-2"
}

variable "account_id" {
  description = "AWS Account ID of the management account"
}

variable "prod_role_arn" {
  description = "ARN of the production IAM role to assume"
}