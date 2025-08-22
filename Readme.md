# DevOps Portfolio

**Welcome!** This repository contains my end-to-end **DevOps engineering portfolio**.  
The full site with documentation, diagrams, and project deep-dives is published at:  

[**tedens.github.io/devops-portfolio**](https://tedens.github.io/devops-portfolio/)  

---

## Projects

| #  | Project | Description | Docs |
|----|---------|-------------|------|
| 01 | CI/CD Pipeline | Node.js app with GitHub Actions CI and Docker build/push. | [Docs](https://tedens.github.io/devops-portfolio/01-ci-cd-pipeline) |
| 02 | Kubernetes Local Env | Demo workloads with Deployment, Service, Ingress. | [Docs](https://tedens.github.io/devops-portfolio/02-k8s-local-env) |
| 03 | Terraform + Terragrunt | AWS IaC: VPC, EKS, S3, DynamoDB, IAM. | [Docs](https://tedens.github.io/devops-portfolio/03-iac-terraform) |
| 04 | Monitoring & Logging | Prometheus, Grafana, Loki, Node Exporter via Docker Compose. | [Docs](https://tedens.github.io/devops-portfolio/04-monitoring-logging) |
| 05 | AWS Cost Toolkit | Scripts to detect idle resources and enforce tagging. | [Docs](https://tedens.github.io/devops-portfolio/05-aws-cost-optimization-toolkit) |
| 06 | Secrets Rotation | Lambda + Terraform for automated secrets rotation. | [Docs](https://tedens.github.io/devops-portfolio/06-secrets-rotation) |
| 08 | Zero-Trust SSH | Teleport + Terraform to enforce short-lived SSH certs. | [Docs](https://tedens.github.io/devops-portfolio/08-zero-trust-ssh) |
| 09 | Karpenter Spot Nodes | Cluster autoscaling with spot instance provisioning. | [Docs](https://tedens.github.io/devops-portfolio/09-karpenter-spot-nodes) |
| 10 | Automated DR Simulation | Chaos test scripts for recovery & failover scenarios. | [Docs](https://tedens.github.io/devops-portfolio/10-automated-dr-sim) |

---

## Tech Stack & Assumptions
- **Cloud**: AWS (us-east-2)
- **Cluster**: EKS 1.32 (latest stable)
- **Container Registry**: ECR
- **CI/CD**: GitHub Actions + Jenkins (where noted)
- **Secrets**: Vault (app secrets), GitHub Secrets (deploy keys)
- **IaC**: Terraform + Terragrunt
- **Languages**: Node.js, Python, Bash

---

## Usage
Each project folder contains:
- Code/configuration
- Docker/K8s manifests or Terraform
- Local run instructions in its `Readme.md`

For detailed guides and screenshots, see the [documentation site](https://tedens.github.io/devops-portfolio/).

---

## Status
This portfolio is actively maintained. Some projects are **demo-ready**, others are **WIP** (see project docs for details).