#!/usr/bin/env bash
#
# Checks the claims this project makes about itself, against Terraform source.
# No AWS account and no apply: these are properties of the configuration, so
# they can be checked before anything is provisioned and in CI on every change.
#
# The previous version of this project made most of these claims in its README
# and broke them in its Terraform, which is why the checks exist rather than
# the prose being trusted.
#
#   ./scripts/verify-no-ssh.sh              check terraform/
#   ./scripts/verify-no-ssh.sh --expect-fail <dir>
#                                           check <dir> and succeed only if it
#                                           fails, which is how the checks are
#                                           proved against the old code

set -euo pipefail

cd "$(dirname "$0")/.."

expect_fail=false
if [[ "${1:-}" == "--expect-fail" ]]; then
	expect_fail=true
	shift
fi
tf_dir="${1:-terraform}"

shopt -s nullglob
tf_files=("$tf_dir"/*.tf)
shopt -u nullglob
if [[ "${#tf_files[@]}" -eq 0 ]]; then
	echo "no .tf files in $tf_dir" >&2
	exit 2
fi

# Comments describe intent and name the very things being banned, so every
# check reads the source with comments stripped. Captured once rather than
# piped per check: a pipe into "grep -q" is closed on the first match, and the
# SIGPIPE that follows makes the pipeline exit 141 under "set -o pipefail".
# That turned a negated check into a pass for the wrong reason, which is a
# thoroughly appropriate bug for a script whose job is to distrust claims.
SRC="$(sed -e 's/#.*$//' "${tf_files[@]}")"
INSTANCES="$(grep -c '^resource "aws_instance"' "${tf_files[@]}" | awk -F: '{s += $NF} END {print s + 0}')"

pass=0
fail=0
failed_names=()

has() { grep -qE "$1" <<<"$SRC"; }
lacks() { ! grep -qE "$1" <<<"$SRC"; }
count() { grep -cE "$1" <<<"$SRC" || true; }

check() {
	local name="$1"
	shift
	if "$@"; then
		printf '  ok    %s\n' "$name"
		pass=$((pass + 1))
	else
		printf '  FAIL  %s\n' "$name"
		fail=$((fail + 1))
		failed_names+=("$name")
	fi
}

no_ssh_ingress() { lacks 'from_port[[:space:]]*=[[:space:]]*22\b'; }
no_key_pair() { lacks '^[[:space:]]*key_name[[:space:]]*='; }

no_public_ips() {
	lacks 'associate_public_ip_address[[:space:]]*=[[:space:]]*true' &&
		lacks 'map_public_ip_on_launch[[:space:]]*=[[:space:]]*true'
}

imdsv2_on_every_instance() {
	[[ "$INSTANCES" -gt 0 ]] &&
		[[ "$(count 'http_tokens[[:space:]]*=[[:space:]]*"required"')" -eq "$INSTANCES" ]]
}

encrypted_roots() {
	[[ "$INSTANCES" -gt 0 ]] &&
		[[ "$(count '^[[:space:]]*encrypted[[:space:]]*=[[:space:]]*true')" -ge "$INSTANCES" ]]
}

flow_logs_present() { has 'resource "aws_flow_log"'; }

# Egress may name 0.0.0.0/0, because the package repository and the ACME
# directory publish no stable range. It may not do so for every protocol.
no_all_protocol_rule() {
	lacks 'ip_protocol[[:space:]]*=[[:space:]]*"-1"' &&
		lacks 'protocol[[:space:]]*=[[:space:]]*"-1"'
}

# An inline ingress block is authoritative for the whole group: a rule added
# by hand is deleted on the next apply, silently.
no_inline_sg_rules() { lacks '^[[:space:]]*(ingress|egress)[[:space:]]*\{'; }

no_committed_secrets() {
	! grep -rqiE '(client_secret|auth_token|secret_string)[[:space:]]*[:=][[:space:]]*"[^"$]' \
		--include='*.tf' --include='*.yaml' --include='*.yml' .
}

# The protected node's group must carry no ingress rule of any kind. The agent
# dials the proxy and holds the connection open; nothing dials in.
node_has_no_ingress() {
	local blocks
	blocks="$(awk '
		/^resource "aws_vpc_security_group_ingress_rule"/ { inblock = 1 }
		inblock { print }
		inblock && /^}/ { inblock = 0 }
	' <<<"$SRC")"
	# Anchored at the start of the line: "referenced_security_group_id" ends
	# with the same word, and an unanchored match read the endpoint rule that
	# lets the node reach SSM as an ingress rule on the node itself.
	# No such resource at all also satisfies this, and is caught elsewhere.
	! grep -qE '^[[:space:]]*security_group_id[[:space:]]*=[[:space:]]*aws_security_group\.node\.id' <<<"$blocks"
}

echo "Verifying $tf_dir against the claims 08-zero-trust-ssh makes"
echo

check "no ingress rule opens port 22 anywhere" no_ssh_ingress
check "no EC2 key pair is referenced" no_key_pair
check "no instance or subnet takes a public IP" no_public_ips
check "IMDSv2 is required on every instance" imdsv2_on_every_instance
check "every root volume is encrypted" encrypted_roots
check "the VPC has a flow log" flow_logs_present
check "no security group rule allows every protocol" no_all_protocol_rule
check "no inline ingress or egress blocks" no_inline_sg_rules
check "no credential-shaped literal is committed" no_committed_secrets
check "the protected node has no ingress rule" node_has_no_ingress

echo
total=$((pass + fail))

if [[ "$expect_fail" == true ]]; then
	if [[ "$fail" -eq 0 ]]; then
		echo "expected $tf_dir to fail these checks, and it passed all $total."
		echo "the checks are not testing what they claim to test."
		exit 1
	fi
	printf 'as expected, %d of %d checks failed:\n' "$fail" "$total"
	printf '  %s\n' "${failed_names[@]}"
	exit 0
fi

if [[ "$fail" -gt 0 ]]; then
	echo "$fail of $total checks failed"
	exit 1
fi
echo "all $pass checks passed"
