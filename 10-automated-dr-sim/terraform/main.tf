# Recovery environment for a restore drill.
#
# Everything here is disposable and is destroyed at the end of every run. The
# design rule is that a restored snapshot holds exactly the same data as
# production, so the recovery environment gets production-grade isolation:
# private subnets, no internet gateway, no public IP, and no inbound rule that
# names a CIDR. The validator reaches the database because its security group
# is referenced by the database's, and the operator reaches the validator
# through SSM Session Manager rather than SSH.

data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------- networking

resource "aws_vpc" "dr" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name}-vpc" }
}

# Two AZs because RDS will not accept a single-AZ subnet group, even for an
# instance that is only ever single-AZ itself.
resource "aws_subnet" "private" {
  count = length(var.azs)

  vpc_id                  = aws_vpc.dr.id
  availability_zone       = var.azs[count.index]
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  map_public_ip_on_launch = false

  tags = { Name = "${var.name}-private-${var.azs[count.index]}" }
}

# No internet gateway and no NAT: nothing in this VPC needs to reach the
# internet, and not having a route out is a cheaper control than a rule that
# says it should not.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.dr.id
  tags   = { Name = "${var.name}-private" }
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ------------------------------------------------------------ security groups

resource "aws_security_group" "validator" {
  name        = "${var.name}-validator"
  description = "Throwaway host that runs the restore checks. No inbound."
  vpc_id      = aws_vpc.dr.id

  tags = { Name = "${var.name}-validator" }
}

# Egress to the VPC endpoints and the database only. Session Manager is an
# outbound connection from the agent, so no inbound rule is needed at all.
resource "aws_vpc_security_group_egress_rule" "validator_https" {
  security_group_id = aws_security_group.validator.id
  description       = "SSM and AWS APIs via interface endpoints"
  cidr_ipv4         = var.vpc_cidr
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "validator_mysql" {
  security_group_id            = aws_security_group.validator.id
  description                  = "Restored database"
  referenced_security_group_id = aws_security_group.database.id
  ip_protocol                  = "tcp"
  from_port                    = 3306
  to_port                      = 3306
}

resource "aws_security_group" "database" {
  name        = "${var.name}-database"
  description = "Restored snapshot. Reachable only from the validator."
  vpc_id      = aws_vpc.dr.id

  tags = { Name = "${var.name}-database" }
}

# The only way in. No CIDR is named anywhere, so this cannot accidentally
# become 0.0.0.0/0 through a variable default.
resource "aws_vpc_security_group_ingress_rule" "database_from_validator" {
  security_group_id            = aws_security_group.database.id
  description                  = "MySQL from the validator only"
  referenced_security_group_id = aws_security_group.validator.id
  ip_protocol                  = "tcp"
  from_port                    = 3306
  to_port                      = 3306
}

resource "aws_security_group" "endpoints" {
  name        = "${var.name}-endpoints"
  description = "Interface endpoints for SSM"
  vpc_id      = aws_vpc.dr.id

  tags = { Name = "${var.name}-endpoints" }
}

resource "aws_vpc_security_group_ingress_rule" "endpoints_https" {
  security_group_id            = aws_security_group.endpoints.id
  description                  = "HTTPS from inside the VPC"
  referenced_security_group_id = aws_security_group.validator.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}

# Session Manager without a NAT gateway or a public subnet.
resource "aws_vpc_endpoint" "ssm" {
  for_each = toset(["ssm", "ssmmessages", "ec2messages"])

  vpc_id              = aws_vpc.dr.id
  service_name        = "com.amazonaws.${var.aws_region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true

  tags = { Name = "${var.name}-${each.key}" }
}

# --------------------------------------------------------------- the database

resource "aws_db_subnet_group" "dr" {
  name       = "${var.name}-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${var.name}-subnets" }
}

resource "aws_db_instance" "restored" {
  identifier          = "${var.name}-restored"
  snapshot_identifier = var.rds_snapshot_id
  instance_class      = var.db_instance_class

  db_subnet_group_name   = aws_db_subnet_group.dr.name
  vpc_security_group_ids = [aws_security_group.database.id]

  # The whole point of the drill: the data is real, so treat it as real.
  publicly_accessible = false
  kms_key_id          = var.kms_key_id
  storage_encrypted   = var.kms_key_id != null

  # Disposable: no backups of the copy, no final snapshot, no protection.
  backup_retention_period    = 0
  skip_final_snapshot        = true
  deletion_protection        = false
  auto_minor_version_upgrade = false
  apply_immediately          = true
  copy_tags_to_snapshot      = false

  tags = {
    Name    = "${var.name}-restored"
    DrillId = var.drill_id
  }
}

# ---------------------------------------------------------------- the validator

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

data "aws_iam_policy_document" "validator_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "validator" {
  name               = "${var.name}-validator"
  assume_role_policy = data.aws_iam_policy_document.validator_assume.json
}

resource "aws_iam_role_policy_attachment" "validator_ssm" {
  role       = aws_iam_role.validator.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Read exactly one secret, not every secret in the account.
data "aws_iam_policy_document" "validator_secret" {
  count = var.db_credentials_secret_arn == null ? 0 : 1

  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.db_credentials_secret_arn]
  }
}

resource "aws_iam_role_policy" "validator_secret" {
  count = var.db_credentials_secret_arn == null ? 0 : 1

  name   = "${var.name}-read-db-credentials"
  role   = aws_iam_role.validator.id
  policy = data.aws_iam_policy_document.validator_secret[0].json
}

resource "aws_iam_instance_profile" "validator" {
  name = "${var.name}-validator"
  role = aws_iam_role.validator.name
}

resource "aws_instance" "validator" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.validator_instance_type
  subnet_id                   = aws_subnet.private[0].id
  vpc_security_group_ids      = [aws_security_group.validator.id]
  iam_instance_profile        = aws_iam_instance_profile.validator.name
  associate_public_ip_address = false

  # No key pair on purpose. Access is SSM Session Manager only, which is
  # logged and does not need an open port.
  user_data = <<-EOT
    #!/bin/bash
    set -euo pipefail
    dnf install -y mariadb105 jq
  EOT

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  root_block_device {
    encrypted   = true
    volume_size = 8
  }

  tags = {
    Name    = "${var.name}-validator"
    DrillId = var.drill_id
  }
}
