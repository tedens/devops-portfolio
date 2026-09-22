---
title: "Kubernetes Local Environment with Docker Desktop"
layout: page
permalink: /02-k8s-local-env/
---

This project sets up a microservice in Kubernetes using Docker Desktop as the local K8s cluster.

## Tools
- Docker Desktop
- Kubernetes (kubectl)
- Ingress + Service + Deployment manifests

## Features
- Local image build and deploy
- Ingress routing via `demo.local`
- Uses Node.js app from previous project

## Repo Highlights
- `k8s/app-deployment.yaml`
- `k8s/ingress.yaml`
- `src/index.js`
