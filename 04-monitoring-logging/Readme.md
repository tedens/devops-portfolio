# Monitoring & Logging Stack Demo

This project sets up Prometheus + Grafana + Node Exporter + Loki using Docker Compose.

## 🔧 Services
- **Prometheus** – collects and stores metrics
- **Grafana** – visualizes metrics & logs
- **Node Exporter** – exposes host-level metrics
- **Loki** – stores and queries logs

## 🚀 How to Run
```bash
cd 04-monitoring-logging
docker-compose up -d
```

## 📊 Access Interfaces
- Grafana: http://localhost:3000 (login: `admin` / `admin`)
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100 (API only)

## 📦 Notes
- Prebuilt Grafana dashboard (ID 1860) is auto-loaded
- Loki is ready as a data source but you must forward logs to it (e.g., via Promtail or vector)
- Optional: Add Promtail or a sample app writing logs to stdout for full end-to-end ingestion

---

Next steps:
- Add Promtail or vector to forward app logs to Loki
- Build a Grafana dashboard to query and visualize logs