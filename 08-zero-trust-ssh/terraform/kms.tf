# One customer-managed key for everything this project writes at rest: the
# root volumes, the audit log group and the session recordings. A single key
# is a deliberate simplification for a demo cluster; separate keys per data
# class are the right answer once more than one team is involved.
resource "aws_kms_key" "teleport" {
  description             = "Teleport session recordings, audit logs and EBS root volumes"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.kms.json
}

resource "aws_kms_alias" "teleport" {
  name          = "alias/${var.cluster_name}"
  target_key_id = aws_kms_key.teleport.key_id
}

data "aws_iam_policy_document" "kms" {
  # The account root statement is what keeps the key administrable. Without it
  # a key can be locked out permanently, and AWS will not recover it for you.
  # It is scoped to kms: rather than being a blanket * on *.
  statement {
    sid       = "AccountAdmin"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  statement {
    sid = "CloudWatchLogs"

    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:Describe*",
    ]

    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["logs.${data.aws_region.current.name}.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:*"]
    }
  }
}
