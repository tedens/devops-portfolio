#!/usr/bin/env bash
#
# kind cluster + local registry + Kyverno, pinned. Idempotent.
#
# Two names for one registry, on purpose:
#   localhost:5001        what the host pushes to and what cosign signs
#   kind-registry:5000    what containerd on the node and Kyverno's pods pull
# Same bytes, same digests, so a signature made against one verifies against
# the other. Signatures are bound to digests, not names.

set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=../bootstrap/versions.env
source bootstrap/versions.env

CLUSTER=supply-chain-demo
REG_NAME=kind-registry
REG_PORT=5001

log() { printf '\n==> %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }; }
need kind; need kubectl; need docker

# ---------------------------------------------------------------------------
log "registry $REG_NAME on 127.0.0.1:$REG_PORT"
if [[ "$(docker inspect -f '{{.State.Running}}' "$REG_NAME" 2>/dev/null)" != "true" ]]; then
	docker rm -f "$REG_NAME" >/dev/null 2>&1 || true
	docker run -d --restart=always -p "127.0.0.1:${REG_PORT}:5000" \
		--network bridge --name "$REG_NAME" "$REGISTRY_IMAGE" >/dev/null
fi
until curl -fs "http://127.0.0.1:${REG_PORT}/v2/" >/dev/null; do sleep 1; done

# ---------------------------------------------------------------------------
if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
	log "cluster $CLUSTER already exists"
else
	log "creating cluster $CLUSTER on $KIND_NODE_IMAGE"
	kind create cluster --config bootstrap/kind-config.yaml --image "$KIND_NODE_IMAGE" --wait 120s
fi
kubectl config use-context "kind-$CLUSTER" >/dev/null

# containerd: both names resolve to the plain-HTTP registry. Without the
# second entry containerd assumes https for any non-localhost host and the
# pull fails with a TLS error that says nothing about the real cause.
log "pointing containerd at the registry"
for node in $(kind get nodes --name "$CLUSTER"); do
	for host in "localhost:${REG_PORT}" "${REG_NAME}:5000"; do
		dir="/etc/containerd/certs.d/${host}"
		docker exec "$node" mkdir -p "$dir"
		printf '[host."http://%s:5000"]\n' "$REG_NAME" | docker exec -i "$node" cp /dev/stdin "$dir/hosts.toml"
	done
done

if [[ "$(docker inspect -f '{{json .NetworkSettings.Networks.kind}}' "$REG_NAME")" == "null" ]]; then
	docker network connect kind "$REG_NAME"
fi

kubectl apply -f - >/dev/null <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${REG_PORT}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF

# ---------------------------------------------------------------------------
log "installing Kyverno $KYVERNO_VERSION"
kubectl create namespace kyverno --dry-run=client -o yaml | kubectl apply -f - >/dev/null
# Server-side apply: the CRDs are large enough that client-side apply's
# last-applied annotation blows the 256KB object limit.
kubectl apply --server-side --force-conflicts \
	-f "https://github.com/kyverno/kyverno/releases/download/${KYVERNO_VERSION}/install.yaml" >/dev/null

log "waiting for Kyverno"
for d in kyverno-admission-controller kyverno-background-controller kyverno-cleanup-controller kyverno-reports-controller; do
	kubectl -n kyverno rollout status "deploy/$d" --timeout=300s
done

kubectl create namespace demo --dry-run=client -o yaml | kubectl apply -f - >/dev/null

log "up"
echo "registry:   localhost:${REG_PORT} (host)  ${REG_NAME}:5000 (cluster)"
echo "next:       ./scripts/sign-local.sh   then   ./scripts/tamper-drill.sh"
