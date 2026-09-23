#!/usr/bin/env bash
#
# Tries to get five images past the admission controller. One should get in.
#
#   1  the signed, attested image                        admitted, tag -> digest
#   2  same source, rebuilt, never signed                refused: no signature
#   3  a tampered build signed with a different key      refused: wrong signer
#   4  signed by the right key, no SBOM attestation      refused: no SBOM
#   5  an image from a registry not on the allowlist     refused before signatures
#
# Cases 2 to 5 are the reasons the policy has the shape it has. A policy that
# only refused case 2 would be beaten by cases 3 and 5 without anyone needing
# to forge anything.
#
#   ./scripts/tamper-drill.sh            local registry, key attestor
#   IMAGE=ghcr.io/...@sha256:... NOSBOM_IMAGE=ghcr.io/...@sha256:... ./scripts/tamper-drill.sh --ci
#                                        in CI: case 1 is the keyless-signed and
#                                        attested image, case 4 the one CI signed
#                                        and attested nothing to; 2, 3 and 5 are
#                                        built here against the same path

set -euo pipefail
cd "$(dirname "$0")/.."
source bootstrap/versions.env
export COSIGN_PASSWORD="${COSIGN_PASSWORD:-}"

NS=demo
REG_HOST="${REG_HOST:-localhost:5001}"
REG_CLUSTER="${REG_CLUSTER:-kind-registry:5000}"
REPO="${REPO:-demo-service}"
GOOD_TAG="${GOOD_TAG:-v1}"
KEY="${KEY:-.local/cosign.key}"
LOCAL=.local
mkdir -p "$LOCAL"

pass=0; fail=0
log() { printf '\n==> %s\n' "$*"; }

# Tries to create a pod. Prints the admission decision. Returns 0 if admitted.
attempt() {
	local name="$1" image="$2" out
	kubectl -n "$NS" delete pod "$name" --ignore-not-found --wait=false >/dev/null 2>&1 || true
	if out=$(kubectl -n "$NS" run "$name" --image="$image" --restart=Never \
		--overrides='{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"app","image":"'"$image"'","securityContext":{"allowPrivilegeEscalation":false,"readOnlyRootFilesystem":true,"capabilities":{"drop":["ALL"]}}}]}}' \
		2>&1); then
		echo "   admitted"
		return 0
	fi
	# Keep only the policy's message; the webhook prefix is noise.
	echo "   refused: $(sed -E 's/.*denied the request: //; s/Policy [a-z-]+ failed: //' <<<"$out" | head -1 | cut -c1-160)"
	return 1
}

expect() {
	local want="$1" name="$2" image="$3" why="$4"
	log "$name: $why"
	echo "   $image"
	if attempt "$name" "$image"; then got=admitted; else got=refused; fi
	if [[ "$got" == "$want" ]]; then
		printf '   PASS (expected %s)\n' "$want"; pass=$((pass + 1))
	else
		printf '   FAIL (expected %s, got %s)\n' "$want" "$got"; fail=$((fail + 1))
	fi
}

push_variant() {
	# Rebuild the same source with a different label so the digest changes
	# and nothing signed for the good image applies. Tag it back onto the
	# GOOD tag's repository to show a tag proves nothing.
	local tag="$1"
	docker build -q --build-arg BUILD_VERSION="$tag" --label "drill=$tag" \
		-t "$REG_HOST/$REPO:$tag" ../16-gitops-delivery/app >/dev/null
	docker push -q "$REG_HOST/$REPO:$tag" >/dev/null
	crane digest "$REG_HOST/$REPO:$tag"
}

# ---------------------------------------------------------------------------
good_ref="$REG_CLUSTER/$REPO:$GOOD_TAG"
[[ "${1:-}" == "--ci" ]] && good_ref="${IMAGE:?IMAGE=<signed ghcr image with digest> required with --ci}"

expect admitted case1-signed "$good_ref" "signed, SBOM and provenance attested by the trusted attestor"
if kubectl -n "$NS" get pod case1-signed >/dev/null 2>&1; then
	admitted_as=$(kubectl -n "$NS" get pod case1-signed -o jsonpath='{.spec.containers[0].image}')
	if [[ "$admitted_as" == *@sha256:* ]]; then
		echo "   tag rewritten to digest: ${admitted_as##*@}"
	else
		echo "   FAIL: image was not rewritten to a digest ($admitted_as)"; fail=$((fail + 1))
	fi
fi

# ---------------------------------------------------------------------------
unsigned_digest=$(push_variant unsigned)
expect refused case2-unsigned "$REG_CLUSTER/$REPO@$unsigned_digest" "rebuilt from the same source, never signed"

# ---------------------------------------------------------------------------
tampered_digest=$(push_variant tampered)
if [[ ! -f "$LOCAL/attacker.key" ]]; then
	(cd "$LOCAL" && COSIGN_PASSWORD="" cosign generate-key-pair --output-key-prefix attacker >/dev/null 2>&1)
fi
cosign sign --key "$LOCAL/attacker.key" -y "$REG_HOST/$REPO@$tampered_digest" >/dev/null 2>&1
cosign attest --key "$LOCAL/attacker.key" -y --type spdxjson \
	--predicate <(echo '{"spdxVersion":"SPDX-2.3","name":"forged","packages":[]}') \
	"$REG_HOST/$REPO@$tampered_digest" >/dev/null 2>&1
expect refused case3-wrong-signer "$REG_CLUSTER/$REPO@$tampered_digest" "tampered build, validly signed and attested by a key the cluster does not trust"

# ---------------------------------------------------------------------------
if [[ -f "$KEY" ]]; then
	nosbom_digest=$(push_variant nosbom)
	cosign sign --key "$KEY" -y "$REG_HOST/$REPO@$nosbom_digest" >/dev/null 2>&1
	expect refused case4-no-sbom "$REG_CLUSTER/$REPO@$nosbom_digest" "signed by the trusted key, but no SBOM or provenance attached"
elif [[ -n "${NOSBOM_IMAGE:-}" ]]; then
	expect refused case4-no-sbom "$NOSBOM_IMAGE" "signed by the trusted CI identity, but no SBOM or provenance attached"
else
	echo; echo "==> case4-no-sbom skipped: no trusted key here and no NOSBOM_IMAGE given"
fi

# ---------------------------------------------------------------------------
expect refused case5-foreign-registry "docker.io/library/busybox:1.36" "not from the allowed repository at all; refused before any signature is looked at"

# ---------------------------------------------------------------------------
echo
kubectl -n "$NS" delete pod case1-signed --ignore-not-found --wait=false >/dev/null 2>&1 || true
total=$((pass + fail))
if [[ "$fail" -eq 0 ]]; then
	echo "PASS: $pass/$total. One image got in, and it was the one that should have."
	exit 0
fi
echo "FAIL: $fail of $total cases did not go the way the policy says they must."
exit 1
