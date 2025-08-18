---
title: "Automated Secret Rotation"
layout: page
permalink: /06-secrets-rotation/
---

This project implements a fully automated secret rotation pipeline using AWS Secrets Manager, Lambda, and Terraform.

### 🔐 Use Case

Secrets like database passwords or API keys shouldn't live forever. This framework ensures secrets are rotated, tested, and promoted automatically — without needing human approval or external systems.

### ⚙️ Tech Stack

- **AWS Secrets Manager** — Secure secret storage and rotation engine  
- **AWS Lambda (Python)** — Custom rotation handler implementing AWS's lifecycle  
- **Terraform** — Infrastructure as code for deployment  
- **IAM** — Scoped roles for least-privilege security  
- **CloudWatch** — Logs for auditability  

### ✅ Rotation Lifecycle

The Lambda implements the four AWS rotation steps:

1. `createSecret` – Generates a new secret
2. `setSecret` – (Optional) Apply new secret to your service
3. `testSecret` – (Optional) Validate secret works
4. `finishSecret` – Promote to `AWSCURRENT`

### 📂 Folder Highlights

- `lambda/main.py` — Python function to generate and store new credentials  
- `terraform/` — Provisions secret, Lambda, IAM, and rotation schedule  

### 🚀 Deployment

```bash
cd lambda
zip ../terraform/lambda.zip main.py

cd ../terraform
terraform init
terraform apply
```

### Testing Rotation

Test by manually triggering a secret rotation and watch the cloudwatch logs.

```bash
aws secretsmanager rotate-secret --secret-id auto-rotated-secret
```