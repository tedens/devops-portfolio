output "db_endpoint" {
  description = "Address of the restored instance. Private, resolvable only inside the drill VPC."
  value       = aws_db_instance.restored.address
}

output "db_port" {
  value = aws_db_instance.restored.port
}

output "db_identifier" {
  value = aws_db_instance.restored.identifier
}

output "validator_instance_id" {
  description = "Target for aws ssm send-command. The drill script reads this."
  value       = aws_instance.validator.id
}

output "vpc_id" {
  value = aws_vpc.dr.id
}

output "publicly_accessible" {
  description = "Asserted in the drill so a future change cannot quietly expose a restored snapshot."
  value       = aws_db_instance.restored.publicly_accessible
}
