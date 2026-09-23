---
title: "Compliance as Code"
layout: page
permalink: /15-compliance-as-code/
description: "HIPAA and SOC 2 controls expressed as policy, gated on every change, with expiring exceptions and a dated evidence trail."
---

HIPAA and SOC 2 controls expressed as policy, checked on every change, with an
evidence trail. It runs against this repository, so the findings are real ones
in real infrastructure rather than a contrived example.

## What the first run found

Pointed at this repo, the gate found 30 issues, including several in code
written the same week:

- **The zero-trust SSH project allowed SSH from `0.0.0.0/0`.** On a project
  named for zero trust. Teleport's proxy should have been the only way in.
- **The Karpenter example workload ran as root** with a writable root
  filesystem, while being held up as the example of how to do it properly.
- **The DR drill's throwaway database** tripped checks for having no backups,
  no deletion protection and no encryption.

Those three groups need three different answers, which is the whole argument
for the project. The Karpenter one was a genuine mistake and was fixed: the
workload is now non-root and read-only with all capabilities dropped, which
took that project from eight findings to one. The DR ones are correct for a
fifteen-minute environment that is itself a copy of a backup, and are accepted
with that reason written down. The SSH one was a real gap, and the gate is
what forced it: project 08 has since been
[rebuilt from the ground up]({{ site.baseurl }}/08-zero-trust-ssh/) and all
nine of its findings are gone.

That rebuild also found a hole in this policy. Project 08 now uses
`aws_vpc_security_group_ingress_rule`, the standalone resource AWS
recommends, and the Rego here had only ever been written against the inline
`ingress` block. A rule opening port 22 to `0.0.0.0/0`, written the modern
way, passed the whole policy clean. Both shapes are covered now, including
`ip_protocol = "-1"`, which carries no port range at all; the test suite went
from 30 to 38.

## Two engines, doing different jobs

**Trivy** brings breadth. It knows more about AWS defaults than is worth
writing by hand, and it covers Kubernetes manifests too.

**Rego in `policy/`** encodes the rules this organisation has decided on.
Trivy knows an open security group is bad in general. It does not know that
*here*, any data port reachable from the internet blocks a release, while an
open admin port is a high finding with a month to fix it.

```rego
# HIPAA 164.312(e)(1), SOC 2 CC6.6
deny contains msg if {
    some name, sg in security_groups
    rule := sg.ingress[_]
    rule.cidr_blocks[_] in open_cidrs
    port := data_ports[_]
    rule.from_port <= port
    rule.to_port >= port
    msg := sprintf("CRITICAL aws_security_group.%s allows data port %d from the internet.", [name, port])
}
```

The policies have unit tests. A policy that silently stops matching after a
provider schema change is worse than no policy, because the green build says
everything is fine.

```
$ opa test policy/
PASS: 22/22
```

## The baseline is a ratchet, not a wall

Turning a scanner on against an existing estate produces a wall of findings,
and a gate that fails on all of them gets switched off within a week.

So everything currently failing is recorded with a reason, an owner and an
expiry. The build stays green while the debt stays visible and dated. The gate
fails on two things: a finding that is not in the baseline, and a baseline
entry whose expiry has passed.

```json
{
  "fingerprint": "08-zero-trust-ssh|terraform.network|aws_security_group.teleport_sg",
  "finding": "Admin port 22 reachable from 0.0.0.0/0",
  "reason": "Teleport's proxy listens on 3023-3026 and should be the only ingress.",
  "risk": "high",
  "owner": "tj",
  "expires": "2026-10-22",
  "decision": "remediate"
}
```

The expiry rule is the one that matters. An exception with no end date is a
decision nobody revisits. An exception that expires puts it back on someone's
desk as a build failure.

Verified by breaking it on purpose: adding a security group that exposes
Postgres to the internet fails the gate with the fingerprint to accept;
backdating an exception fails it with the owner and the overdue date.

## The control matrix

Each framework requirement is tied to the thing that implements it and the
thing that proves it still does.

| Control | Requirement | Verified by | Status |
|---|---|---|---|
| **EN-2** Data stores not reachable from the internet | 164.312(e)(1) / CC6.6 | `terraform.network`, plus a runtime assertion in the DR drill | implemented |
| **AU-2** Workload identity cannot be stolen from a pod | 164.312(a)(1) / CC6.1 | `terraform.identity` | implemented |
| **CP-1** Backup and recovery is tested | 164.308(a)(7) / A1.2 | measured RTO and RPO in the DR drill results | implemented |
| **SI-2** Exceptions are owned and expire | 164.308(a)(1)(ii)(B) / CC3.2 | the gate fails on an expired exception | implemented |
| **AC-3** Admin ports not internet-facing | 164.312(e)(1) / CC6.6 | `terraform.network` | **gap** |
| **AU-1** Audit controls | 164.312(b) / CC7.2 | `terraform.logging` | **gap** |

A control with no verification is an assertion, so every entry names a policy
package, a scanner rule or a piece of evidence. Nine of eleven are
implemented; the two gaps are recorded as gaps rather than quietly rounded up,
which is the only way a matrix like this stays worth reading.

## Evidence

Every run writes a dated bundle: what was scanned, against which commit, with
which tool versions, the result, and every exception with its owner.

```
Evidence bundle 20260922T234926Z
  commit        56e1b8395b62 on main
  controls      9/11 implemented
  policy tests  22/22 passing
  findings      23 total, 0 blocking, 23 accepted
  result        PASS
```

An auditor does not want to watch a scan run. They want a file that says what
was checked and when, and they want last quarter's one as well.

## Honest limits

This checks **configuration**, which is one slice of either framework. It says
nothing about workforce training, business associate agreements, physical
safeguards, incident response, or whether the written policies match what
people actually do. Those are most of a real programme.

What it does is make the technical controls continuously verifiable rather
than a point-in-time screenshot, which is the part that usually rots between
audits.
