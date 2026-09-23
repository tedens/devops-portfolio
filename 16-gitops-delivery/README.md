# GitOps delivery

Argo CD pulls this repository, Argo Rollouts runs a canary, and the canary is
gated on Prometheus. A build that fails its measurements is rolled back
without anyone watching.

Project 01 builds an image and project 09 provides nodes to run it on. Nothing
in between actually deployed anything. This is that part.

## Run it

```bash
./scripts/up.sh --local        # kind cluster, Argo CD, Argo Rollouts, the app
./scripts/rollback-drill.sh    # ship a broken build, expect a rollback
./scripts/rollback-drill.sh --healthy
./scripts/down.sh
```

`up.sh` with no arguments installs the app of apps instead and lets Argo CD
pull this repository, which is the real path. `--local` applies from the
working tree, because iterating on a manifest by pushing to `main` to see the
result is a slow way to work.

## What the drill proves

Two claims, in both directions. An analysis that rejects everything passes a
rollback test and is useless, so the healthy run matters as much as the
broken one.

```
==> shipping demo-service:broken (broken)
    phase=Progressing step=0                 22:26:30
    phase=Paused      step=1                 22:26:41
    phase=Progressing step=2                 22:27:37
    phase=Paused      step=3                 22:27:42
    phase=Degraded    step=0                 22:28:08

  message   RolloutAborted: Metric "success-rate" assessed Failed
            due to failed (2) > failureLimit (1)
  measured  0.409, 0.449          <- FAIL_RATE is 0.6, so ~0.4 is right
  stable    unchanged
  serving   19/20 requests returned 200

PASS: the broken build was rejected and rolled back on its own.
```

```
==> shipping demo-service:v2 (healthy)
    ... step=1 ... step=3 ... step=5 ...
    phase=Healthy step=6

  measurements  Successful x5
  stable        59df8f7d66   (new)
  serving       20/20

PASS: the healthy build was promoted.
```

The measured values are the point. A rollback is easy to fake: anything that
aborts a rollout looks like one. The numbers above are the canary's actual
success rate, and they match the failure rate baked into the image.

## The query is the whole design

An obvious version of the analysis looks like this, and does not work:

```promql
sum(rate(http_requests_total{status_class="2xx"}[1m]))
  / sum(rate(http_requests_total[1m]))
```

With no selector it averages the canary's failures into the stable pods'
traffic. At a 20% canary weight, a pod failing 60% of requests moves the
fleet-wide success rate from 100% to about 88%, which sails past a 95%
threshold. The canary is promoted precisely because most of the fleet is
still healthy.

`rollouts_pod_template_hash` fixes it. Argo Rollouts sets that label on the
canary ReplicaSet's pods and passes the value into the analysis as an
argument, so the query measures only the new version. Prometheus has to be
relabelling it off the pod, which is three lines in the scrape config and the
single most load-bearing part of the monitoring setup here.

## Three bugs worth keeping

All three produced a passing drill. That is why the CI job asserts the
measurements carry values rather than trusting the verdict.

**The gate crashed instead of measuring.** The first run rolled back the
broken build and reported PASS. The message said
`assessed Error due to consecutiveErrors (3) > consecutiveErrorLimit (2):
"reflect: slice index out of range"`. `result[0]` on an empty vector. A
canary pod that started ten seconds ago has no one-minute window to take a
rate over, so the first measurement had nothing in it. Shipping a *healthy*
build proved the gate was broken, because that was rolled back too with the
identical error.

Fixed with `initialDelay: 60s` and `successCondition: len(result) == 1 &&
result[0] >= 0.95`. The length check is not only about the panic: it decides
what "no data" means. Without it an empty result is an Error, and errors are
governed by `consecutiveErrorLimit` rather than `failureLimit`, so the
behaviour of a canary nobody can measure depends on a setting meant for a
Prometheus outage. With it, unmeasurable is a failed measurement.

**`kubectl patch --type=merge` silently destroyed the container spec.** After
the first fix, both builds still failed, now with real `Failed` verdicts on
empty values. The canary was being scraped, `build_info` was present, and
`http_requests_total` was absent, which meant the pod was alive and serving
nobody. It was a ready endpoint of the Service and 40 out of 40 requests went
to v1.

The cause was in the drill script:

```bash
kubectl patch rollout demo-service --type=merge \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","image":"..."}]}}}}'
```

