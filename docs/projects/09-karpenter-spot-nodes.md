---
title: "Karpenter Spot Node Provisioning"
layout: page
permalink: /09-karpenter-spot-nodes/
description: "Planned: EKS cluster autoscaling onto spot capacity with consolidation and disruption budgets."
---

**Planned.** This one is on the list rather than in the repo. The folder is a
placeholder and there is nothing to read yet.

## What it will cover

Karpenter replacing the Cluster Autoscaler on EKS, provisioning nodes directly
against EC2 rather than through node groups, with:

- NodePools and EC2NodeClasses expressing instance requirements as constraints
  rather than as a fixed list of types
- Spot capacity as the default, with on-demand fallback for workloads that
  cannot take an interruption
- Consolidation, so the cluster actively shrinks when demand drops instead of
  only growing
- Disruption budgets and `do-not-disrupt` annotations to keep consolidation
  away from workloads mid-flight
- Interruption handling wired to the EC2 rebalance and spot-termination notices

## Why it's here

Spot pricing is the single largest lever on a Kubernetes bill, and the reason
teams avoid it is that the failure mode (nodes vanishing with two minutes'
notice) is genuinely disruptive if the cluster is not set up for it. The
useful output of this project is the configuration that makes that safe, not
the savings number.

Until it is built, the related work worth reading is
[the Terraform modules]({{ site.baseurl }}/03-iac-terraform/) that stand up the
EKS cluster itself, and
[the cost toolkit]({{ site.baseurl }}/05-aws-cost-optimization-toolkit/).
