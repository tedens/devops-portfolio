---
title: "Karpenter with Spot Capacity"
layout: page
permalink: /09-karpenter-spot-nodes/
description: "Spot-first node provisioning on EKS with consolidation, disruption budgets and a fault-injection drill that proves a reclaim is survivable."
---

Karpenter replacing the Cluster Autoscaler on EKS, provisioning nodes directly
against EC2 rather than through managed node groups, with spot as the default
and a tested interruption path.

Spot is the largest single lever on a Kubernetes bill. The reason teams avoid
it is the failure mode: nodes disappear on two minutes' notice. So the
interesting part is not the saving, it is the configuration that makes the
saving safe, and the drill that proves it.

## Breadth is what makes spot reliable

The default NodePool accepts the c, m and r families, generations above 5,
both architectures, and every size above small. Restricting to two instance
types means competing for two capacity pools. Allowing a wide range means AWS
nearly always has something, and interruptions get rarer because the pools are
deeper. Graviton is in the list because it is usually the cheapest thing that
fits.

```yaml
requirements:
  - key: karpenter.sh/capacity-type
    operator: In
    values: ["spot", "on-demand"]   # on-demand is the fallback, not the default
  - key: kubernetes.io/arch
    operator: In
    values: ["amd64", "arm64"]
  - key: karpenter.k8s.aws/instance-generation
    operator: Gt
    values: ["5"]
```

Workloads that genuinely cannot take an eviction go to a second, tainted
NodePool. Reaching it needs a deliberate toleration, so nothing lands on
on-demand by accident and quietly doubles the bill.

## Consolidation is where the money is

`WhenEmptyOrUnderutilized` means the cluster actively shrinks when demand
drops. Most clusters scale up under load and then simply stay scaled up.

It is also the setting most likely to cause trouble, so it is paired with
disruption budgets: never more than a tenth of the fleet at once, and nothing
at all during the Monday release window.

```yaml
disruption:
  consolidationPolicy: WhenEmptyOrUnderutilized
  consolidateAfter: 1m
  budgets:
    - nodes: "10%"
    - nodes: "0"
      schedule: "0 9 * * mon"
      duration: 4h
```

Spot reclaims still happen during that window. They are involuntary. The
budget only limits what Karpenter itself chooses to do.

## Interruption handling is the whole point

EventBridge feeds spot warnings, rebalance recommendations, instance state
changes and AWS Health events into an SQS queue that Karpenter watches. With
it, a reclaim becomes cordon, drain and replace inside the two-minute window.
Without it the node simply vanishes and the pods go with it.

The Terraform wires all four event sources, because "this node is going away"
arrives in more than one shape.

## Proving it, rather than hoping

```bash
FIS_ROLE_ARN=arn:aws:iam::111122223333:role/fis-spot \
  ./scripts/interruption-drill.sh --cluster my-cluster --deployment web
```

The drill picks a spot node that is actually running the workload, sends a
genuine two-minute interruption notice through AWS Fault Injection Simulator,
then watches ready replicas until the node is gone and its replacement is up.

It fails if availability drops below the PodDisruptionBudget floor, or if the
deployment does not return to full strength. It refuses to run at all if no
spot node is carrying the workload, because draining an idle node proves
nothing.

## What a workload needs to be safe here

Three things, and none of them are Karpenter's job:

1. **Topology spread** across zones and hosts, so losing one node or one
   capacity pool cannot take a majority of replicas.
2. **A PodDisruptionBudget**, which Karpenter honours during voluntary
   disruption. This is what stops consolidation draining everything at once.
3. **Resource requests**, so Karpenter can size a node correctly. Without them
   it guesses, and consolidation cannot reason about what fits.

## Hardening

IMDSv2 is required with a hop limit of 1, so a compromised pod cannot reach
the node's instance credentials. The controller's IAM policy is scoped by
resource tag, so it can only terminate instances belonging to this cluster.
Nodes run Bottlerocket, and expire after 30 days so the patch level never
drifts far.

The controller itself belongs on a small managed node group rather than on
nodes it manages. A controller that deprovisions its own node leaves nothing
to bring the cluster back.

## Status

Terraform and manifests are complete, and the manifests validate against the
Karpenter v1 CRD schemas. They have not been applied to a live cluster here,
because this account does not run a permanent EKS cluster.
