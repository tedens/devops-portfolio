variable "env" {
  description = "The environment for the VPC (e.g., dev, prod)"
  type        = string 
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}
