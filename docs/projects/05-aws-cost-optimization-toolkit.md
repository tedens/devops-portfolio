---
title: "AWS Cost Optimization Toolkit"
permalink: /05-aws-cost-optimization-toolkit/
layout: default
---

This project provides a lightweight AWS cost governance toolkit focused on visibility, automation, and enforcement. It includes Bash scripts and dashboards designed to help teams reduce unnecessary cloud spend and enforce good tagging hygiene across AWS environments.

## 🔍 Key Features

- **Tag Audit Script:**  
  Scans AWS resources for missing `owner`, `project`, and `env` tags. Includes a `--fix` mode to auto-apply tags using default values.

- **CloudWatch Dashboards:**  
  Visualize cost-driving services like EC2, EBS, S3, and ALB using prebuilt dashboards deployed via AWS CLI or Terraform.

- **Budget Alerts:**  
  Automate creation of AWS Budgets with email notifications when monthly costs exceed a defined threshold.

- **Optional Slack Alerts:**  
  Integrate with Slack for real-time budget or tag violations.

## 🛠️ Technologies

- Bash  
- AWS CLI  
- CloudWatch  
- Budgets  
- Terraform (optional for dashboard and budget provisioning)

## 🧩 Example Use Case

You’ve got six AWS accounts with various workloads running — and no single view of cost breakdowns or tag compliance. This toolkit gives you a quick way to:

1. Detect untagged resources
2. Visualize usage patterns
3. Alert when things get expensive

## 🚀 Demo

Run the tag audit script:
```bash
./tag-audit.sh --profile fanout --env dev