output "node_role_arn" {
  value = aws_iam_role.node.arn
}

output "node_instance_profile" {
  description = "Referenced by name in the EC2NodeClass."
  value       = aws_iam_instance_profile.node.name
}

output "controller_role_arn" {
  value = aws_iam_role.controller.arn
}

output "interruption_queue" {
  value = aws_sqs_queue.interruption.name
}

output "discovery_tag" {
  description = "Tag subnets and security groups with karpenter.sh/discovery = this."
  value       = local.discovery_tag
}
