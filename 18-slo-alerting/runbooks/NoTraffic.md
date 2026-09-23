# NoTraffic

**Severity:** ticket. **Means:** demo-service pods are up and being scraped,
and have served no requests for ten minutes.

The error-budget alerts are silent in this state by design: no requests
means no error ratio, and a division by zero must not read as 0% errors.
This alert owns the case instead.

## What to do

1. Is anything supposed to be calling it? In this cluster the load generator
   is.
   ```
   kubectl -n demo get deploy loadgen
   kubectl -n demo logs deploy/loadgen --tail=20
   ```
2. Is traffic going to the wrong Service? Project 16 has three Services over
   this workload; only `demo-service` selects every pod.
   ```
   kubectl -n demo get endpointslice -l kubernetes.io/service-name=demo-service
   ```
3. If the quiet is expected (maintenance, a scheduled window), exclude it
   from the SLO calculation rather than counting it as success.
