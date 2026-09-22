---
title: "Monitoring & Logging Stack with Prometheus, Grafana & Loki"
layout: page
permalink: /04-monitoring-logging/
---

This project sets up a full local observability stack using Docker Compose.

## Tools
- Prometheus
- Grafana
- Loki + Node Exporter

## Features
- System metrics + dashboards
- Preloaded Node Exporter Grafana dashboard (ID 1860)
- Loki log ingestion ready

## Repo Highlights
- `docker-compose.yml`
- `prometheus.yml`, `datasource.yml`, `dashboards.yml`
