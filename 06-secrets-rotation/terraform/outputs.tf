output "secret_arn" {
  value = aws_secretsmanager_secret.rotating_secret.arn
}

output "lambda_name" {
  value = aws_lambda_function.rotator.function_name
}