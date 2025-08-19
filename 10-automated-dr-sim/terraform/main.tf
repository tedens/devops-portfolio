provider "aws" {
  region = var.aws_region
  profile = var.aws_profile
}

resource "aws_vpc" "dr_vpc" {
  cidr_block = "10.20.0.0/16"
  tags = {
    Name = "dr-sim-vpc"
  }
}

resource "aws_subnet" "dr_subnet" {
  vpc_id                  = aws_vpc.dr_vpc.id
  cidr_block              = "10.20.1.0/24"
  map_public_ip_on_launch = true
  tags = {
    Name = "dr-sim-subnet"
  }
}

resource "aws_security_group" "dr_sg" {
  name        = "dr-sim-sg"
  vpc_id      = aws_vpc.dr_vpc.id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "dr-sim-sg"
  }
}

resource "aws_db_subnet_group" "dr_db_subnet_group" {
  name       = "dr-db-subnet-group"
  subnet_ids = [aws_subnet.dr_subnet.id]

  tags = {
    Name = "dr-db-subnet-group"
  }
}

resource "aws_db_instance" "dr_rds" {
  identifier              = "dr-db"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  engine                  = "mysql"
  engine_version          = "8.0"
  username                = "admin"
  password                = var.db_password
  skip_final_snapshot     = true
  publicly_accessible     = true
  db_subnet_group_name    = aws_db_subnet_group.dr_db_subnet_group.name
  vpc_security_group_ids  = [aws_security_group.dr_sg.id]
  snapshot_identifier     = var.rds_snapshot_id

  tags = {
    Name = "dr-restored-db"
  }
}