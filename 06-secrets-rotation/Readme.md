# Secrets Rotation Framework

This project demonstrates how to automatically rotate secrets (e.g., API keys, database credentials) using AWS Secrets Manager, Lambda, and Terraform.

## 🔐 Key Features

- Rotates secrets on a fixed schedule or on demand
- Stores secrets securely in AWS Secrets Manager
- Uses Lambda to implement custom rotation logic
- IAM roles scoped with least privilege
- Monitored via CloudWatch + EventBridge

## 📦 Components

- **Terraform** to provision:
  - Secrets Manager secret
  - Rotation Lambda
  - IAM roles + policies
  - EventBridge rule (optional)
- **Python Lambda** to:
  - Generate a new credential
  - Update the secret value
  - Test validity (if needed)

## 📂 Files

- `terraform/` — infrastructure as code
- `lambda/rotate_secret.py` — Lambda rotation handler
- `lambda.zip` — deployment package for Lambda

## 🔐 Example Secret Type

You can rotate:
- AWS credentials
- RDS MySQL or PostgreSQL user passwords
- External API tokens

## 🛠 Setup

```bash
cd terraform
terraform init
terraform apply