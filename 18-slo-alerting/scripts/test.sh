#!/usr/bin/env bash
#
# Everything that can be checked without a cluster, in one command.
#
#   rules parse and the unit tests pass         promtool
#   routing sends each severity where it should  amtool
#   every alert has a runbook, and vice versa    this script
#
# Runs in CI on every change and takes seconds. The burn drill is the other
# half and needs a cluster.

set -euo pipefail
cd "$(dirname "$0")/.."

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }; }
need promtool; need amtool; need ruby

fail=0
say() { printf '\n==> %s\n' "$*"; }

say "rules parse"
promtool check rules rules/*.yaml

say "rule unit tests"
promtool test rules tests/*.yaml

say "alertmanager config parses"
amtool check-config alertmanager/alertmanager.yml >/dev/null && echo "  ok"

say "routing: each severity reaches the right receiver"
route() {
	local want="$1"; shift
	local got
	got=$(amtool config routes test --config.file=alertmanager/alertmanager.yml "$@" | tail -1)
	if [[ "$got" == "$want" ]]; then
		printf '  ok    %-40s -> %s\n' "$*" "$got"
	else
		printf '  FAIL  %-40s -> %s (wanted %s)\n' "$*" "$got" "$want"; fail=1
	fi
}
route pager  severity=page   alertname=ErrorBudgetBurnFast service=demo-service slo=availability
route pager  severity=page   alertname=ServiceDown service=demo-service
route ticket severity=ticket alertname=ErrorBudgetBurnSlow service=demo-service slo=latency
route ticket severity=ticket alertname=NoTraffic service=demo-service
# An alert with no severity must not page anyone.
route ticket alertname=SomethingNew

say "every alert has a severity, a summary and a runbook that exists; every runbook has an alert"
ruby -ryaml -e '
  alerts = Dir["rules/*.yaml"].flat_map { |f| YAML.load_file(f)["groups"].flat_map { |g| g["rules"] } }.select { |r| r["alert"] }
  runbooks = Dir["runbooks/*.md"].map { |f| File.basename(f, ".md") }
  bad = false
  alerts.each do |a|
    name = a["alert"]
    sev = a.dig("labels", "severity")
    url = a.dig("annotations", "runbook_url").to_s
    problems = []
    problems << "no severity label" unless %w[page ticket].include?(sev)
    problems << "no summary" unless a.dig("annotations", "summary")
    problems << "runbook_url does not end in runbooks/#{name}.md" unless url.end_with?("/runbooks/#{name}.md")
    problems << "runbooks/#{name}.md missing" unless runbooks.include?(name)
    if problems.empty?
      puts "  ok    #{name.ljust(22)} #{sev.ljust(6)} runbooks/#{name}.md"
    else
      puts "  FAIL  #{name}: #{problems.join(", ")}"; bad = true
    end
  end
  orphans = runbooks - alerts.map { |a| a["alert"] }
  unless orphans.empty?
    puts "  FAIL  runbooks with no alert: #{orphans.join(", ")}"; bad = true
  end
  exit 1 if bad
' || fail=1

echo
if [[ "$fail" -ne 0 ]]; then echo "FAIL"; exit 1; fi
echo "all offline checks passed"
