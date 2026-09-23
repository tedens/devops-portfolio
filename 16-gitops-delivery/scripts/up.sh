#!/usr/bin/env bash
#
# Brings up a kind cluster with Argo CD and Argo Rollouts, builds the demo
# images, and applies the app of apps. Idempotent: running it twice is safe
# and skips what already exists.
#
#   ./scripts/up.sh              cluster from git (Argo CD pulls this repo)
#   ./scripts/up.sh --local      apply manifests directly, no git round trip
#
# --local exists because the whole point of GitOps is that the cluster follows
# a branch. While iterating on the manifests that means pushing to main to see
# a change, which is a slow and bad idea. --local skips Argo CD's pull and
# applies from the working tree, so the drill can be developed offline; the
# default path is the real one.

set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=../bootstrap/versions.env
source bootstrap/versions.env

CLUSTER="${CLUSTER:-gitops-demo}"
LOCAL=false
[[ "${1:-}" == "--local" ]] && LOCAL=true

log() { printf '\n==> %s\n' "$*"; }

need() {
	command -v "$1" >/dev/null 2>&1 || {
		echo "missing: $1" >&2
		exit 1
	}
}
need kind
need kubectl
need docker

# ---------------------------------------------------------------------------

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
	log "cluster $CLUSTER already exists"
else
	log "creating cluster $CLUSTER on $KIND_NODE_IMAGE"
	kind create cluster --name "$CLUSTER" --image "$KIND_NODE_IMAGE" --wait 120s
fi

kubectl config use-context "kind-$CLUSTER" >/dev/null

# ---------------------------------------------------------------------------

log "building images"
# v1 is healthy. broken fails 60% of requests and is a real artifact built
# from the same source, not a flag flipped on a good one: a rollback that has
# only been tested against a toggle has not been tested.
docker build -q \
	--build-arg BUILD_VERSION=v1 --build-arg FAIL_RATE=0 \
	-t demo-service:v1 app >/dev/null

docker build -q \
	--build-arg BUILD_VERSION=v2-broken --build-arg FAIL_RATE=0.6 \
	-t demo-service:broken app >/dev/null

docker build -q \
	--build-arg BUILD_VERSION=v2 --build-arg FAIL_RATE=0 \
	-t demo-service:v2 app >/dev/null

log "loading images into the cluster"
# kind nodes have their own image store; a local docker build is invisible to
# them. imagePullPolicy is IfNotPresent so this is what makes the tags
# resolvable without a registry.
kind load docker-image --name "$CLUSTER" demo-service:v1 demo-service:broken demo-service:v2 >/dev/null

# ---------------------------------------------------------------------------

log "installing Argo CD $ARGOCD_VERSION"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl apply -n argocd \
	-f "https://raw.githubusercontent.com/argoproj/argo-cd/$ARGOCD_VERSION/manifests/install.yaml" >/dev/null

log "installing Argo Rollouts $ARGO_ROLLOUTS_VERSION"
kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl apply -n argo-rollouts \
	-f "https://github.com/argoproj/argo-rollouts/releases/download/$ARGO_ROLLOUTS_VERSION/install.yaml" >/dev/null

log "waiting for controllers"
kubectl -n argocd rollout status deploy/argocd-repo-server --timeout=300s
kubectl -n argocd rollout status deploy/argocd-server --timeout=300s
kubectl -n argo-rollouts rollout status deploy/argo-rollouts --timeout=300s

# ---------------------------------------------------------------------------

if [[ "$LOCAL" == true ]]; then
	log "applying manifests from the working tree (--local)"
	kubectl apply -f manifests/demo-service/namespace.yaml
	kubectl apply -f manifests/monitoring/
	kubectl apply -f manifests/demo-service/
else
	log "applying the app of apps"
	kubectl apply -f apps/root.yaml
	echo "Argo CD will now pull $(grep -m1 repoURL apps/root.yaml | awk '{print $2}')"
	echo "Children appear once it has synced; watch with:"
	echo "  kubectl -n argocd get applications -w"
fi

log "waiting for the workload"
kubectl -n monitoring rollout status deploy/prometheus --timeout=300s
kubectl -n demo rollout status deploy/loadgen --timeout=300s

# A Rollout is not a Deployment; kubectl rollout status does not understand it.
for _ in $(seq 1 60); do
	ready=$(kubectl -n demo get rollout demo-service -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
	[[ "${ready:-0}" -ge 1 ]] && break
	sleep 5
done

log "up"
kubectl -n demo get rollout demo-service -o wide 2>/dev/null || true
echo
echo "Argo CD UI:   kubectl -n argocd port-forward svc/argocd-server 8080:443"
echo "Prometheus:   kubectl -n monitoring port-forward svc/prometheus 9090:9090"
echo "Run a drill:  ./scripts/rollback-drill.sh"
