// The service being delivered. Deliberately dependency-free: the point of
// this project is the delivery mechanism, and an npm tree would add failure
// modes that have nothing to do with it.
//
// Two things matter to the canary analysis and are therefore not decoration:
//
//   /metrics exposes http_requests_total labelled by status class, which is
//   what the AnalysisTemplate queries. Without a label the analysis cannot
//   tell a 500 from a 200 and every canary passes.
//
//   FAIL_RATE is baked into the image at build time, not read from a
//   ConfigMap. The rollback drill ships a genuinely broken artifact rather
//   than flipping a switch on a healthy one, because a rollback that only
//   works against a toggle has not been tested.

const http = require("http");

const VERSION = process.env.BUILD_VERSION || "dev";
const FAIL_RATE = Number(process.env.FAIL_RATE || "0");
const PORT = Number(process.env.PORT || "8080");

// Counters keyed by status class. A histogram would be nicer for latency but
// the analysis here gates on error rate, and an unused histogram is a lie
// about what the dashboard is watching.
const requests = new Map();
const latencies = [];

function record(statusClass, ms) {
  const key = `${statusClass}`;
  requests.set(key, (requests.get(key) || 0) + 1);
  latencies.push(ms);
  if (latencies.length > 1000) latencies.shift();
}

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[i];
}

function metrics() {
  const sorted = [...latencies].sort((a, b) => a - b);
  const lines = [
    "# HELP http_requests_total Requests handled, by status class.",
    "# TYPE http_requests_total counter",
  ];
  for (const [statusClass, count] of [...requests.entries()].sort()) {
    lines.push(
      `http_requests_total{version="${VERSION}",status_class="${statusClass}"} ${count}`
    );
  }
  lines.push(
    "# HELP http_request_duration_seconds Observed latency.",
    "# TYPE http_request_duration_seconds gauge",
    `http_request_duration_seconds{version="${VERSION}",quantile="0.5"} ${(quantile(sorted, 0.5) / 1000).toFixed(4)}`,
    `http_request_duration_seconds{version="${VERSION}",quantile="0.95"} ${(quantile(sorted, 0.95) / 1000).toFixed(4)}`,
    "# HELP build_info Version of the running build.",
    "# TYPE build_info gauge",
    `build_info{version="${VERSION}",fail_rate="${FAIL_RATE}"} 1`
  );
  return lines.join("\n") + "\n";
}

const server = http.createServer((req, res) => {
  const started = Date.now();

  // Probes and the metrics endpoint must never fail, including in the broken
  // build. A broken image whose liveness probe also fails gets killed by the
  // kubelet before the analysis can observe it, and the rollout then looks
  // like a crashloop rather than a failed canary. Those need different fixes,
  // so the drill keeps them distinguishable.
  if (req.url === "/healthz" || req.url === "/readyz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok\n");
  }

  if (req.url === "/metrics") {
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
    return res.end(metrics());
  }

  if (Math.random() < FAIL_RATE) {
    record("5xx", Date.now() - started);
    res.writeHead(500, { "Content-Type": "text/plain" });
    return res.end(`error from ${VERSION}\n`);
  }

  record("2xx", Date.now() - started);
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`hello from ${VERSION}\n`);
});

server.listen(PORT, () => {
  console.log(JSON.stringify({ msg: "listening", port: PORT, version: VERSION, failRate: FAIL_RATE }));
});

// Without this a rolling update waits out terminationGracePeriodSeconds on
// every pod, which makes an abort look slower than it is.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
