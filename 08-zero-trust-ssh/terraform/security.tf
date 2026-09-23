# Security groups.
#
# What changed from the previous version, and why it mattered: that one opened
# 22, 443 and 3023-3026 to 0.0.0.0/0 on a project named for zero trust, and
# handed the instance an SSH key pair on top. Port 22 is now absent from this
# file entirely. Teleport multiplexes SSH, the web UI and the reverse tunnel
# onto a single TLS port, so 3023-3026 are not needed from outside either.
#
# Rules are separate resources rather than inline blocks. An inline ingress
# block is authoritative for the whole group: adding one by hand later silently
# deletes the rest on the next apply.

resource "aws_security_group" "lb" {
  name        = "${var.cluster_name}-lb"
  description = "Public entry point. TLS only."
  vpc_id      = aws_vpc.teleport.id

  tags = { Name = "${var.cluster_name}-lb" }
}

resource "aws_vpc_security_group_ingress_rule" "lb_https" {
  for_each = toset(var.allowed_web_cidrs)

  security_group_id = aws_security_group.lb.id
  description       = "Teleport web UI, tsh and the reverse tunnel, all over TLS"
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "lb_to_proxy" {
  security_group_id            = aws_security_group.lb.id
  description                  = "Forward to the proxy only"
  referenced_security_group_id = aws_security_group.proxy.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}

# ---------------------------------------------------------------------------

resource "aws_security_group" "proxy" {
  name        = "${var.cluster_name}-proxy"
  description = "Teleport proxy and auth service. Private subnet, no public address."
  vpc_id      = aws_vpc.teleport.id

  tags = { Name = "${var.cluster_name}-proxy" }
}

resource "aws_vpc_security_group_ingress_rule" "proxy_from_lb" {
  security_group_id            = aws_security_group.proxy.id
  description                  = "TLS from the load balancer"
  referenced_security_group_id = aws_security_group.lb.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}

resource "aws_vpc_security_group_ingress_rule" "proxy_from_nodes" {
  security_group_id            = aws_security_group.proxy.id
  description                  = "Agents dialling out to establish their reverse tunnel"
  referenced_security_group_id = aws_security_group.node.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}

# ACME, the Teleport package repository and the GitHub OAuth endpoint are all
# HTTPS. Nothing here needs arbitrary outbound, so it does not get it: the
# previous group allowed protocol "-1" to 0.0.0.0/0.
resource "aws_vpc_security_group_egress_rule" "proxy_https" {
  security_group_id = aws_security_group.proxy.id
  description       = "ACME, package repo, GitHub OAuth, AWS APIs"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "proxy_dns" {
  security_group_id = aws_security_group.proxy.id
  description       = "DNS to the VPC resolver"
  cidr_ipv4         = var.vpc_cidr
  ip_protocol       = "udp"
  from_port         = 53
  to_port           = 53
}

# ---------------------------------------------------------------------------

resource "aws_security_group" "node" {
  name        = "${var.cluster_name}-node"
  description = "Protected workload. No ingress rules at all, by design."
  vpc_id      = aws_vpc.teleport.id

  tags = { Name = "${var.cluster_name}-node" }
}

# There is deliberately no aws_vpc_security_group_ingress_rule for this group.
# The agent dials the proxy and holds the connection open, so an operator's
# session arrives back down a socket the node itself opened. Nothing needs to
# reach the node from outside, including the proxy, including you.

resource "aws_vpc_security_group_egress_rule" "node_https" {
  security_group_id = aws_security_group.node.id
  description       = "Reverse tunnel to the proxy, AWS APIs, package repo"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "node_dns" {
  security_group_id = aws_security_group.node.id
  description       = "DNS to the VPC resolver"
  cidr_ipv4         = var.vpc_cidr
  ip_protocol       = "udp"
  from_port         = 53
  to_port           = 53
}

# ---------------------------------------------------------------------------

resource "aws_security_group" "endpoints" {
  name        = "${var.cluster_name}-endpoints"
  description = "Interface endpoints for SSM, CloudWatch Logs and KMS."
  vpc_id      = aws_vpc.teleport.id

  tags = { Name = "${var.cluster_name}-endpoints" }
}

resource "aws_vpc_security_group_ingress_rule" "endpoints_from_proxy" {
  security_group_id            = aws_security_group.endpoints.id
  referenced_security_group_id = aws_security_group.proxy.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}

resource "aws_vpc_security_group_ingress_rule" "endpoints_from_node" {
  security_group_id            = aws_security_group.endpoints.id
  referenced_security_group_id = aws_security_group.node.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}
