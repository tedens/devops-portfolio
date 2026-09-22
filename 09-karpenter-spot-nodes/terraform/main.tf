# Karpenter controller, node identity and interruption handling.
#
# Assumes an EKS cluster already exists (see 03-iac-terraform). This adds the
# pieces Karpenter needs to provision nodes directly against EC2 rather than
# through managed node groups:
#
#   - an IAM role the nodes themselves assume
#   - an IAM role the controller assumes, via EKS Pod Identity
#   - an SQS queue fed by EventBridge, so a two-minute spot notice becomes a
#     graceful drain instead of a hard kill
#
# Spot capacity is the largest single lever on a Kubernetes bill. The reason
# teams avoid it is the failure mode, so the interruption path is the part of
# this project that actually matters.

locals {
  discovery_tag = coalesce(var.discovery_tag, var.cluster_name)
  queue_name    = "karpenter-${var.cluster_name}"
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

data "aws_eks_cluster" "this" {
  name = var.cluster_name
}

# ------------------------------------------------------------- node identity

data "aws_iam_policy_document" "node_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "node" {
  name               = "KarpenterNodeRole-${var.cluster_name}"
  assume_role_policy = data.aws_iam_policy_document.node_assume.json
}

resource "aws_iam_role_policy_attachment" "node" {
  for_each = toset([
    "AmazonEKSWorkerNodePolicy",
    "AmazonEKS_CNI_Policy",
    "AmazonEC2ContainerRegistryReadOnly",
    "AmazonSSMManagedInstanceCore",
  ])

  role       = aws_iam_role.node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/${each.key}"
}

# Karpenter references the profile by name in the EC2NodeClass.
resource "aws_iam_instance_profile" "node" {
  name = "KarpenterNodeInstanceProfile-${var.cluster_name}"
  role = aws_iam_role.node.name
}

# --------------------------------------------------------- controller identity

# Pod Identity rather than IRSA: no OIDC trust policy to maintain and no
# service-account annotation to drift.
data "aws_iam_policy_document" "controller_assume" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "controller" {
  name               = "KarpenterControllerRole-${var.cluster_name}"
  assume_role_policy = data.aws_iam_policy_document.controller_assume.json
}

data "aws_iam_policy_document" "controller" {
  statement {
    sid = "ReadClusterAndEC2Metadata"
    actions = [
      "ec2:DescribeImages", "ec2:DescribeInstances", "ec2:DescribeInstanceTypes",
      "ec2:DescribeInstanceTypeOfferings", "ec2:DescribeLaunchTemplates",
      "ec2:DescribeSecurityGroups", "ec2:DescribeSubnets",
      "ec2:DescribeSpotPriceHistory", "pricing:GetProducts",
      "eks:DescribeCluster", "ssm:GetParameter",
    ]
    resources = ["*"]
  }

  statement {
    sid       = "ManageLaunchTemplates"
    actions   = ["ec2:CreateLaunchTemplate", "ec2:CreateFleet", "ec2:RunInstances", "ec2:CreateTags"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/kubernetes.io/cluster/${var.cluster_name}"
      values   = ["owned"]
    }
  }

  # Scoped to instances this cluster owns, so the controller cannot terminate
  # anything else in the account.
  statement {
    sid       = "TerminateOwnNodes"
    actions   = ["ec2:TerminateInstances", "ec2:DeleteLaunchTemplate"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/kubernetes.io/cluster/${var.cluster_name}"
      values   = ["owned"]
    }
  }

  statement {
    sid       = "PassNodeRole"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.node.arn]
  }

  statement {
    sid       = "ReadInterruptionQueue"
    actions   = ["sqs:DeleteMessage", "sqs:GetQueueUrl", "sqs:ReceiveMessage"]
    resources = [aws_sqs_queue.interruption.arn]
  }
}

resource "aws_iam_role_policy" "controller" {
  name   = "karpenter-controller"
  role   = aws_iam_role.controller.id
  policy = data.aws_iam_policy_document.controller.json
}

resource "aws_eks_pod_identity_association" "karpenter" {
  cluster_name    = var.cluster_name
  namespace       = var.karpenter_namespace
  service_account = "karpenter"
  role_arn        = aws_iam_role.controller.arn
}

# ------------------------------------------------------------- interruption

# A spot reclaim gives two minutes. Without this queue that is a hard kill;
# with it Karpenter cordons, drains and starts a replacement while the pods
# still have somewhere to go.
resource "aws_sqs_queue" "interruption" {
  name                      = local.queue_name
  message_retention_seconds = 300
  sqs_managed_sse_enabled   = true
}

data "aws_iam_policy_document" "interruption_queue" {
  statement {
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.interruption.arn]
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com", "sqs.amazonaws.com"]
    }
  }
}

resource "aws_sqs_queue_policy" "interruption" {
  queue_url = aws_sqs_queue.interruption.url
  policy    = data.aws_iam_policy_document.interruption_queue.json
}

# Every event that means "this node is going away", not just spot.
resource "aws_cloudwatch_event_rule" "interruption" {
  for_each = {
    spot_interruption = { source = ["aws.ec2"], detail-type = ["EC2 Spot Instance Interruption Warning"] }
    rebalance         = { source = ["aws.ec2"], detail-type = ["EC2 Instance Rebalance Recommendation"] }
    state_change      = { source = ["aws.ec2"], detail-type = ["EC2 Instance State-change Notification"] }
    scheduled_change  = { source = ["aws.health"], detail-type = ["AWS Health Event"] }
  }

  name          = "karpenter-${var.cluster_name}-${each.key}"
  event_pattern = jsonencode(each.value)
}

resource "aws_cloudwatch_event_target" "interruption" {
  for_each = aws_cloudwatch_event_rule.interruption

  rule      = each.value.name
  target_id = "KarpenterInterruptionQueue"
  arn       = aws_sqs_queue.interruption.arn
}

# ------------------------------------------------------------------- install

resource "helm_release" "karpenter" {
  name       = "karpenter"
  namespace  = var.karpenter_namespace
  repository = "oci://public.ecr.aws/karpenter"
  chart      = "karpenter"
  version    = var.karpenter_version
  wait       = true

  values = [yamlencode({
    settings = {
      clusterName       = var.cluster_name
      clusterEndpoint   = data.aws_eks_cluster.this.endpoint
      interruptionQueue = aws_sqs_queue.interruption.name
    }
    controller = {
      resources = {
        requests = { cpu = "1", memory = "1Gi" }
        limits   = { memory = "1Gi" }
      }
    }
    # The controller cannot live on nodes it manages, or it deprovisions
    # itself and nothing is left to bring the cluster back.
    replicas = 2
  })]

  depends_on = [
    aws_eks_pod_identity_association.karpenter,
    aws_iam_instance_profile.node,
  ]
}
