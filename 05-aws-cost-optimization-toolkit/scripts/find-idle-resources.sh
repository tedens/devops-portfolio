#!/bin/bash
# Find idle or unused AWS resources to help reduce costs

REGION=${1:-us-east-1}
PROFILE=${2:-fanout}

echo "Checking for unattached EBS volumes..."
aws ec2 describe-volumes \
  --region "$REGION" \
  --profile "$PROFILE" \
  --filters Name=status,Values=available \
  --query "Volumes[*].{ID:VolumeId,Size:Size,AZ:AvailabilityZone}" \
  --output table

echo -e "\nChecking for unused Elastic IPs..."
aws ec2 describe-addresses \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query "Addresses[?AssociationId==null].[PublicIp,AllocationId]" \
  --output table

echo -e "\nChecking for NAT Gateways in 'available' state..."
aws ec2 describe-nat-gateways \
  --region "$REGION" \
  --profile "$PROFILE" \
  --filter Name=state,Values=available \
  --query "NatGateways[*].{ID:NatGatewayId,Subnet:SubnetId,State:State}" \
  --output table

echo -e "\nDone."
