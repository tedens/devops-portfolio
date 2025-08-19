---
title: "AWS Mutli-Account With SSO"
layout: page
permalink: /07-aws-multi-account-sso/
---

This project provisions a centralized IAM access system across multiple AWS accounts using Terraform and AWS Identity Center (SSO). It enables engineers to authenticate in the **management account** and assume scoped roles in the **production account** via `sts:AssumeRole`.

---

### 🔐 Use Case

Cross-account access can quickly become a mess of hardcoded IAM users and shared credentials. This setup eliminates that by managing:

- Role creation and trust relationships across accounts
- SSO-integrated permission sets that map users/groups to IAM roles
- Centralized policy control for engineering roles

---

### ⚙️ Components

- **IAM Roles** in both management and production accounts
- **Trust Policies** allowing management to assume production roles
- **SSO Permission Sets** mapped to IAM roles
- **SSO User/Group Assignments** using `aws_ssoadmin_account_assignment`
- **Terraform remote state** for referencing cross-account ARNs

---

### 📂 Structure

- `management/` — Defines SSO permission sets, source IAM role, and assignments
- `production/` — Defines target IAM role that the management account can assume

---

### 🛠️ Setup Workflow

1. Deploy `production/` stack first:
   - Creates the `EngineerAccess` role
   - Uses a trust policy that initially references the management **account ID**
2. Deploy `management/` stack:
   - Creates the `EngineerIdentity` IAM role
   - Assigns a permission set via AWS SSO
   - Grants that permission set the ability to assume the production role

---

### 📎 Trust Policy Bootstrapping

To avoid circular dependencies between accounts, the initial trust policy in `production/` uses:

    arn:aws:iam::<management-account-id>:root

Once both roles are created, you can optionally tighten the trust to the specific role ARN and re-apply Terraform.

---

### 🔧 Terraform Highlights

- Provider aliasing for `aws.production` and `aws.management`
- IAM role + policy creation for both accounts
- Optional integration with AWS SSO for automated assignments
- Ability to scale to many spoke accounts using remote state or modules

---

This project reflects real-world infrastructure governance challenges in growing organizations, and shows how DevOps can drive secure, automated access without friction.

### 🔗 [View on GitHub](https://github.com/tedens/devops-portfolio/tree/main/07-aws-multi-account-sso)