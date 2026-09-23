#!/usr/bin/env bash
# Deletes the kind cluster. The images stay in the local docker store.
set -euo pipefail
CLUSTER="${CLUSTER:-gitops-demo}"
kind delete cluster --name "$CLUSTER"
