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