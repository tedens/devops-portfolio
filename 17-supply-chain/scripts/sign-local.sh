#!/usr/bin/env bash
#
# Builds the demo service, pushes it to the local registry, signs it, attaches
# an SBOM and a provenance attestation, and installs the admission policy that
# trusts the key that did the signing.
#
# The key pair is generated here, kept under .local/, and never committed. In
# CI there is no key at all: the workflow signs with its OIDC identity and the
# policy names that identity. Same policy, different attestor file.
#
# The provenance attached here is a stand-in. It is a SLSA v0.2 predicate this
# script writes about itself, which is exactly as trustworthy as the machine
# it ran on. CI uses the slsa-github-generator, where the builder attests and
# the workflow cannot forge it. The policy requires the attestation to exist
# and be signed by the trusted attestor; whether it is worth anything depends
# on who the attestor is, which is the point of the two attestor files.

set -euo pipefail
cd "$(dirname "$0")/.."
source bootstrap/versions.env

REG_HOST=localhost:5001
REG_CLUSTER=kind-registry:5000
REPO=demo-service
TAG="${1:-v1}"
LOCAL=.local
export COSIGN_PASSWORD="${COSIGN_PASSWORD:-}"

log() { printf '\n==> %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1 ($2)" >&2; exit 1; }; }
need cosign "pin: $COSIGN_VERSION"; need syft "pin: $SYFT_VERSION"; need crane "pin: $CRANE_VERSION"; need docker ""; need kubectl ""

have=$(cosign version 2>/dev/null | awk '/GitVersion/ {print $2}')
if [[ "$have" != "$COSIGN_VERSION" ]]; then
	echo "cosign is $have, this project pins $COSIGN_VERSION (see bootstrap/versions.env for why)" >&2
	exit 1
fi

mkdir -p "$LOCAL"

# ---------------------------------------------------------------------------
log "building $REPO:$TAG from ../16-gitops-delivery/app"
docker build -q --build-arg BUILD_VERSION="$TAG" -t "$REG_HOST/$REPO:$TAG" ../16-gitops-delivery/app >/dev/null
docker push -q "$REG_HOST/$REPO:$TAG" >/dev/null
DIGEST=$(crane digest "$REG_HOST/$REPO:$TAG")
REF="$REG_HOST/$REPO@$DIGEST"
echo "  $REF"

# ---------------------------------------------------------------------------
if [[ ! -f "$LOCAL/cosign.key" ]]; then
	log "generating a key pair under $LOCAL (gitignored)"
	(cd "$LOCAL" && cosign generate-key-pair >/dev/null 2>&1)
fi

log "signing (and uploading to the public transparency log)"
# Signatures bind to the digest, never the tag. Signing a tag is signing
# whatever the tag happens to point at right now.
#
# The entry written to rekor.sigstore.dev is public and permanent: this
# throwaway public key, the digest of a demo image, and the registry path.
# Nothing else. See policy/attestors/local-key.yaml for why it is not
# skipped.
cosign sign --key "$LOCAL/cosign.key" -y "$REF" >/dev/null

log "SBOM"
syft -q "$REF" -o spdx-json > "$LOCAL/sbom.spdx.json"
echo "  $(jq '.packages | length' "$LOCAL/sbom.spdx.json") packages"
cosign attest --key "$LOCAL/cosign.key" -y \
	--type spdxjson --predicate "$LOCAL/sbom.spdx.json" "$REF" >/dev/null

log "provenance (self-attested stand-in; see header)"
# No hostname, username or path from this machine goes into the predicate.
# The attestation payload is uploaded to the public transparency log and
# cannot be removed; the first version of this script put the workstation's
# hostname in builder.id, and it is there for good.
jq -n --arg digest "${DIGEST#sha256:}" --arg repo "$REG_HOST/$REPO" --arg tag "$TAG" \
	--arg when "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '{
  builder: { id: "local://17-supply-chain/scripts/sign-local.sh" },
  buildType: "https://github.com/tedens/devops-portfolio/17-supply-chain/local-build@v1",
  invocation: { configSource: { uri: "file://../16-gitops-delivery/app", entryPoint: "Dockerfile" },
                parameters: { tag: $tag } },
  metadata: { buildStartedOn: $when, buildFinishedOn: $when,
              completeness: { parameters: true, environment: false, materials: false },
              reproducible: false },
  materials: [{ uri: "file://../16-gitops-delivery/app" }]
}' > "$LOCAL/provenance.json"
cosign attest --key "$LOCAL/cosign.key" -y \
	--type slsaprovenance --predicate "$LOCAL/provenance.json" "$REF" >/dev/null

echo "  artifacts now attached:"
crane ls "$REG_HOST/$REPO" | sed 's/^/    /'

# ---------------------------------------------------------------------------
log "installing the admission policy that trusts $LOCAL/cosign.pub"
ruby scripts/render-policy.rb local "$REG_CLUSTER/$REPO" "$LOCAL/cosign.pub" > "$LOCAL/rendered-policy.yaml"
kubectl apply -f "$LOCAL/rendered-policy.yaml"

# Kyverno needs a moment to register the webhook for a new policy. Deploying
# in that gap is admitted without being checked, which is the failure mode
# every step of this project is trying to make loud.
sleep 8

log "signed and verifiable"
echo "  in-cluster reference:  $REG_CLUSTER/$REPO:$TAG"
echo "  verify from the host:  ./scripts/verify.sh $REF"
echo "  now run:               ./scripts/tamper-drill.sh"
