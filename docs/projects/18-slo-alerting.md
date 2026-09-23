---
title: "SLOs and Alerting"
layout: page
permalink: /18-slo-alerting/
description: "Two SLOs, multi-window burn-rate alerts, a page-or-ticket routing tree, a runbook per alert, and a drill that burns the budget on purpose and proves the page arrives, the redundant ticket is held, and the page clears."
---

[Project 04]({{ site.baseurl }}/04-monitoring-logging/) ships dashboards.
Dashboards are for after you have been woken up. This is the part that wakes
you.

Two SLOs for the service delivered by
[project 16]({{ site.baseurl }}/16-gitops-delivery/), multi-window
multi-burn-rate alerts on their error budgets, a routing tree that separates
a page from a ticket, one runbook per alert linked from the alert itself, and
a drill that burns the budget on purpose and proves the page arrives, the
redundant ticket is held, and the page clears when the burn stops.

## The burn drill

Five pods of the broken build (60% errors) behind the same Service as five
good ones, so about 30% of requests fail. Then stop.

```
==> waiting for the page (alert firing, then delivered to /pager)
   alert=inactive ratio5m=0.0168              07:40:54
   alert=pending  ratio5m=0.0500              07:41:25
   alert=pending  ratio5m=0.1724              07:43:18
   alert=firing   ratio5m=0.1724              07:43:28
   PASS  ErrorBudgetBurnFast reached state firing
   PASS  a firing notification arrived at the pager receiver
     {"receiver":"pager","status":"firing","alertname":"ErrorBudgetBurnFast","slo":"availability","startsAt":"07:43:24"}
==> inhibition: a ticket for the same service and SLO must not be delivered while the page fires
   PASS  the injected ticket is held as inhibited by Alertmanager (1 inhibited)
   PASS  no ticket notification for it reached the sink while the page was firing
==> stop burning
   recording rules have about 5 minutes of history
==> the short window must empty within six minutes of the burn stopping
   ratio5m=0.2309                             07:44:24
   ratio5m=0.1159                             07:47:16
   ratio5m=0                                  07:49:18
   PASS  ratio5m fell below the page threshold within six minutes
==> resolution timing skipped: the rules have 5 minutes of history and the longest window is 6h.
    Long-window ratios right now, which are really 5-minute ratios:
      30m  0.108976
      1h   0.108976
      6h   0.108976
    Steady-state resolution is proven offline: tests/slo_alerts_test.yaml, last case.
PASS: 5/5. It paged, it did not double-notify, and the short window emptied.
```

Pending at 07:41:24, firing at 07:43:24 (the two-minute `for`), delivered
four seconds later. Those three identical long-window values at the end are
the young-history point made by the cluster itself: with five minutes of
recorded history there is no such thing as a 30-minute ratio yet.

## Two SLOs

| SLO | SLI, as an error ratio | Objective | Budget per 30 days |
|---|---|---|---|
| availability | `5xx / total` | 99.9% | 43 minutes of full outage |
| latency | `slower than 250ms / total` | 99% | 7.2 hours over threshold |

Error ratios, because a budget is an allowance of errors. The objectives are
recorded as series so dashboards and alerts read one number from one place;
a third SLO is two recording rules and a runbook, not a new alert.

The latency SLI needed a histogram, so project 16's service grew one and lost
its gauge quantiles. Quantiles computed inside a process cannot be summed
across pods, so a fleet-wide p95 from them is not a p95 of anything. Buckets
can be summed.

The ratios are computed in two levels: per-second error and request rates at
5m over live series, then `avg_over_time` of those for the 30m to 3d
windows. The obvious one-level `rate(...[1h])` is wrong for a service with
pod churn, which is any service with a canary; the reason is under "What it
took".

## The alerts

| alert | windows | severity | for |
|---|---|---|---|
| ErrorBudgetBurnFast | 14.4x over 1h and 5m, or 6x over 6h and 30m | page | 2m |
| ErrorBudgetBurnSlow | 3x over 1d and 2h, or 1x over 3d and 6h | ticket | 1h |
| NoTraffic | pods up, zero requests for 10m | ticket | 10m |
| ServiceDown | no target scraped | page | 2m |

The short window in each pair is what makes the alert **stop**. Without it a
one-hour outage keeps paging for the rest of the hour after it is fixed, and
the on-call learns to ignore the page. With it, the alert clears within
minutes of the error ratio dropping.

`NoTraffic` and `ServiceDown` exist because of what the burn alerts cannot
see. No traffic makes the SLI `0/0`, which is NaN, and every comparison with
NaN is false: silence. That is correct, since no traffic is not a budget
burn, and dangerous, since an outage that drops traffic to zero looks like a
quiet day. Adding `or vector(0)` to the SLI would hide the outage behind a
comfortable 0% error rate. The two health alerts own that case instead.

## Routing

Pages go to the pager receiver with no grouping delay. Tickets go to the
ticket receiver. Anything without a severity lands on ticket, because an
unclassified alert paging someone at 3am is how alerts get muted. One
inhibition rule: while a page fires for a service and SLO, the slow-burn
ticket for the same pair is held. It is not wrong; it is redundant, and two
notifications for one problem teaches people to skim.

Both receivers are webhooks to a small in-cluster sink that logs each alert
with the receiver it arrived on. The sink exists so the drill can read what
was *delivered*, which is a different fact from what Prometheus thinks is
*firing*.

## Tested offline, in seconds

Eight `promtool` cases: a 60% burn pages within minutes and does not also
ticket; 0.05% errors is silent on every alert for three hours; a 0.5% leak
opens a ticket after a day and never pages; no traffic leaves the SLI NaN,
not zero, and raises `NoTraffic`; every scrape failing pages without also
raising `NoTraffic`; no targets at all pages; slow responses burn the latency
budget with zero 5xx; and, with seven hours of clean history, a 4-minute
burn pages at 6 minutes and is gone 4 minutes after it stops. Then `amtool` checks the config and five routing
cases, and a script checks that every alert has a severity, a summary and a
runbook that exists, and that every runbook has an alert.

