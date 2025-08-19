provider "aws" {
  alias  = "prod"
  region = var.region
  profile = "production"
}

resource "aws_iam_role" "engineer_access" {
  provider           = aws.prod
  name               = "EngineerAccess"
  assume_role_policy = data.aws_iam_policy_document.trust_management.json
}

data "aws_iam_policy_document" "trust_management" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [var.management_role_arn]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role_policy_attachment" "readonly" {
  provider   = aws.prod
  role       = aws_iam_role.engineer_access.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}