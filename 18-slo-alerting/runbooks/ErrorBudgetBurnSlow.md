# ErrorBudgetBurnSlow

**Severity:** ticket. **Means:** demo-service is spending budget at 3x (over
1d) or 1x (over 3d) the sustainable rate. Not an outage. Left alone, the SLO
is missed this month.

This is the alert for the 0.5% error rate nobody notices: below any page
threshold, above the budget. It fires after an hour of sustained burn so a
transient does not create a ticket.

## What to do

1. Characterise it. Steady or periodic?
   ```
   slo:sli_error:ratio_rate1h{service="demo-service"}[1d]
   ```
2. Break it down by version and status. A slow burn is usually one endpoint,
   one dependency, or one version that never quite got rolled back.
3. Decide whether to spend engineering time or budget. If the remaining
   budget covers the month, this can wait for the next planning cycle; that
   is what a budget is for. If not, it is the next piece of work.

## Do not

Do not silence it and move on. If it is expected, change the objective or the
SLI definition in `rules/slo-recording.yaml` and say why in the commit.