The tests are themselves tested. CI raises both fast-burn thresholds a
hundredfold and requires the suite to go red. The first version of that
mutation raised only the 14.4x pair and the suite stayed green, correctly:
with a fresh 60% burn the 6x pair fires too, because a ratio of two rates
over the same window is 0.6 however little of the window holds data. A
mutation the alert can route around is not a mutation.

## What has and has not been run

Everything above was run against project 16's kind cluster: the install, the
burn drill three times (the first two runs failed on bugs in the drill and in
the rules, described under "What it took"), and the eight offline cases plus
routing and runbook checks. The resolved notification for the first, stuck
page did arrive once the corrected rules loaded, so the full fire, resolve,
deliver chain has happened once for real; the drill does not assert it on a
young cluster, for the reason it prints.

CI runs the offline suite, then breaks both fast-burn thresholds and requires
the suite to fail, then brings up project 16's stack on kind, installs this,
and runs the drill. On CI the rules are minutes old, so the resolution check
is skipped there every time and the steady-state property rests on the unit
test with seven hours of synthetic history.

Not run: any of this against a Prometheus with real history, or with a real
pager behind the webhook. The sink is a log.

## What it took

Each of these produced a plausible wrong result before it produced a right
one.

**The page would not clear, and the maths said it should.** The first burn
lasted ninety seconds. The page stayed firing for twenty-five minutes after
the burn pods were deleted, and the second drill could not start because the
cluster was not quiet.

The cause is not what it first looked like. `rate()` does dilute over its
window: a series present for two minutes of a five-minute window reads at
0.4 of its true rate, and the unit tests show it. What breaks is the ratio.
`sum(rate(errors[6h])) / sum(rate(total[6h]))` divides two quantities that
were diluted by the same window, the window cancels, and what is left is
errors over total across **whatever samples exist inside the window**, not
across six hours. Project 16's resets had recreated the fleet minutes
earlier, so the "6h" ratio was really the last fifteen minutes of fleet
history, in which 3% of requests had been errors, forty times the 6x
threshold. It would have stayed there until the burn pods' samples aged out
of the window. The same mechanism made the first drill page inside two
minutes rather than the roughly five the workbook maths gives, because the
"1h" ratio was really the ratio over a few minutes of data.

The general statement is worth having: a ratio of two `rate()`s over the
same window measures the ratio over the lifetime of the data present, and
after any restart, redeploy or rollback that lifetime is short. The
recording rules are two-level now: per-second error and request rates at 5m
over live series, recorded as continuous series, then `avg_over_time` of
those for the long windows. The averages are over the recording rules'
history, which is what a window should mean, and dead pods' samples stop
mattering the moment they stop being scraped.

The recorded history is the proof. For the half hour the page was stuck,
the old `ratio_rate6h` and `ratio_rate30m` series were identical to five
decimal places, 0.02285 decaying to 0.00833, because neither was measuring
its window.

The same arithmetic applies to the fix while the recording rules are young:
with twenty minutes of history, the new "6h" average is a twenty-minute
average, and a burn that was a large share of it holds the 6x pair true after
it stops. That is not the alert misbehaving; it is the honest answer to
"what was the error ratio over all the data you have". In steady state a
four-minute burn at 37.5% errors is 0.58% over six hours, under the 0.6% the
6x pair needs, so once the 5m window empties nothing holds the page: it
fires six minutes into the burn and is gone four minutes after the burn
stops. The unit tests prove exactly that, minute by minute, with seven hours
of synthetic history. The live drill checks
that the 5m window empties, and runs the full resolution check only when the
rules have six hours of real history, saying so when they do not.

**The drill's first run passed the check that mattered most, on nothing.**
`jq -e 'select(...)'` on an empty log exits 0 in jq 1.6, so 45 seconds in,
with Prometheus still showing the alert `inactive`, the wait loop declared
the page delivered and tore the burn down. The real page fired two minutes
later, after the pods were gone, and the ticket injected to test inhibition
was delivered because there was nothing yet to inhibit it. Three of six
checks failed, none of them for the reason they said. Matches are counted
now; an empty log is zero. This is the third project in this repository
where a check treated silence as success, after `grep -q` under `pipefail`
in 08 and a `/dev/null` probe in 16. The pattern is the lesson.

**`amtool alert add --end` set the start.** With only `--end`, Alertmanager
recorded the injected alert as starting twenty minutes in the future. Both
timestamps are explicit now.

**Prometheus loaded zero rules.** `install.sh` restarted Prometheus with the
new optional volume before creating the ConfigMap; the kubelet filled the
mount about a minute later, after a fifteen-second wait and a reload had
already run. The ConfigMap goes in first now, and the reload retries until
the rule count is right.

**The mutation test that could not fail.** CI breaks the alert thresholds
and requires the unit tests to go red. The first version raised only the
14.4x pair and the tests stayed green, correctly: with a fresh 60% burn the
6x pair fires too, because a ratio of two rates over the same window is 0.6
however little of the window holds data. Both pairs are mutated now, and the
suite goes red on two cases.

**Kustomize would not read `../rules`.** The kustomization moved to the
project root so the tested files sit below it; the alternative was turning
off load restrictions in Argo CD for everything.

**A float.** `60 / (60 + 40)` through `rate()` is `0.6000000000000001`, and
`promtool` compares exactly. The expected samples are rounded to a
millesimal, which also drops `__name__` from the result, which also has to
be reflected in the expected labels.
