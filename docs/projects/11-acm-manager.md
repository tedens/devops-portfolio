---
title: "ACM Manager (Ingress-based Certificate Automation)"
layout: page
permalink: /11-acm-manager/
---

This project introduces **acm-manager**, a Kubernetes controller that automates the provisioning of AWS ACM public certificates and ties them to Ingress resources managed by the AWS Load Balancer Controller.

###  Use Case

Securing Ingress traffic typically requires manual ACM certificate provisioning and annotation. ACM Manager removes that friction by watching for certificate spec annotations and automating the full lifecycle (ACM issuance + Route53 DNS validation, Ingress annotation).

---

###  Tech Stack

- **Kubernetes Controller** written in Go
- **AWS ACM** for public TLS certificates
- **AWS Load Balancer Controller** for ALB integration
- **AWS Route53** for DNS validation

---

###  Highlights

- Automatically requests ACM certificates based on Ingress specs
- Applies necessary annotations to make AWS ALBs pick up the certs
- Simplifies Ingress TLS configuration with minimal operational overhead

---

###  Example Workflow

1. Deploy `acm-manager` in your cluster  
2. Label or annotate your Ingress resources to trigger cert creation  
3. ACM Manager watches for updates, issues a public certificate via ACM
4. Creates necessary Route53 records for quick DNS validation  
4. Annotates Ingress for AWS Load Balancer Controller to attach TLS 
5. Certificate auto-renewal is handled upon ingress changes or near expiration

---

###  Why It Matters

- **Infrastructure as Code for TLS**—no more manual AWS console steps  
- **Automated, secure ingress traffic** setups  
- Great example of extending Kubernetes declaratively to consume AWS services


### 🔗 [View on GitHub](https://github.com/tedens/acm-manager)