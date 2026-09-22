# DevOps Portfolio

**Welcome!** This repository contains my end-to-end **DevOps engineering portfolio**.  
The full site with documentation, diagrams, and project deep-dives is published at:  

[**tedens.github.io/devops-portfolio**](https://tedens.github.io/devops-portfolio/)  

---

## Projects

| #  | Project | Description | Docs |
|----|---------|-------------|------|
| 01 | CI/CD Pipeline | Node.js app with GitHub Actions CI and Docker build/push. | [Docs](https://tedens.github.io/devops-portfolio/01-ci-cd-pipeline/) |
| 02 | Kubernetes Local Env | Demo workloads with Deployment, Service, Ingress. | [Docs](https://tedens.github.io/devops-portfolio/02-k8s-local-env/) |
| 03 | Terraform + Terragrunt | AWS IaC: VPC, EKS, S3, DynamoDB, IAM. | [Docs](https://tedens.github.io/devops-portfolio/03-iac-terraform/) |
| 04 | Monitoring & Logging | Prometheus, Grafana, Loki, Node Exporter via Docker Compose. | [Docs](https://tedens.github.io/devops-portfolio/04-monitoring-logging/) |
| 05 | AWS Cost Toolkit | Scripts to detect idle resources and enforce tagging. | [Docs](https://tedens.github.io/devops-portfolio/05-aws-cost-optimization-toolkit/) |
| 06 | Secrets Rotation | Lambda + Terraform for automated secrets rotation. | [Docs](https://tedens.github.io/devops-portfolio/06-secrets-rotation/) |
| 07 | Multi-Account AWS SSO | Centralised identity and permission sets across an Organization. | [Docs](https://tedens.github.io/devops-portfolio/07-aws-multi-account-sso/) |
| 08 | Zero-Trust SSH | Teleport + Terraform to enforce short-lived SSH certs. | [Docs](https://tedens.github.io/devops-portfolio/08-zero-trust-ssh/) |
| 09 | Karpenter Spot Nodes | Spot-first EKS provisioning with consolidation and an FIS interruption drill. | [Docs](https://tedens.github.io/devops-portfolio/09-karpenter-spot-nodes/) |
| 10 | Automated DR Simulation | Scheduled restore drill that measures RTO/RPO and tears itself down. | [Docs](https://tedens.github.io/devops-portfolio/10-automated-dr-sim/) |
| 11 | ACM Manager | Kubernetes controller automating ACM certs for Ingress. | [Docs](https://tedens.github.io/devops-portfolio/11-acm-manager/) |
| 14 | Seven Niche Business Sites | Seven complete demo sites, one per industry. Live and clickable. | [Docs](https://tedens.github.io/devops-portfolio/14-niche-web-design/) |

----|---------|-------------|------|
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

## Live demos

The seven niche sites in project 14 are served straight from this repo under
[`/demos/`](https://tedens.github.io/devops-portfolio/demos/). They are static
HTML/CSS/JS with no build step, so GitHub Pages copies them verbatim:

| Site | Niche | Demo |
|---|---|---|
| The Lumen | Hotel | [Open](https://tedens.github.io/devops-portfolio/demos/hotel/) |
| Gantry Self Storage | Self storage | [Open](https://tedens.github.io/devops-portfolio/demos/storage/) |
| Hollis Electrical | Electrician | [Open](https://tedens.github.io/devops-portfolio/demos/trades/) |
| Coursefolk | Course marketplace | [Open](https://tedens.github.io/devops-portfolio/demos/courses/) |
| Brindle | Apparel | [Open](https://tedens.github.io/devops-portfolio/demos/clothing/) |
| Juniper Lane | Hair studio | [Open](https://tedens.github.io/devops-portfolio/demos/salon/) |
| Sherry's Dentistry | Dental practice | [Open](https://tedens.github.io/devops-portfolio/demos/dentist/) |

---

## The site itself

`docs/` is a Jekyll site deployed by GitHub Actions to GitHub Pages.

- `_data/projects.yaml` is the **single source of truth**. It drives the
  homepage grid, the `/projects/` filter, the footer and each project page's
  header. Project pages look their metadata up by permalink, so a project is
  described in exactly one place.
- `_layouts/` and `_includes/` hold the chrome; `assets/css/style.css` is the
  whole design system.
- `demos/` holds the seven static sites, untouched by Jekyll.

```bash
# local preview
gem install jekyll jekyll-seo-tag
jekyll serve --source docs
```

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
This portfolio is actively maintained. Every project has working code and documentation; see each project page for what has and has not been run against a live account.