#!/usr/bin/env bash
#
# Verifies an image the way the cluster does, from outside the cluster.
#
#   ./scripts/verify.sh localhost:5001/demo-service@sha256:...          local key
#   ./scripts/verify.sh ghcr.io/tedens/devops-portfolio/demo-service@sha256:...   keyless
#
# Anyone with cosign can run the second form against the public image and
# reach the same verdict the admission controller reached, without trusting
# this repository's CI logs. That is what a transparency log buys.

set -euo pipefail
cd "$(dirname "$0")/.."
source bootstrap/versions.env

REF="${1:?image reference with digest}"
export COSIGN_PASSWORD="${COSIGN_PASSWORD:-}"

if [[ "$REF" == localhost:* || "$REF" == kind-registry:* ]]; then
	args=(--key .local/cosign.pub)
	echo "local key; entries were uploaded to the public transparency log, so it is checked"
else
	args=(--certificate-oidc-issuer https://token.actions.githubusercontent.com
		--certificate-identity "https://github.com/tedens/devops-portfolio/.github/workflows/supply-chain.yml@refs/heads/main")
	echo "keyless: identity must be this repository's supply-chain workflow on main"
fi

step() { printf '\n--- %s\n' "$*"; }

step "signature"
cosign verify "${args[@]}" "$REF" 2>/dev/null | jq -r '.[0].optional // {} | to_entries[] | "  \(.key): \(.value)"' || { echo "  NOT VERIFIED"; exit 1; }
echo "  ok"

step "SBOM attestation (spdx)"
cosign verify-attestation "${args[@]}" --type spdxjson "$REF" 2>/dev/null \
	| jq -r '.payload' | base64 -d | jq -r '"  \(.predicate.packages | length) packages, created \(.predicate.creationInfo.created)"'

step "provenance attestation (slsa v0.2)"
prov_args=("${args[@]}")
if [[ "$REF" != localhost:* && "$REF" != kind-registry:* ]]; then
	# Signed by the generator, not by this workflow. Verifying it against the
	# workflow's identity would fail, and it should.
	prov_args=(--certificate-oidc-issuer https://token.actions.githubusercontent.com
		--certificate-identity-regexp '^https://github\.com/slsa-framework/slsa-github-generator/\.github/workflows/generator_container_slsa3\.yml@refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$')
fi
prov=$(cosign verify-attestation "${prov_args[@]}" --type slsaprovenance "$REF" 2>/dev/null | jq -r '.payload' | base64 -d)
jq -r '"  builder: \(.predicate.builder.id)\n  buildType: \(.predicate.buildType)"' <<<"$prov"
if [[ "$REF" != localhost:* && "$REF" != kind-registry:* ]]; then
	# The generator signs with its own identity, not this repo's workflow. A
	# provenance that the workflow could have written itself is not provenance.
	echo "  (attested by slsa-github-generator, not by this workflow: that is the point)"
fi

step "SBOM contents: packages by type"
cosign verify-attestation "${args[@]}" --type spdxjson "$REF" 2>/dev/null \
	| jq -r '.payload' | base64 -d | jq -r '[.predicate.packages[] | .externalRefs[]? | select(.referenceType=="purl") | .referenceLocator | split(":")[1] | split("/")[0]] | group_by(.) | map("  \(.[0]): \(length)") | .[]'
