resource "aws_cloudwatch_dashboard" "cost_dashboard" {
  dashboard_name = "aws-cost-overview"
  dashboard_body = file("${path.module}/cloudwatch-cost-dashboard.json")
}
