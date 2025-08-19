# Multi-Account IAM Access Hub with AWS SSO

This project uses Terraform to provision a centralized access control system across multiple AWS accounts. SSO users authenticate via AWS Identity Center (formerly AWS SSO) in the management account and assume roles into the production account using IAM trust policies.

## 🔐 Goals

- Define engineer or team roles once, use them across accounts
- Centrally manage AssumeRole permissions
- Reduce reliance on manual IAM user setup
- Improve auditability and access hygiene

## 📦 Structure

- `management/` — Central SSO-managed IAM roles and policies
- `production/` — Target account AssumeRole role + trust relationship

## 🧠 Components

- `aws_iam_role` for trusted role in the production account
- `aws_iam_role` + `aws_iam_policy` for source role in the management account
- `aws_iam_ssoadmin_assignment` for optional SSO linking (if supported)
- `terraform_remote_state` (optional) to pull role ARNs dynamically

## 🛠 Setup

1. Configure each account with a backend + provider alias
2. Deploy `production/` roles first, including trust policy for management principal
3. Deploy `management/` with SSO assignments + permission policies