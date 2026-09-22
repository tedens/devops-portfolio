# Automated Disaster Recovery Simulation

A backup you have never restored is a hypothesis. This turns the restore half
of the DR runbook into something that runs on a schedule, proves the data is
really there, measures how long it took, and destroys itself afterwards.

## What a run does

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

Result:

```json
{
  "drill_id": "drill-20260301T060412Z",
  "snapshot": "rds:prod-db-2026-03-01-03-07",
  "snapshot_taken": "2026-03-01T03:07:41Z",
  "rto_seconds": 734,
  "checks": {
    "ok": true,
    "engine_version": "8.0.39",
    "rpo_seconds": 10951,
    "tables": [
      { "table": "users", "rows": 48213 },
      { "table": "orders", "rows": 611904 },
      { "table": "invoices", "rows": 598447 }
    ]
  },
  "passed": true
}
```

`rto_seconds` is measured from the start of the restore to the last passing
check. `rpo_seconds` is the age of the newest row found, so the recovery point
is measured rather than inferred from the backup schedule.

## Why it is built this way

**A restored snapshot is production data.** It holds the same rows, the same
personal information and the same credentials as the source. So the recovery
environment gets production-grade isolation rather than convenience settings:

- Private subnets with no internet gateway and no NAT. Nothing in the VPC has
  a route to the internet.
- `publicly_accessible = false`, asserted again at runtime. If a future edit
  makes it reachable, the drill stops instead of carrying on.
- The database security group has exactly one ingress rule, and it references
  the validator's security group rather than a CIDR. There is no variable that
  can widen it to `0.0.0.0/0`.
- The validator has no key pair, no public IP and no inbound rules. Access is
  SSM Session Manager, which is logged, over VPC interface endpoints.
- The validator's IAM role can read one secret ARN, not the account's secrets.

**Teardown runs from a trap.** The most likely way to leave a copy of
production exposed is a drill that fails halfway and gets abandoned. Teardown
is on `EXIT`, `teardown.sh` is the backstop, and it exits non-zero if anything
matching `dr-sim` is still running.

**An empty restore must fail.** A snapshot can restore cleanly and contain
nothing useful. Every table named in `--tables` has to exist *and* have rows,
or the drill fails.

## Files

| Path | What it does |
|---|---|
| `terraform/` | The disposable recovery environment |
| `scripts/latest_snapshot.sh` | Resolves the newest available snapshot |
| `scripts/run_drill.sh` | Orchestrates the run and tears it down |
| `scripts/validate_restore.sh` | The checks, run on the validator via SSM |
| `scripts/teardown.sh` | Manual cleanup and a leftover check |
| `workflows/dr-drill.yml` | Monthly schedule. Copy into `.github/workflows/` once a role exists |

## Wiring it up

The workflow is kept out of `.github/workflows/` deliberately, because it
needs an account to run against. To enable it:

1. Create a deploy role trusted by GitHub OIDC with permission to manage the
   drill VPC, RDS restores and the validator instance.
2. Set `DR_DRILL_ROLE_ARN` and `DR_DB_SECRET_ARN` as secrets, and
   `DR_SOURCE_DB`, `DR_DATABASE`, `DR_CHECK_TABLES`, `DR_FRESHNESS_TABLE` as
   variables.
3. Copy `workflows/dr-drill.yml` into `.github/workflows/`.

## Cost

The environment exists only for the length of a run. A `db.t3.micro` restore,
a `t3.micro` validator and three interface endpoints for roughly fifteen
minutes is a few cents a month at a monthly cadence. Interface endpoints were
chosen over a NAT gateway because they are cheaper at this duty cycle and
remove internet egress entirely.
