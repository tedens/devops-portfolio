# ServiceDown

**Severity:** page. **Means:** no demo-service target is being scraped
successfully. Either every pod is failing its scrape or there are no pods.

The error-budget alerts cannot fire here: there are no requests to count.
This is the floor under them.

## First five minutes

```
kubectl -n demo get pods -l app=demo-service
kubectl -n demo get rollout demo-service
kubectl -n demo describe pod -l app=demo-service | grep -A5 Events
```

- No pods: the Rollout was scaled to zero or deleted. Argo CD should be
  restoring it; check `kubectl -n argocd get applications`.
- Pods `CrashLoopBackOff`: read the logs. A bad image that fails its
  liveness probe is killed before the canary analysis can see it, so this
  alert, not the rollout, is what catches that class of failure.
- Pods `Running` but scrape failing: the `/metrics` endpoint or the scrape
  annotations. `kubectl -n demo port-forward` to a pod and curl `/metrics`.

## Afterwards

Every minute of this is a minute of 100% error against the availability SLO.
Record it.
