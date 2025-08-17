---
title: "Infrastructure as Code (Terraform + AWS)"
layout: page
permalink: /03-iac-terraform/
---

This project showcases a fully modular, production-grade Infrastructure as Code setup using **Terraform** and **Terragrunt** to provision cloud infrastructure across AWS.

## Overview

I built this project to demonstrate reusable and scalable Terraform modules, all wrapped in a Terragrunt folder structure that supports multiple environments (`dev`, `staging`, `prod`). It features best practices for separating concerns, minimizing duplication, and enabling team-friendly collaboration.

## Tools & Technologies

- **Terraform**: Declarative cloud resource provisioning
- **Terragrunt**: DRY wrapper for managing multiple Terraform modules
- **AWS**:
  - VPC
  - S3 (Terraform state + app storage)
  - DynamoDB (state locking)
  - IAM (users, policies, roles)
  - RDS (PostgreSQL)
- **Remote state with locking**: Local backend configured via Terragrunt, with S3 + DynamoDB available as remote alternative

## Architecture

The structure follows a per-module layout:
```markdown
/03-iac-terraform/
├── terragrunt.hcl
├── common.tfvars
├── vpc/
│ └── main.tf
│ └── variables.tf
│ └── terrragrunt.hcl
├── s3/
│ └── main.tf
├── dynamodb/
│ └── main.tf
├── iam/
│ └── main.tf
├── rds/
│ ├── main.tf
```

Each directory represents a logical layer, sourced from my centralized [`tf-modules`](https://github.com/tedens/tf-modules) repository to ensure consistency across environments and projects.

## Highlights

- **Terragrunt DRY strategy**:
  - Global `common.tfvars` file shared across modules
  - Shared remote state and providers injected via `generate` blocks
- **Modular TF code**:
  - Reusable modules (e.g. VPC, RDS, IAM) designed for clean inputs/outputs
- **Security groups scoped to RDS**
  - Created locally within the RDS module for flexibility
- **Environment and Project tagging**
  - Consistent tag structure using `project_name` and `env` on all resources

## Deployment

```bash
cd 03-iac-terraform
terragrunt run-all init
terragrunt run-all plan
terragrunt run-all apply
```

### 🔗 [View on GitHub](https://github.com/tedens/devops-portfolio/tree/main/03-iac-terraform)