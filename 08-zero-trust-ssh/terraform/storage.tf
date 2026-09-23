# Session recordings and the audit trail.
#
# Teleport's recordings are the reason this project exists: they are the
# evidence that answers "who ran what on that host, and when". That makes the
# bucket holding them a HIPAA 164.312(b) artefact, so it gets versioning,
# object lock, a CMK and an access log of its own.

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "recordings" {
  bucket = "${var.cluster_name}-recordings-${random_id.suffix.hex}"

  # Recordings are evidence. Refusing to destroy the bucket with objects in it
  # is the point, not an inconvenience.
  force_destroy = false

  # Object lock has to be enabled at creation; it cannot be added later.
  object_lock_enabled = true
}

resource "aws_s3_bucket_versioning" "recordings" {
  bucket = aws_s3_bucket.recordings.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Governance mode rather than compliance mode: an account administrator with
# BypassGovernanceRetention can still remove an object, which is what you want
# while nobody has yet been trained on what compliance mode means. Switch to
# COMPLIANCE once retention is a policy rather than an experiment.
resource "aws_s3_bucket_object_lock_configuration" "recordings" {
  bucket = aws_s3_bucket.recordings.id

  rule {
    default_retention {
      mode = "GOVERNANCE"
      days = 30
    }
  }

  depends_on = [aws_s3_bucket_versioning.recordings]
}

resource "aws_s3_bucket_server_side_encryption_configuration" "recordings" {
  bucket = aws_s3_bucket.recordings.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.teleport.arn
    }

    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "recordings" {
  bucket = aws_s3_bucket.recordings.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "recordings" {
  bucket = aws_s3_bucket.recordings.id

  rule {
    id     = "expire-recordings"
    status = "Enabled"

    filter {}

    expiration {
      days = var.session_recording_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.recordings]
}

resource "aws_s3_bucket_logging" "recordings" {
  bucket        = aws_s3_bucket.recordings.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "recordings/"
}

data "aws_iam_policy_document" "recordings" {
  statement {
    sid       = "DenyPlaintextTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.recordings.arn, "${aws_s3_bucket.recordings.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "recordings" {
  bucket = aws_s3_bucket.recordings.id
  policy = data.aws_iam_policy_document.recordings.json

  depends_on = [aws_s3_bucket_public_access_block.recordings]
}

# ---------------------------------------------------------------------------
# Access log bucket
#
# It logs to itself. That looks odd, and it is what AWS supports: a log bucket
# cannot point at a bucket that points back at it, and leaving it unlogged
# would mean the one bucket recording access to the evidence has no record of
# access to itself.
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "access_logs" {
  bucket        = "${var.cluster_name}-access-logs-${random_id.suffix.hex}"
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 server access logging cannot write to a bucket encrypted with a customer
# managed key; the log delivery principal has no grant on it. SSE-S3 is the
# supported option, and the contents are request metadata rather than session
# content.
resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_logging" "access_logs" {
  bucket        = aws_s3_bucket.access_logs.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "self/"
}

resource "aws_s3_bucket_lifecycle_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    id     = "expire-access-logs"
    status = "Enabled"

    filter {}

    expiration {
      days = var.log_retention_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.access_logs]
}

data "aws_iam_policy_document" "access_logs" {
  statement {
    sid       = "AllowLogDelivery"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.access_logs.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["logging.s3.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid       = "DenyPlaintextTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.access_logs.arn, "${aws_s3_bucket.access_logs.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  policy = data.aws_iam_policy_document.access_logs.json

  depends_on = [aws_s3_bucket_public_access_block.access_logs]
}

# ---------------------------------------------------------------------------
# Audit events and secrets
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/teleport/${var.cluster_name}/audit"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.teleport.arn
}

# The old github-sso.yaml carried client_id and client_secret inline in a file
# in this repository. Placeholders, but the shape teaches the wrong habit: the
# first person to fill them in commits a live OAuth secret. The connector is
# now rendered on the host from this secret, which is never in git.
resource "aws_secretsmanager_secret" "github_oauth" {
  name                    = "${var.cluster_name}/github-oauth"
  description             = "GitHub OAuth app credentials for the Teleport SSO connector"
  kms_key_id              = aws_kms_key.teleport.arn
  recovery_window_in_days = 30
}

# The join token authorises a node to enter the cluster. Generated here so it
# is never typed, never echoed and never lands in a shell history.
resource "random_password" "join_token" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "join_token" {
  name                    = "${var.cluster_name}/join-token"
  description             = "Teleport node join token"
  kms_key_id              = aws_kms_key.teleport.arn
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "join_token" {
  secret_id     = aws_secretsmanager_secret.join_token.id
  secret_string = random_password.join_token.result
}
