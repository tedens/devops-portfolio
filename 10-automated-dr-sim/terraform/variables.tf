variable "aws_region" {
  description = "Region the recovery environment is built in. Usually the DR region, not the primary."
  type        = string
  default     = "us-east-2"
}

variable "aws_profile" {
  description = "Local profile to use. Leave null in CI, where the role comes from OIDC."
  type        = string
  default     = null
}

variable "name" {
  description = "Name prefix for every resource in the drill."
  type        = string
  default     = "dr-sim"
}

variable "vpc_cidr" {
  description = "CIDR for the throwaway recovery VPC. Must not overlap anything it may later be peered with."
  type        = string
  default     = "10.20.0.0/16"
}

variable "azs" {
  description = <<-EOT
    Availability zones for the DB subnet group. RDS requires subnets in at
    least two AZs, so this must have two or more entries even though the drill
    only ever runs a single instance.
  EOT
  type        = list(string)
  default     = ["us-east-2a", "us-east-2b"]

  validation {
    condition     = length(var.azs) >= 2
    error_message = "RDS subnet groups need at least two availability zones."
  }
}

variable "rds_snapshot_id" {
  description = "Snapshot to restore. Resolve the latest with scripts/latest_snapshot.sh."
  type        = string
}

variable "db_instance_class" {
  description = "Instance class for the restored database. Size for restore speed, not for production load."
  type        = string
  default     = "db.t3.micro"
}

variable "kms_key_id" {
  description = "KMS key for the restored instance. Required when the source snapshot is encrypted."
  type        = string
  default     = null
}

variable "validator_instance_type" {
  description = "Instance type for the throwaway validator host."
  type        = string
  default     = "t3.micro"
}

variable "drill_id" {
  description = "Identifier for this run, used to tag resources and label the results."
  type        = string
  default     = "manual"
}

variable "db_credentials_secret_arn" {
  description = <<-EOT
    Secrets Manager ARN holding the master credentials for the source database.
    A restored snapshot keeps the credentials it was taken with, so the drill
    needs the same secret production uses. The validator is granted read access
    to this one ARN and nothing else.
  EOT
  type        = string
  default     = null
}
