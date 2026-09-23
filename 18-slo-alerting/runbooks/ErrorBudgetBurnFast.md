# ErrorBudgetBurnFast

**Severity:** page. **Means:** demo-service is spending its 30-day error
budget at 14.4x (over 1h) or 6x (over 6h) the sustainable rate. At 14.4x the
whole month's budget is gone in about two days. The `slo` label says which
SLO: `availability` (5xx responses) or `latency` (requests over 250ms).

## First five minutes

1. Confirm it is still happening. The alert requires the short window (5m or
   30m) to agree, so if it is firing, it is current.
   ```
   slo:sli_error:ratio_rate5m{service="demo-service"}
   ```
2. Find which version is failing. Errors carry the build version.
   ```
   sum by (version) (rate(http_requests_total{app="demo-service",status_class="5xx"}[5m]))
   ```
3. If one version dominates and it is the newer one, a rollout is in
   progress or just finished. Argo Rollouts should already have aborted a
   canary; check whether it did.
   ```
   kubectl -n demo get rollout demo-service
   kubectl -n demo get analysisrun
   ```
   If the rollout is `Degraded` the abort worked and stable pods are serving;
   the burn should already be falling. If it is `Healthy` on the bad version,
   the canary passed and the fault is full-fleet: roll back.
   ```
   kubectl -n demo argo rollouts undo demo-service    # or set the image back and let Argo CD sync
   ```

## If no single version is at fault

Dependencies, node pressure, or the load generator. Check `ServiceDown` and
`NoTraffic` are not also firing; check node conditions in the cluster.

## Afterwards

The alert clears within minutes of the error ratio dropping because of the
short window. If it does not clear, the fix did not take. Write down how much
budget was spent: `1 - slo:sli_error:ratio_rate1d` against
`slo:objective:ratio`.
