# The proxy and one protected node.
#
# Neither instance has a public IP, a key pair, or an inbound SSH rule. That
# is the entire claim this project makes, so it is worth being precise about
# how each one is reached:
#
#   operator -> NLB (443) -> proxy -> reverse tunnel -> node
#
# The tunnel is dialled outbound by the node. Break-glass, for when Teleport
# itself is the thing that is broken, is SSM Session Manager over the VPC
# interface endpoints, which is logged to CloudTrail and also needs no
# inbound rule.

locals {
  ami_id = nonsensitive(data.aws_ssm_parameter.al2023.value)

  proxy_public_addr = var.public_dns_name != "" ? var.public_dns_name : aws_lb.teleport.dns_name
}

resource "aws_instance" "proxy" {
  ami                    = local.ami_id
  instance_type          = var.proxy_instance_type
  subnet_id              = aws_subnet.private[0].id
  vpc_security_group_ids = [aws_security_group.proxy.id]
  iam_instance_profile   = aws_iam_instance_profile.proxy.name

  # No key_name. There is no key pair in this stack to name.

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"

    # A hop limit of 1 stops a container on this host from reaching the
    # instance credentials, which is what turns an application bug into an
    # AWS one.
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    encrypted             = true
    kms_key_id            = aws_kms_key.teleport.arn
    delete_on_termination = true
  }

  user_data_replace_on_change = true

  user_data = templatefile("${path.module}/templates/proxy-user-data.sh.tftpl", {
    teleport_version  = var.teleport_version
    cluster_name      = var.cluster_name
    public_addr       = local.proxy_public_addr
    acme_enabled      = var.public_dns_name != ""
    acme_email        = var.acme_email
    region            = data.aws_region.current.name
    recordings_bucket = aws_s3_bucket.recordings.id
    audit_log_group   = aws_cloudwatch_log_group.audit.name
    github_secret_arn = aws_secretsmanager_secret.github_oauth.arn
    join_token_arn    = aws_secretsmanager_secret.join_token.arn

    # The roles live as reviewable YAML in teleport/roles/ and are written to
    # the host from there, so the file in the repository is the one that runs.
    ssh_operator_role = file("${path.module}/../teleport/roles/ssh-operator.yaml")
    auditor_role      = file("${path.module}/../teleport/roles/auditor.yaml")
  })

  tags = { Name = "${var.cluster_name}-proxy" }

  depends_on = [aws_nat_gateway.teleport]
}

resource "aws_instance" "node" {
  ami                    = local.ami_id
  instance_type          = var.node_instance_type
  subnet_id              = aws_subnet.private[1].id
  vpc_security_group_ids = [aws_security_group.node.id]
  iam_instance_profile   = aws_iam_instance_profile.node.name

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    encrypted             = true
    kms_key_id            = aws_kms_key.teleport.arn
    delete_on_termination = true
  }

  user_data_replace_on_change = true

  user_data = templatefile("${path.module}/templates/node-user-data.sh.tftpl", {
    teleport_version = var.teleport_version
    proxy_addr       = local.proxy_public_addr
    region           = data.aws_region.current.name
    join_token_arn   = aws_secretsmanager_secret.join_token.arn
  })

  tags = { Name = "${var.cluster_name}-node" }

  depends_on = [aws_instance.proxy]
}

# ---------------------------------------------------------------------------
# Load balancer
#
# A network load balancer passing TLS through untouched. Terminating TLS here
# would mean the proxy could no longer see the client certificate, which is
# how Teleport authenticates tsh.
# ---------------------------------------------------------------------------

resource "aws_lb" "teleport" {
  name               = "${var.cluster_name}-proxy"
  load_balancer_type = "network"
  internal           = false
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.lb.id]

  enable_deletion_protection       = true
  enable_cross_zone_load_balancing = true

  access_logs {
    bucket  = aws_s3_bucket.access_logs.id
    prefix  = "nlb"
    enabled = true
  }

  tags = { Name = "${var.cluster_name}-proxy" }
}

resource "aws_lb_target_group" "proxy" {
  name        = "${var.cluster_name}-proxy"
  port        = 443
  protocol    = "TCP"
  vpc_id      = aws_vpc.teleport.id
  target_type = "instance"

  health_check {
    protocol            = "HTTPS"
    path                = "/webapi/ping"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
  }

  deregistration_delay = 30
}

resource "aws_lb_target_group_attachment" "proxy" {
  target_group_arn = aws_lb_target_group.proxy.arn
  target_id        = aws_instance.proxy.id
  port             = 443
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.teleport.arn
  port              = 443
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.proxy.arn
  }
}
