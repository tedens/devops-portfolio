# AWS Terraform Infrastructure Portfolio

This repository showcases a modular AWS infrastructure stack built using Terraform and Terragrunt. It demonstrates provisioning common cloud components using Infrastructure as Code (IaC) practices that are production-ready and reusable across projects.

## Project Structure

```
├── common.tfvars          # Global variables shared across modules
├── terragrunt.hcl         # Root Terragrunt configuration
├── vpc/                   # VPC, subnets, route tables, NAT gateway
├── s3/                    # S3 bucket with versioning
├── dynamodb/              # DynamoDB table (e.g. for Terraform locking)
├── iam/                   # IAM roles and policies
├── rds/                   # PostgreSQL database and security group
└── tf-modules/            # Shared reusable Terraform modules (imported)
```

## Modules Used

This project uses a custom [tf-modules](https://github.com/tedens/tf-modules/tree/main/AWS) repo which defines reusable components for:

- VPC and networking
- S3 buckets
- IAM roles and policies
- RDS database instances
- DynamoDB tables

Each module is configured and deployed independently using Terragrunt, enabling environment-specific isolation.

## Tools & Technologies

- **Terraform**: Infrastructure as Code engine
- **Terragrunt**: DRY wrapper for managing environments and module reuse
- **AWS**: Cloud provider
- **GitHub Actions** (optional): CI/CD automation

## How to Use

1. Clone this repo and ensure you have `terragrunt` and `terraform` installed.
2. Update the `common.tfvars` file with your AWS account details.
3. Run the following from any module folder:

```bash
terragrunt init
terragrunt plan
terragrunt apply
```

To deploy all components at once from the project root dir:

```bash
terragrunt run-all apply
```

> Make sure you configure AWS credentials for Terragrunt to authenticate properly.

## Goals

This portfolio demonstrates the following DevOps skills:

- Modular IaC with Terraform
- Dependency-managed deployments using Terragrunt
- Secure cloud design with IAM, S3, RDS, and networking best practices
- Reusable patterns suitable for production-ready infrastructure
