module "rds" {
  source = "git::https://github.com/tedens/tf-modules.git//AWS/rds?ref=main"

  project_name = var.project_name
  env          = var.env
  region       = var.region

  db_name              = "appdb"
  instance_class       = "db.t3.micro"
  engine               = "postgres"
  engine_version       = "15.3"
  username             = "admin"
  password             = "supersecurepassword" # Preferably pulled from a secure source
  allocated_storage    = 20
  max_allocated_storage = 100
  publicly_accessible  = false
  multi_az             = false

  vpc_id               = var.vpc_id
  subnet_ids           = var.private_subnet_ids
  security_group_ids   = [aws_security_group.rds.id]

  tags = {
    Environment = var.env
    Project     = var.project_name
  }
}


resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.env}-rds-sg"
  description = "Security group for RDS access"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow PostgreSQL access from within VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # Adjust CIDR to match your VPC range
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.env}-rds-sg"
    Environment = var.env
    Project     = var.project_name
  }
}