---
title: "Zero-Trust SSH Access"
layout: page
permalink: /08-zero-trust-ssh/
---

This project implements a modern, zero-trust SSH gateway using Teleport, replacing traditional SSH key-based access with short-lived certificates, GitHub SSO integration, and full session audit logging to CloudWatch.

### 🔐 Use Case

Managing long-lived SSH keys at scale is error-prone and insecure. This project demonstrates how to eliminate static credentials entirely, enforce role-based access with your GitHub org, and maintain audit compliance through real-time log forwarding.

---

### ⚙️ Components

- Teleport OSS: Access proxy, SSH server, and certificate authority all in one
- Terraform: Provisions a secure VPC, subnet, security group, and EC2 bastion
- GitHub SSO: Short-lived cert issuance with role mapping via GitHub teams
- CloudWatch Logs: Session logs and audit trails streamed for compliance

---

### 📂 Project Structure

- terraform/: Infrastructure code for VPC, EC2, and security group
- teleport.yaml: Main configuration file enabling auth, proxy, and SSH services
- github-connector.yaml: GitHub OAuth and team-to-role mapping
- roles/: (Optional) Custom Teleport roles and RBAC definitions

---

### 🛠 Setup Steps

1. Deploy infrastructure with Terraform:

```bash
cd terraform
terraform init
terraform apply
```
2. Install Teleport on the bastion host:

```bash
curl https://get.gravitational.com/teleport.tar.gz | tar -xz
sudo ./install
```
3. Configure and run Teleport:

```bash
sudo cp teleport.yaml /etc/teleport/teleport.yaml
sudo teleport start
```
4. Create GitHub connector:

```bash
sudo tctl create -f github-connector.yaml
```
5. Login via web UI:

Open https://<bastion-public-ip>/ and authenticate with GitHub

---

### ✅ Security & Audit Features

- No static SSH keys
- GitHub SSO for identity and role mapping
- Short-lived access certificates
- Session recording + audit log streaming to CloudWatch
- IAM-scoped instance permissions for minimal surface

---

### 📚 Extend This Project

- Enable S3 archiving for long-term session log storage
- Set up per-node RBAC with label matching
- Integrate with Okta or another OIDC provider
- Deploy a multi-node Teleport cluster (proxy + auth + nodes)
- Automate deployment with userdata or Ansible

---

This project reflects a shift toward secure, scalable access control in production-grade environments, with a focus on visibility, traceability, and audit readiness.

### 🔗 [View on GitHub](https://github.com/tedens/devops-portfolio/tree/main/08-zero-trust-ssh)
