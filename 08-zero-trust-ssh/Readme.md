# Zero Trust SSH Access with Teleport

This project demonstrates how to deploy a secure SSH gateway using Teleport, enabling short-lived certificate authentication and full session auditing.

## 🔐 Why Zero Trust?

Static SSH keys are risky and hard to manage. This solution eliminates long-lived keys by issuing short-term access certificates and enforcing authentication via trusted identity providers.

## 🎯 Features

- SSH access via short-lived certificates (no permanent keys)
- Role-based access control (RBAC) for users and nodes
- Session recording and replay
- GitHub/SSO login integration
- Deployed to AWS EC2 in a private subnet (bastion model)

## 🛠 Components

- **Teleport OSS** — Open-source version of Teleport running on an EC2 instance
- **Terraform** — Provisions the EC2 instance and VPC (if needed)
- **SSO Setup (Optional)** — GitHub SSO configuration included

## 📂 Project Structure

```
08-zero-trust-ssh/
├── terraform/          # EC2 and security group for Teleport
├── teleport/           # Config files and github sso connector
└── README.md
```

## 🚀 Setup

1. Deploy infrastructure:
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

2. SSH into the instance and install Teleport:
   ```bash
   # From your laptop
   ssh ubuntu@<public-ip>

   # On the EC2 instance
   curl https://get.gravitational.com/teleport.tar.gz | tar -xz
   sudo ./install
   ```

3. Configure `teleport.yaml`:
   ```bash
   sudo cp ~/teleport/teleport.yaml /etc/teleport/
   sudo teleport start
   ```

4. Access the Teleport Web UI and connect with GitHub SSO.

## 🧪 Example Use Cases

- Session recording for HIPAA/SOC2 audit trails
- SSO-controlled ephemeral SSH access
- Multi-team node access controls via roles

## 📚 Learn More

- https://goteleport.com/docs/
