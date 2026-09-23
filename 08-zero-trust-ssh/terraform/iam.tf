# IAM.
#
# Every policy here names the resources it acts on. The gate treats a policy
# document with Action "*" on Resource "*" as critical, and it is right to:
# an instance profile that can do anything turns a shell on that host into
# control of the account.

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# ---------------------------------------------------------------------------
# Flow logs
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "flow_logs_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "flow_logs" {
  name               = "${var.cluster_name}-flow-logs"
  assume_role_policy = data.aws_iam_policy_document.flow_logs_assume.json
}

data "aws_iam_policy_document" "flow_logs" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]

    resources = ["${aws_cloudwatch_log_group.flow.arn}:*"]
  }
}

resource "aws_iam_role_policy" "flow_logs" {
  name   = "write-flow-logs"
  role   = aws_iam_role.flow_logs.id
  policy = data.aws_iam_policy_document.flow_logs.json
}

# ---------------------------------------------------------------------------
# Proxy and auth service
# ---------------------------------------------------------------------------

resource "aws_iam_role" "proxy" {
  name               = "${var.cluster_name}-proxy"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

data "aws_iam_policy_document" "proxy" {
  # Session recordings. Teleport writes a stream per session and reads it back
  # for replay; it does not need to delete, and it is not given delete. The
  # lifecycle rule on the bucket handles expiry instead, which means an
  # operator cannot erase their own recording from the host.
  statement {
    sid = "SessionRecordings"

    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:ListMultipartUploadParts",
      "s3:AbortMultipartUpload",
    ]

    resources = ["${aws_s3_bucket.recordings.arn}/*"]
  }

  statement {
    sid       = "ListRecordingBucket"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [aws_s3_bucket.recordings.arn]
  }

  statement {
    sid = "AuditLog"

    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]

    resources = ["${aws_cloudwatch_log_group.audit.arn}:*"]
  }

  statement {
    sid       = "GitHubOAuthSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.github_oauth.arn]
  }

  statement {
    sid = "UseTheKey"

    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
    ]

    resources = [aws_kms_key.teleport.arn]
  }
}

resource "aws_iam_role_policy" "proxy" {
  name   = "teleport-proxy"
  role   = aws_iam_role.proxy.id
  policy = data.aws_iam_policy_document.proxy.json
}

# Break-glass. Session Manager is logged to CloudTrail and needs no inbound
# rule, which is the whole reason there is no key pair anywhere in this stack.
resource "aws_iam_role_policy_attachment" "proxy_ssm" {
  role       = aws_iam_role.proxy.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "proxy" {
  name = "${var.cluster_name}-proxy"
  role = aws_iam_role.proxy.name
}

# ---------------------------------------------------------------------------
# Protected node
# ---------------------------------------------------------------------------

resource "aws_iam_role" "node" {
  name               = "${var.cluster_name}-node"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

data "aws_iam_policy_document" "node" {
  statement {
    sid       = "JoinToken"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.join_token.arn]
  }

  statement {
    sid       = "UseTheKey"
    actions   = ["kms:Decrypt"]
    resources = [aws_kms_key.teleport.arn]
  }
}

resource "aws_iam_role_policy" "node" {
  name   = "teleport-node"
  role   = aws_iam_role.node.id
  policy = data.aws_iam_policy_document.node.json
}

resource "aws_iam_role_policy_attachment" "node_ssm" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "node" {
  name = "${var.cluster_name}-node"
  role = aws_iam_role.node.name
}
