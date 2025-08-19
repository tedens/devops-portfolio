provider "aws" {
  alias   = "mgmt"
  region  = var.region
  profile = "management"
}

resource "aws_iam_role" "engineer_identity" {
  provider           = aws.mgmt
  name               = "EngineerIdentity"
  assume_role_policy = data.aws_iam_policy_document.identity_assume.json
}

data "aws_iam_policy_document" "identity_assume" {
  statement {
    effect    = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.account_id}:root"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_policy" "assume_prod" {
  provider = aws.mgmt
  name     = "AssumeProductionAccess"

  policy = data.aws_iam_policy_document.assume_prod.json
}

data "aws_iam_policy_document" "assume_prod" {
  statement {
    effect = "Allow"
    actions = ["sts:AssumeRole"]
    resources = [var.prod_role_arn]
  }
}

resource "aws_iam_role_policy_attachment" "attach" {
  provider   = aws.mgmt
  role       = aws_iam_role.engineer_identity.name
  policy_arn = aws_iam_policy.assume_prod.arn
}