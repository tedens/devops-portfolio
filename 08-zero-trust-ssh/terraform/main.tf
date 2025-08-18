provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "teleport" {
  cidr_block           = "10.10.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "teleport-vpc"
  }
}

resource "aws_subnet" "teleport_public" {
  vpc_id                  = aws_vpc.teleport.id
  cidr_block              = "10.10.1.0/24"
  map_public_ip_on_launch = true

  tags = {
    Name = "teleport-subnet"
  }
}

resource "aws_internet_gateway" "teleport_gw" {
  vpc_id = aws_vpc.teleport.id

  tags = {
    Name = "teleport-igw"
  }
}

resource "aws_route_table" "teleport_rt" {
  vpc_id = aws_vpc.teleport.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.teleport_gw.id
  }

  tags = {
    Name = "teleport-rt"
  }
}

resource "aws_route_table_association" "teleport_rt_assoc" {
  subnet_id      = aws_subnet.teleport_public.id
  route_table_id = aws_route_table.teleport_rt.id
}

resource "aws_security_group" "teleport_sg" {
  name        = "teleport-sg"
  description = "Allow SSH and Teleport access"
  vpc_id      = aws_vpc.teleport.id

  ingress {
    from_port   = 3023
    to_port     = 3026
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
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
    Name = "teleport-sg"
  }
}

resource "aws_instance" "teleport_bastion" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.teleport_public.id
  vpc_security_group_ids = [aws_security_group.teleport_sg.id]
  key_name               = var.key_name

  tags = {
    Name = "teleport-bastion"
  }
}