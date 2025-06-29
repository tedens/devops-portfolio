variable "env" {
  description = "The environment for the VPC (e.g., dev, prod)"
  type        = string
  
}

variable "project_name" {
  description = "The name of the project"
  type        = string

}

variable "region" {
  description = "The AWS region to deploy resources in"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC where the RDS instance will be deployed"
  type        = string
  
}
variable "private_subnet_ids" {
  description = "List of private subnet IDs for the RDS instance"
  type        = list(string)
}