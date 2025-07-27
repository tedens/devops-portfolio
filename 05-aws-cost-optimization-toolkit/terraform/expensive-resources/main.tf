data "aws_caller_identity" "current" {}

variable "scp_name" {
  description = "Name for the SCP"
  type        = string
  default     = "DenyHighCostResources"
}

resource "aws_organizations_organization" "this" {
  feature_set = "ALL"
  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY"
  ]
}

resource "aws_organizations_policy" "deny_high_cost_resources" {
  name        = var.scp_name
  description = "Deny creation of high-cost resources like NAT Gateways, EFS, P4 EC2"

  content = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Deny",
        Action   = [
          "ec2:CreateNatGateway",
          "efs:CreateFileSystem",
          "ec2:RunInstances"
        ],
        Condition = {
          StringEqualsIfExists = {
            "ec2:InstanceType" = [
              "p4d.24xlarge", "u-12tb1.metal"
            ]
          }
        },
        Resource = "*"
      }
    ]
  })
  depends_on = [aws_organizations_organization.this]
}

resource "aws_organizations_policy_attachment" "attach_scp" {
  policy_id = aws_organizations_policy.deny_high_cost_resources.id
  target_id = data.aws_caller_identity.current.account_id
}
