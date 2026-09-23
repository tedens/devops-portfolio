---
title: "GitOps Delivery"
layout: page
permalink: /16-gitops-delivery/
description: "Argo CD pulls the repository, Argo Rollouts runs a canary gated on Prometheus, and a build that fails its measurements rolls itself back. The drill runs in CI."
---

Argo CD pulls this repository, Argo Rollouts runs a canary, and the canary is
gated on Prometheus. A build that fails its measurements is rolled back
without anyone watching.

[Project 01]({{ site.baseurl }}/01-ci-cd-pipeline/) builds an image and
[project 09]({{ site.baseurl }}/09-karpenter-spot-nodes/) provides nodes to
run it on. Nothing in between actually deployed anything. This is that part.

## The drill

Two claims, checked in both directions. An analysis that rejects everything
passes a rollback test and is useless, so the healthy run matters as much as
the broken one.

```
==> shipping demo-service:broken
    phase=Progressing step=0                 22:26:30
    phase=Paused      step=1                 22:26:41
    phase=Progressing step=2                 22:27:37
    phase=Paused      step=3                 22:27:42
    phase=Degraded    step=0                 22:28:08

  message   RolloutAborted: Metric "success-rate" assessed Failed
            due to failed (2) > failureLimit (1)
  measured  0.409, 0.449
  stable    unchanged
  serving   19/20 requests returned 200
```

`FAIL_RATE` in that image is 0.6, so a success rate near 0.4 is the right
answer. The measured values are the point of quoting them: a rollback is easy
to fake, because anything that aborts a rollout looks like one.

The healthy build runs the same path and is promoted, five successful
measurements, new stable ReplicaSet, 20 out of 20 serving.

## The query is the whole design

An obvious version of the analysis looks like this, and does not work:

```
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
relabelling it off the pod, which is three lines of scrape config and the
single most load-bearing part of the monitoring setup.

## Three bugs, all of which produced a passing drill

This is the part worth reading. Each one made the drill report success while
the gate was doing nothing useful.

### The gate crashed instead of measuring

The first run rolled back the broken build and printed PASS. The message:

```
assessed Error due to consecutiveErrors (3) > consecutiveErrorLimit (2):
"Error Message: reflect: slice index out of range"
```

`result[0]` on an empty vector. A canary pod that started ten seconds ago has
no one-minute window to take a rate over, so the first measurement had
nothing in it. Shipping a **healthy** build proved the gate was broken,
because that was rolled back too, with the identical error. A release gate
that rejects everything is not a gate.

The fix is `initialDelay: 60s` and
`successCondition: len(result) == 1 && result[0] >= 0.95`. The length check
is not only about the panic. It decides what "no data" means: without it an
empty result is an Error, and errors are governed by `consecutiveErrorLimit`
rather than `failureLimit`, so the behaviour of an unmeasurable canary
depends on a setting meant for a Prometheus outage. With it, unmeasurable is
a failed measurement and the release does not proceed.

### A merge patch silently destroyed the container spec

After that fix both builds still failed, now with real `Failed` verdicts on
empty values. Prometheus was scraping the canary, `build_info` was present,
`http_requests_total` was absent. So the pod was alive and serving nobody. It
was listed as a ready endpoint and 40 out of 40 requests went to v1.

The cause was one flag in the drill script:

```bash
kubectl patch rollout demo-service --type=merge \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","image":"..."}]}}}}'
```

`--type=merge` is RFC 7386, which replaces arrays rather than merging them by
key. The container became exactly `{name, image}`: no ports, no probes, no
env, no securityContext. With no port named `http`, the EndpointSlice
controller could not resolve `targetPort: http`, and put the pod in a slice
with no ports at all, where it showed as ready and received nothing.

`--type=strategic` would merge by container name and is not available for a
custom resource, so the drill uses a JSON patch addressing the field
directly, and asserts afterwards that the port survived.

### Traffic was pointed at the wrong Service

There are three Services over one workload. `demo-service` selects every pod;
Argo Rollouts rewrites the selectors on `demo-service-stable` and
`demo-service-canary` to pin each to one ReplicaSet. Without a traffic router
the canary weight is approximated by replica count, so clients must call the
unpinned one. The load generator originally called `demo-service-stable`,
which sends nothing at all to the canary, and an unmeasured canary is
promoted rather than rejected.

## Argo CD and Argo Rollouts disagree by default

Those two pinned Services are the seam between the controllers. Rollouts
injects `rollouts-pod-template-hash` into their selectors; Argo CD compares
the live Service to git, sees a selector that is not in the manifest, and
with `selfHeal: true` reverts it mid-canary. The analysis then measures a
Service that no longer points at the pods it was measuring, and the two
controllers fight until the rollout stalls.

`ignoreDifferences` on `/spec/selector` for both Services is what stops it.

## What CI does

It runs the drill, not a lint. Both directions, on a kind cluster, on every
change to the project. It also asserts that every measurement carries a
value, because all three bugs above produced a rollback and a green result
while measuring nothing.

## What has and has not been run

Everything quoted here was run: the cluster, both drill directions, and the
measured values. The broken build is a real artifact with `FAIL_RATE` baked
in at image build time rather than read from a ConfigMap, because a rollback
tested only against a toggle on a healthy build has not been tested.

It has not run on EKS. The manifests are cluster-agnostic and project 09's
node capacity is where they would land, but that pairing is untested. The
Prometheus here is one pod with an emptyDir and an hour of retention, which
is right for a drill and wrong for anything else.
