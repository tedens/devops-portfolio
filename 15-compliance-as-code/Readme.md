# Compliance as Code

HIPAA and SOC 2 controls expressed as policy, checked on every change, with
an evidence trail. It runs against this repository, so the findings are real
ones in real infrastructure rather than a contrived example.

## What it does

```bash
./scripts/scan.sh            # the gate: exits non-zero on anything new
./scripts/scan.sh --json     # machine-readable
./scripts/scan.sh --print-new # fingerprints, ready to paste into the baseline
./scripts/evidence.sh        # dated evidence bundle
opa test policy/             # the policies have their own tests
```

Current state of this repository:

```
Scanned 23 findings across the repository.
  new:      0
  expired:  0
  accepted: 23
```

## Two engines

**Trivy** brings breadth. It knows more about AWS defaults than is worth
writing by hand, and it covers Kubernetes manifests too.

**Rego in `policy/`** brings the rules this organisation has decided on, which
no scanner ships with. Trivy knows an open security group is bad in general.
It does not know that here, any data port reachable from the internet is a
release blocker while an open admin port is a high finding with a month to fix
it.

The policies have unit tests, because a policy that silently stops matching
after a provider schema change is worse than no policy: the green build says
everything is fine.

```
$ opa test policy/
PASS: 22/22
```

## The baseline is a ratchet, not a wall

Turning on a scanner against an existing estate produces a wall of findings,
and a gate that fails on all of them gets switched off within a week.

So everything currently failing is listed in `baseline/accepted.json` with a
reason, an owner and an expiry date. The build stays green while the debt
stays visible and dated. The gate fails on:

- a finding that is not in the baseline, and
- a baseline entry whose expiry has passed.

That second rule is the one that matters. An exception with no expiry is a
decision nobody ever revisits. An exception that expires forces the
conversation back onto someone's desk.

```json
{
  "fingerprint": "08-zero-trust-ssh|terraform.network|aws_security_group.teleport_sg",
  "finding": "Admin port 22 reachable from 0.0.0.0/0",
  "reason": "Teleport's own proxy listens on 3023-3026 and should be the only ingress.",
  "risk": "high",
  "owner": "tj",
  "expires": "2026-10-22",
  "ticket": "PORTFOLIO-8",
  "decision": "remediate"
}
```

Entries are marked `remediate` or `accept`. Thirteen of the twenty-two are
marked for remediation; the rest are cases where the scanner's default is
simply wrong for the context, and the reason field says why.

## The control matrix

`controls/controls.json` ties each framework requirement to the thing that
implements it and the thing that proves it still does. Rendered with
`scripts/render_controls.sh`.

A control with no verification is an assertion, and assertions are what
auditors ask awkward questions about, so every entry has to name a policy
package, a scanner rule, or a piece of evidence.

Nine of eleven controls are implemented. The two gaps are recorded as gaps
rather than quietly rounded up, which is the only way the matrix stays worth
reading.

## Evidence

`scripts/evidence.sh` writes a dated JSON bundle: what was scanned, against
which commit, with which tool versions, what the result was, and every
exception with its owner and expiry.

```
Evidence bundle 20260922T234926Z
  commit        56e1b8395b62 on main
  controls      9/11 implemented
  policy tests  22/22 passing
  findings      23 total, 0 blocking, 23 accepted
  result        PASS
```

An auditor does not want to watch a scan run. They want a file that says what
was checked and when, and they want last quarter's one too.

## What the first run actually found

Pointed at this repository, the gate found 30 issues, including some in code
written the same week:

- **The zero-trust SSH project allowed SSH from `0.0.0.0/0`.** On a project
  named for zero trust. Teleport's proxy should have been the only way in.
- **The Karpenter example workload ran as root** with a writable root
  filesystem, while being presented as the example of how to do it properly.
  That one was fixed rather than accepted: the file is now non-root, read-only
  and drops all capabilities, which took the project from eight findings to
  one.
- **The DR drill's ephemeral database** tripped three checks for having no
  backups, no deletion protection and no encryption. All three are correct for
  a fifteen-minute throwaway that is itself a copy of a backup, and are
  accepted with that reason recorded.

That last group is the argument for having an exception process at all. A
scanner's defaults are written for production, and not everything is
production.

## Layout

| Path | What it is |
|---|---|
| `policy/terraform/` | Org policy as Rego: network, encryption, identity, logging |
| `policy/tests/` | Unit tests for the policies |
| `controls/controls.json` | Framework requirement to implementation to verification |
| `baseline/accepted.json` | Accepted findings, with owner and expiry |
| `scripts/scan.sh` | The gate |
| `scripts/evidence.sh` | Dated evidence bundle |
| `scripts/render_controls.sh` | Control matrix as markdown |
| `workflows/compliance.yml` | Runs on every infrastructure change |

## Honest limits

This checks **configuration**, which is one slice of either framework. It says
nothing about workforce training, business associate agreements, physical
safeguards, incident response, or whether the policies on paper match what
people do. Those are most of a real HIPAA or SOC 2 programme.

What it does do is make the technical controls continuously verifiable instead
of a point-in-time screenshot, which is the part that usually rots between
audits.
