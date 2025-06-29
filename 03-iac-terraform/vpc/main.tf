module "vpc" {
  source = "git::https://github.com/tedens/tf-modules.git//AWS/vpc"

  name                 = "vpc-${var.env}"
  cidr_block           = var.vpc_cidr
  availability_zones   = ["us-east-1a", "us-east-1b"]
  public_subnets       = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets      = ["10.0.3.0/24", "10.0.4.0/24"]
  enable_dns_support   = true
  enable_dns_hostnames = true

  create_igw          = true
  create_nat_gateway  = false
  single_nat_gateway  = true

  tags = {
    Environment = var.env
    Project     = "devops-portfolio"
  }
}
