---
title: "Automated Disaster Recovery Simulation"
layout: page
permalink: /10-automated-dr-sim/
description: "Terraform that rebuilds a recovery environment from an RDS snapshot, plus a script that proves the restore actually works."
---

A backup you have never restored is a hypothesis, not a backup. This project
turns the restore half of the DR runbook into something you can run on a
schedule instead of discovering during an incident.

## The idea

Recovery time and recovery point objectives are usually written down once and
then never tested, because testing them means standing up a parallel
environment by hand. This provisions that environment from code, restores a
real snapshot into it, checks the data is actually there, and tears it down.

## What's in the repo

**`terraform/`** builds an isolated recovery target: its own VPC and subnet, a
security group, a DB subnet group, and an `aws_db_instance` restored from a
snapshot rather than created empty. The snapshot ID and DB password are
variables, so the same configuration can be pointed at any recovery point:

```hcl
variable "rds_snapshot_id" {
  description = "Snapshot ID to restore from (e.g., rds:prod-db-2025-08-17-07-00)"
  type        = string
}
```

It outputs the restored endpoint and identifier, which is what the validation
step needs:

```hcl
output "dr_db_endpoint" {
  value = aws_db_instance.dr_rds.endpoint
}
```

**`scripts/validate_restore.sh`** is the part that makes it a test rather than
a deployment. Standing the instance up proves Terraform works; querying it proves
the *backup* works.

## Status

**Work in progress.** The recovery target provisions and the validation script
runs, but the following are still open:

- The environment is a single subnet, so it needs a second availability zone
  before RDS will accept the subnet group in every region
- Network exposure on the restored instance is deliberately wide open for
  local iteration and **must be tightened before this is run against a real
  snapshot**. See the note below
- No scheduled execution or teardown yet; today it is run by hand
- No RTO/RPO measurement captured from the run

<div class="note note--warn">
  <span class="note__tag">Not production-ready</span>
  <div>
    <p>The current Terraform sets <code>publicly_accessible = true</code> and allows <code>3306</code> from <code>0.0.0.0/0</code> to make local iteration easy. A restored snapshot contains the same data as production, so that combination must not be pointed at a real backup. Hardening this (private subnets, a bastion or SSM session, and a security group scoped to the validation runner) is the next piece of work on it.</p>
  </div>
</div>
