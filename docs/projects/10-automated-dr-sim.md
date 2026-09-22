---
title: "Automated Disaster Recovery Simulation"
layout: page
permalink: /10-automated-dr-sim/
description: "A scheduled restore drill that rebuilds production from a snapshot, proves the data is really there, measures recovery time and destroys itself."
---

A backup you have never restored is a hypothesis. This turns the restore half
of the DR runbook into something that runs on a schedule, proves the data is
really there, measures how long it took, and destroys itself afterwards.

```bash
./scripts/run_drill.sh \
  --source-db prod-db \
  --database  appdb \
  --secret    arn:aws:secretsmanager:us-east-2:111122223333:secret:prod/db \
  --tables    "users orders invoices" \
  --freshness-table orders
```

1. Finds the newest available snapshot of the source database.
2. Builds an isolated recovery VPC and restores the snapshot into it.
3. Refuses to continue if the restored instance is publicly reachable.
4. Connects from a throwaway validator host and checks the data.
5. Writes a JSON result with the measured recovery time.
6. Destroys everything, including on failure.

## The output is a measurement, not a green tick

```json
{
  "drill_id": "drill-20260301T060412Z",
  "snapshot": "rds:prod-db-2026-03-01-03-07",
  "rto_seconds": 734,
  "checks": {
    "ok": true,
    "engine_version": "8.0.39",
    "rpo_seconds": 10951,
    "tables": [
      { "table": "users", "rows": 48213 },
      { "table": "orders", "rows": 611904 }
    ]
  },
  "passed": true
}
```

`rto_seconds` runs from the start of the restore to the last passing check, so
the recovery time objective is measured rather than estimated. `rpo_seconds`
is the age of the newest row actually found in the restore, so the recovery
point is measured rather than inferred from the backup schedule.

## A restored snapshot is production data

It holds the same rows, the same personal information and the same credentials
as the source. So the recovery environment gets production-grade isolation
rather than convenience settings:

- Private subnets with no internet gateway and no NAT. Nothing in the VPC has
  a route to the internet at all.
- `publicly_accessible = false`, and the drill asserts it again at runtime. If
  a future edit makes it reachable, the run stops rather than carrying on.
- The database security group has exactly one ingress rule, and it references
  the validator's security group rather than a CIDR. There is no variable
  anywhere that can widen it to `0.0.0.0/0`.
- The validator has no key pair, no public IP and no inbound rules. Access is
  SSM Session Manager over VPC interface endpoints, which is logged and needs
  no open port.
- The validator's IAM role can read one secret ARN, not the account's secrets.

This is a deliberate correction. The first version of this project used
`publicly_accessible = true` and allowed 3306 from anywhere, which is a
reasonable shortcut for iterating against an empty test database and a serious
mistake the moment it is pointed at a real snapshot.

## Two failure modes it is built around

**An abandoned drill.** The likeliest way to leave a copy of production
exposed is a run that fails halfway and gets forgotten. Teardown is on an
`EXIT` trap, so it happens whether the drill passes, fails or is interrupted.
`teardown.sh` is the backstop and exits non-zero if anything matching the
drill name is still running.

**A restore that is clean and empty.** A snapshot can restore perfectly and
contain nothing useful. Every table named in `--tables` has to exist *and*
have rows, or the drill fails. Structural success is not success.

## Running it on a schedule

`workflows/dr-drill.yml` runs it monthly through GitHub Actions using OIDC, so
no long-lived AWS keys exist in the repository. It is deliberately kept out of
`.github/workflows/` until a role exists to run it against, since a scheduled
job that fails every month for want of credentials teaches people to ignore
the alert.

A drill you only run when you remember is the same as no drill.

## Cost

The environment exists only for the length of a run. A `db.t3.micro` restore,
a `t3.micro` validator and three interface endpoints for about fifteen minutes
is a few cents at a monthly cadence. Interface endpoints were chosen over a
NAT gateway because they are cheaper at this duty cycle and remove internet
egress entirely.
