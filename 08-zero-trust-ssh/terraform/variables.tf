variable "aws_region" {
  default = "us-east-2"
}

variable "ami_id" {
  description = "AMI ID for Ubuntu 22.04"
  default     = "ami-0e83be366243f524a" # us-east-2 Ubuntu
}

variable "instance_type" {
  default = "t3.small"
}

variable "key_name" {
  description = "SSH key pair name"
  default     = "your-key-name-here"
}