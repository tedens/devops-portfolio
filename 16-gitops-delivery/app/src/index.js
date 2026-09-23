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

// Counters keyed by status class, and a latency histogram.
//
// The histogram replaced a pair of gauge quantiles. Quantiles computed in
// the process cannot be aggregated across pods, so a fleet-wide p95 from
// them is not a p95 of anything. Buckets can be summed, which is what the
// latency SLO in project 18 does. It is used, which is the bar for keeping
// a metric.
const requests = new Map();
const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5];
const bucketCounts = new Array(BUCKETS.length).fill(0);
let durationSum = 0;
let durationCount = 0;

function record(statusClass, ms) {
  const key = `${statusClass}`;
  requests.set(key, (requests.get(key) || 0) + 1);
  const s = ms / 1000;
  for (let i = 0; i < BUCKETS.length; i++) if (s <= BUCKETS[i]) bucketCounts[i]++;
  durationSum += s;
  durationCount++;
}

function metrics() {
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
    "# HELP http_request_duration_seconds Request latency.",
    "# TYPE http_request_duration_seconds histogram"
  );
  for (let i = 0; i < BUCKETS.length; i++) {
    lines.push(
      `http_request_duration_seconds_bucket{version="${VERSION}",le="${BUCKETS[i]}"} ${bucketCounts[i]}`
    );
  }
  lines.push(
    `http_request_duration_seconds_bucket{version="${VERSION}",le="+Inf"} ${durationCount}`,
    `http_request_duration_seconds_sum{version="${VERSION}"} ${durationSum.toFixed(6)}`,
    `http_request_duration_seconds_count{version="${VERSION}"} ${durationCount}`,
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
