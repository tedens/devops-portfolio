variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "cluster_name" {
  description = "Existing EKS cluster Karpenter will provision nodes for."
  type        = string
}

variable "karpenter_version" {
  description = "Karpenter chart version. Pinned, because the CRDs move between minors."
  type        = string
  default     = "1.0.8"
}

variable "karpenter_namespace" {
  type    = string
  default = "kube-system"
}

variable "discovery_tag" {
  description = <<-EOT
    Value of the karpenter.sh/discovery tag on the subnets and security groups
    Karpenter should use. Usually the cluster name. Nodes land wherever this
    tag is, so it is the single most important thing to get right.
  EOT
  type        = string
  default     = null
}
