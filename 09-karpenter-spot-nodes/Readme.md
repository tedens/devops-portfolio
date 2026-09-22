# Karpenter with Spot Capacity

Karpenter replacing the Cluster Autoscaler on EKS, provisioning nodes directly
against EC2 rather than through managed node groups, with spot as the default
and a tested interruption path.

Spot is the largest single lever on a Kubernetes bill. The reason teams avoid
it is the failure mode: nodes disappear on two minutes' notice. So the
interesting part of this project is not the saving, it is the configuration
that makes the saving safe, and the drill that proves it.

## Layout

| Path | What it does |
|---|---|
| `terraform/` | Node and controller IAM, the interruption queue, the Helm release |
| `manifests/ec2nodeclass.yaml` | What a node is made of: AMI, disk, metadata options |
| `manifests/nodepool-spot.yaml` | The default pool. Spot first, broad instance choice |
| `manifests/nodepool-ondemand.yaml` | Tainted pool for workloads that cannot be interrupted |
| `manifests/example-workload.yaml` | What a workload must look like to be safe on spot |
| `scripts/apply-manifests.sh` | Substitutes the cluster name and applies |
| `scripts/interruption-drill.sh` | Sends a real spot interruption via FIS and checks availability held |

## Install

```bash
terraform -chdir=terraform apply -var cluster_name=my-cluster
./scripts/apply-manifests.sh my-cluster
```

Karpenter finds where to put nodes by tag, so the subnets and security groups
it should use must carry `karpenter.sh/discovery=<cluster-name>`. Getting this
wrong is the most common reason nodes never appear.

## The decisions worth explaining

**Breadth is what makes spot reliable.** The default pool accepts the c, m and
r families, generations above 5, both architectures, and every size above
small. Restricting to two instance types means competing for two capacity
pools; allowing a wide range means AWS nearly always has something, and
interruptions become rarer because the pools are deeper. Graviton is in the
list because it is usually the cheapest thing that fits.

**On-demand is a fallback, not a default.** The default pool lists
`["spot", "on-demand"]`, so Karpenter uses on-demand only when spot cannot be
had. Workloads that genuinely cannot take an eviction go to the on-demand
pool, which is tainted: reaching it needs a deliberate toleration, so nothing
lands there by accident and quietly doubles the bill.

**Consolidation is where the money actually is.** `WhenEmptyOrUnderutilized`
means the cluster actively shrinks when demand drops. Most clusters scale up
under load and then simply stay scaled up. This is also the setting most
likely to cause trouble, which is why it is paired with disruption budgets:
never more than 10% of the fleet at once, and nothing at all during the Monday
release window.

**Interruption handling is the whole point.** EventBridge feeds spot warnings,
rebalance recommendations, state changes and health events into an SQS queue
that Karpenter watches. With it, a reclaim becomes cordon, drain and replace
inside the two-minute window. Without it, the node simply vanishes.

**The controller must not run on nodes it manages.** Two replicas, and it
belongs on a small managed node group. A controller that deprovisions its own
node leaves nothing to bring the cluster back.

**IMDSv2 with a hop limit of 1**, so a compromised pod cannot reach the node's
instance credentials. The controller's IAM policy is scoped by resource tag,
so it can only terminate instances belonging to this cluster.

## Proving it works

```bash
FIS_ROLE_ARN=arn:aws:iam::111122223333:role/fis-spot \
  ./scripts/interruption-drill.sh --cluster my-cluster --deployment web
```

The drill picks a spot node that is actually running the workload, sends a
genuine two-minute interruption notice through AWS Fault Injection Simulator,
then watches ready replicas until the node is gone and the replacement is up.
It fails if availability drops below the PodDisruptionBudget floor, or if the
deployment does not return to full strength.

Draining an idle node proves nothing, so the script refuses to run if no spot
node is carrying the workload.

## What a workload needs to be safe here

Three things, all in `manifests/example-workload.yaml`:

1. **Topology spread** across zones and hosts, so losing one node or one
   capacity pool cannot take a majority of replicas.
2. **A PodDisruptionBudget**, which Karpenter honours during voluntary
   disruption. This is what stops consolidation draining everything at once.
3. **Resource requests**, so Karpenter can size a node correctly. Without
   them it guesses, and consolidation cannot reason about what fits.

A `terminationGracePeriodSeconds` comfortably inside two minutes and a short
`preStop` sleep round it off, so the load balancer stops sending traffic
before the process goes away.

## Status

The Terraform and manifests are complete and validate against the Karpenter
v1 CRD schemas. They have not been applied to a live cluster in this
repository, because the portfolio account does not run a permanent EKS
cluster. The commands above are the ones to run against one.
