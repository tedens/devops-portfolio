variable "name" {
  description = "Name of the budget"
  type        = string
  default     = "MonthlyBudget"
}

variable "limit" {
  description = "Monthly budget amount in USD"
  type        = number
  default     = 100
}

variable "emails" {
  description = "List of email addresses to notify"
  type        = list(string)
  default     = ["email@example.com"]
}

resource "aws_sns_topic" "budget_alerts" {
  name = "${var.name}-budget-alerts"
}

resource "aws_sns_topic_subscription" "email_subscriptions" {
  for_each = toset(var.emails)

  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_budgets_budget" "monthly_budget" {
  name              = var.name
  budget_type       = "COST"
  time_unit         = "MONTHLY"

  limit_amount      = var.limit
  limit_unit        = "USD"

  cost_types {
    include_credit             = true
    include_discount           = true
    include_other_subscription = true
    include_recurring          = true
    include_refund             = false
    include_subscription       = true
    include_support            = true
    include_tax                = true
    include_upfront            = true
    use_amortized              = false
    use_blended                = false
  }

  time_period_start = formatdate("2025-01-01_00:00", timestamp())

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.emails
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }
}
