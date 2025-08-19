variable "aws_region" {
  default = "us-east-2"
}

variable "aws_profile" {
  default = "dr"
}

variable "db_instance_class" {
  default = "db.t3.micro"
}

variable "db_password" {
  description = "Password for restored DB (needed if not encrypted)"
  type        = string
  sensitive   = true
}

variable "rds_snapshot_id" {
  description = "Snapshot ID to restore from (e.g., rds:prod-db-2025-08-17-07-00)"
  type        = string
}