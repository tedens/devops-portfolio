output "dr_db_endpoint" {
  value = aws_db_instance.dr_rds.endpoint
}

output "dr_db_identifier" {
  value = aws_db_instance.dr_rds.id
}