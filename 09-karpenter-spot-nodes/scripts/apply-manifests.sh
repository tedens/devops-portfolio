#!/usr/bin/env bash
# Apply the NodePools and EC2NodeClass to a cluster.
#
#   ./apply-manifests.sh my-cluster
#
# The manifests carry CLUSTER_NAME as a placeholder rather than a real name,
# so they can live in git without being tied to one account.

set -euo pipefail

CLUSTER="${1:?usage: apply-manifests.sh <cluster-name>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for f in "${HERE}/../manifests/ec2nodeclass.yaml" \
         "${HERE}/../manifests/nodepool-spot.yaml" \
         "${HERE}/../manifests/nodepool-ondemand.yaml"; do
  sed "s/CLUSTER_NAME/${CLUSTER}/g" "$f" | kubectl apply -f -
done

echo
echo "Subnets and security groups must carry karpenter.sh/discovery=${CLUSTER}:"
echo "  aws ec2 describe-subnets --filters Name=tag:karpenter.sh/discovery,Values=${CLUSTER} \\"
echo "    --query 'Subnets[].SubnetId' --output text"
