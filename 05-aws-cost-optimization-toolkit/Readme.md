# AWS Cost Optimization Toolkit

This toolkit helps AWS users proactively control and visualize cloud spend. It includes infrastructure, dashboards, and scripts designed to detect idle resources, enforce tagging policies, restrict high-cost services, and track costs in near real-time. All examples are production-ready and built with HIPAA- and SOC2-aligned practices in mind.

## 🔧 Features

- Terraform modules to:
  - Set up budget alerts with email notifications
  - Attach SCPs that block the use of costly resources like NAT Gateways, EFS, and GPU instance types

- Bash scripts to:
  - Detect and optionally tag idle EC2 volumes, snapshots, AMIs, and instances
  - Enforce tagging policies for `owner`, `project`, and `env` with optional CLI values

- CloudWatch dashboard:
  - Visualizes estimated AWS charges by service, account, and region

## 📁 Structure
```
aws-cost-optimization-toolkit/
├── scripts/
│   ├── find-idle-resources.sh
│   └── tag-audit.sh
├── terraform/
│   ├── budget-alerts/
│   │   └── main.tf
│   └── expensive-resources/
│       └── main.tf
│   └── dashboards/
│       └── cloudwatch-cost-dashboard.json
│       └── main.tf
```
## 🚀 Getting Started

### Budget Alerts

```hcl
module "monthly_budget" {
  source  = "../terraform/budget-alerts"
  name    = "MonthlyBudget"
  limit   = 300
  emails  = ["finance@example.com"]
}
```

### Service Control Policy (SCP)

```hcl
module "restrict_resources" {
  source       = "../terraform/restrict-expensive-resources"
  scp_name     = "DenyHighCostResources"
  target_ou_id = data.aws_caller_identity.current.account_id
}
```

### Idle Resource Scanner

```bash
./scripts/find-idle-resources.sh us-east-2 fanout
```

### Tag Audit and Enforcement

```bash
./scripts/tag-audit.sh us-east-2 fanout --owner anthony --project core-platform --env prod
```

## 📊 Dashboard Deployment

Deploy the CloudWatch dashboard with Terraform:

```hcl
resource "aws_cloudwatch_dashboard" "cost_dashboard" {
  dashboard_name = "aws-cost-overview"
  dashboard_body = file("${path.module}/cloudwatch-cost-dashboard.json")
}
```

Then visit the CloudWatch console to view live cost metrics.

## 🔐 Compliance Considerations

- All scripts and policies support HIPAA and SOC 2 alignment by encouraging strict tagging, spend control, and visibility.
- Cost visibility is critical for regulated environments and financial audits.

## 🧠 Author

Anthony Edens  
DevOps Manager | Kubernetes | Terraform | AWS | HIPAA/SOC2  
anthony.edens@outlook.com
