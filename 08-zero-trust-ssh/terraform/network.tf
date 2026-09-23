# Two AZs because the load balancer needs two, and because a single-AZ demo
# quietly teaches the wrong shape. The public subnets hold nothing but the
# load balancer and the NAT gateways; every instance lives in a private
# subnet and none of them has a public address.

locals {
  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnets = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i + 10)]
}

resource "aws_vpc" "teleport" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.cluster_name}-vpc" }
}

resource "aws_subnet" "public" {
  count = length(local.azs)

  vpc_id            = aws_vpc.teleport.id
  cidr_block        = local.public_subnets[count.index]
  availability_zone = local.azs[count.index]

  # The load balancer gets its addresses from the ELB service, not from this
  # setting. Leaving it false means anything launched here by mistake is not
  # silently given a public IP.
  map_public_ip_on_launch = false

  tags = { Name = "${var.cluster_name}-public-${local.azs[count.index]}" }
}

resource "aws_subnet" "private" {
  count = length(local.azs)

  vpc_id                  = aws_vpc.teleport.id
  cidr_block              = local.private_subnets[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false

  tags = { Name = "${var.cluster_name}-private-${local.azs[count.index]}" }
}

resource "aws_internet_gateway" "teleport" {
  vpc_id = aws_vpc.teleport.id

  tags = { Name = "${var.cluster_name}-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.teleport.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.teleport.id
  }

  tags = { Name = "${var.cluster_name}-public" }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Outbound only, for package installs and the ACME challenge. This is the one
# component here that costs real money when idle; if you are running this as a
# demo, destroy it rather than leaving it up.
resource "aws_eip" "nat" {
  count = length(local.azs)

  domain = "vpc"

  tags = { Name = "${var.cluster_name}-nat-${local.azs[count.index]}" }
}

resource "aws_nat_gateway" "teleport" {
  count = length(local.azs)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = { Name = "${var.cluster_name}-nat-${local.azs[count.index]}" }

  depends_on = [aws_internet_gateway.teleport]
}

resource "aws_route_table" "private" {
  count = length(local.azs)

  vpc_id = aws_vpc.teleport.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.teleport[count.index].id
  }

  tags = { Name = "${var.cluster_name}-private-${local.azs[count.index]}" }
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ---------------------------------------------------------------------------
# Flow logs
#
# HIPAA 164.312(b). The previous version of this project had none, so an
# investigation would have had nothing to reconstruct: who talked to the
# bastion, and when, would have been unanswerable.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "flow" {
  name              = "/aws/vpc/${var.cluster_name}/flow"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.teleport.arn
}

resource "aws_flow_log" "teleport" {
  vpc_id                   = aws_vpc.teleport.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow.arn
  iam_role_arn             = aws_iam_role.flow_logs.arn
  max_aggregation_interval = 60

  tags = { Name = "${var.cluster_name}-flow" }
}

# ---------------------------------------------------------------------------
# VPC endpoints
#
# Break-glass access is SSM Session Manager, and the private subnets reach it
# over interface endpoints rather than the NAT gateway. That keeps the control
# path inside the VPC even if the NAT route is withdrawn, which is exactly the
# moment you want to get onto a host.
# ---------------------------------------------------------------------------

resource "aws_vpc_endpoint" "interface" {
  for_each = toset(["ssm", "ssmmessages", "ec2messages", "logs", "kms"])

  vpc_id              = aws_vpc.teleport.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true

  tags = { Name = "${var.cluster_name}-${each.key}" }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.teleport.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  tags = { Name = "${var.cluster_name}-s3" }
}