`--type=merge` is RFC 7386, which replaces arrays rather than merging them by
key. The container became exactly `{name, image}`: no ports, no probes, no
env, no securityContext. With no port named `http`, the EndpointSlice
controller could not resolve `targetPort: http` and put the pod in a slice
with no ports at all, where it showed as ready and received nothing.

`--type=strategic` would merge by container name and is not available for a
CRD, so the drill uses a JSON patch addressing the field directly. It also
asserts the port survived, because this was silent for three runs.

**Traffic was pointed at the wrong Service.** There are three: `demo-service`
selects every pod, and Argo Rollouts rewrites the selectors on
`demo-service-stable` and `demo-service-canary` to pin each to one
ReplicaSet. Without a traffic router the canary weight is approximated by
replica count, so clients must call the unpinned one. The load generator
originally called `demo-service-stable`, which sends nothing to the canary,
and an unmeasured canary is promoted rather than rejected.

**A fourth, found only by running the real path.** `up.sh --local` applies
the manifests with `kubectl apply -f <dir>`, which goes in filename order, so
`analysistemplate.yaml` lands before `rollout.yaml`. Argo CD does not order a
directory that way, and the Rollout arrived first:

```
InvalidSpec: spec.strategy.canary.analysis.templates:
Invalid value: "success-rate": AnalysisTemplate 'success-rate' not found
```

It recovers once the template appears, but until then the Rollout is rejected
and on a first deploy nothing runs. `argocd.argoproj.io/sync-wave` now orders
them explicitly. The lesson is about the shortcut rather than the annotation:
`--local` is convenient and is not the thing being shipped, so CI runs the
app of apps against `main` as a separate job.

## Argo CD and Argo Rollouts disagree by default

The two Services above are the seam between them. Rollouts injects
`rollouts-pod-template-hash` into their selectors; Argo CD compares the live
Service to git, sees a selector that is not in the manifest, and with
`selfHeal: true` reverts it mid-canary. The analysis then measures a Service
that no longer points at the pods it was measuring.

`ignoreDifferences` on `/spec/selector` for both Services is what stops the
two controllers fighting. It is in `apps/demo-service.yaml` with that
explanation next to it.

## Running a drill under GitOps is not the same as running one

The drill changes an image with `kubectl`. Under GitOps a deploy is a commit,
so that is an out-of-band change and an Application with `selfHeal: true`
reverts it. The first run against the real path did exactly that: no
AnalysisRun was ever created, the stable ReplicaSet never moved, and the
Rollout sat `Healthy` while the drill timed out. Argo CD was right and the
drill was wrong.

Suspending automated sync on the `demo-service` Application alone did not
fix it, which is the app-of-apps lesson. The root Application owns
`apps/demo-service.yaml` and also self-heals, so it wrote the `automated`
block straight back and the child resumed reverting. Every Application has
to be suspended, root first, and every one restored afterwards. The drill
does that from a trap, so the failure path restores too; leaving sync off
would be its own kind of drift.

A fire drill that needs a commit per run is a fire drill nobody does. In a
real pipeline the image tag is written to git by CI and this problem does not
arise.

## Layout

```
app/                    the service. no dependencies, exposes /metrics
bootstrap/versions.env  pinned Argo CD, Argo Rollouts and kind versions
apps/                   the app of apps and its children
manifests/
  demo-service/         Rollout, AnalysisTemplate, three Services, loadgen
  monitoring/           Prometheus, scrape config, RBAC
scripts/
  up.sh                 cluster, controllers, images, apply
  rollback-drill.sh     both directions
  reset.sh              back to a known v1 Healthy state
  down.sh
```

`reset.sh` recreates the Rollout rather than clearing the abort flag. An
aborted Rollout stays Degraded until something clears it, and patching
`status.abort` makes the controller retry the revision it just rejected,
which is not what reset should mean. A drill that starts from an unknown
state proves nothing.

## What has and has not been run

Everything above was run: the cluster, both drill directions, and the
measured values quoted. CI runs the same two drills on every change to this
directory, on a kind cluster, and fails if any measurement reached a verdict
without a value.

The broken build is a real artifact. `FAIL_RATE` is baked in at image build
time rather than read from a ConfigMap, because a rollback that has only been
tested against a toggle on a healthy build has not been tested.

This has not run on EKS. The manifests are cluster-agnostic and the node
capacity in project 09 is where they would land, but that pairing is
untested. The Prometheus here is a single pod with an emptyDir and a one-hour
retention, which is right for a drill and not for anything else.
