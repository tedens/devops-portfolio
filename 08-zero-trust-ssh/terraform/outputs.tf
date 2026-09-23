# What the previous version output, verbatim:
#
#   output "bastion_ssh_command" {
#     value = "ssh ubuntu@${aws_instance.teleport_bastion.public_ip}"
#   }
#
# A project about replacing SSH keys, handing you an SSH command. There is no
# public IP to print now and no key to use with it.

output "proxy_url" {
  description = "Teleport web UI. Also the address tsh logs in against."
  value       = "https://${local.proxy_public_addr}"
}

output "login_command" {
  description = "How an operator gets access. No key material involved; this opens a browser for GitHub SSO and a hardware second factor."
  value       = "tsh login --proxy=${local.proxy_public_addr}:443 --auth=github"
}

output "list_nodes_command" {
  description = "Nodes the logged-in role is allowed to see."
  value       = "tsh ls"
}

output "session_recordings_bucket" {
  description = "Where recordings land. Replay with 'tsh play <session-id>'."
  value       = aws_s3_bucket.recordings.id
}

output "audit_log_group" {
  description = "CloudWatch group carrying the structured audit events."
  value       = aws_cloudwatch_log_group.audit.name
}

output "break_glass_command" {
  description = "For when Teleport itself is the thing that is down. Logged to CloudTrail, needs no inbound rule, and there is still no SSH key."
  value       = "aws ssm start-session --region ${data.aws_region.current.name} --target ${aws_instance.proxy.id}"
}

output "github_oauth_secret_arn" {
  description = "Populate this with client_id, client_secret, organization and team before the SSO connector will be created. Never put those in the repository."
  value       = aws_secretsmanager_secret.github_oauth.arn
}
