#!/usr/bin/env bash
# Audits AWS resources for missing required tags and applies them at the end
# Usage: ./tag-audit.sh [region] [profile] --owner <value> --project <value> --env <value>

REGION="us-east-2"
PROFILE="fanout"
declare -A TAG_INPUTS
REQUIRED_TAGS=("owner" "project" "env")

# Parse CLI arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner|--project|--env)
      KEY="${1/--/}"
      TAG_INPUTS[$KEY]="$2"
      shift 2
      ;;
    *)
      if [[ -z "$REGION_SET" ]]; then REGION="$1"; REGION_SET=1
      elif [[ -z "$PROFILE_SET" ]]; then PROFILE="$1"; PROFILE_SET=1
      else shift
      fi
      shift
      ;;
  esac
done

# Validate tag values
for TAG in "${REQUIRED_TAGS[@]}"; do
  if [[ -z "${TAG_INPUTS[$TAG]}" ]]; then
    echo "Missing required --$TAG argument"
    exit 1
  fi
done

# Track resources needing tags
declare -a RESOURCES_TO_TAG
declare -a RESOURCE_LABELS

function audit_tags() {
  local RESOURCE_TYPE="$1"
  local IDS=("${!2}")

  for ID in "${IDS[@]}"; do
    TAGS=$(aws ec2 describe-tags \
      --region "$REGION" \
      --profile "$PROFILE" \
      --filters Name=resource-id,Values="$ID" \
      --query "Tags[*].[Key,Value]" \
      --output text)

    MISSING_TAGS=()

    for TAG in "${REQUIRED_TAGS[@]}"; do
      if ! grep -qi "^${TAG}[[:space:]]" <<< "$TAGS"; then
        MISSING_TAGS+=("$TAG")
      fi
    done

    if [ ${#MISSING_TAGS[@]} -gt 0 ]; then
      echo "$RESOURCE_TYPE $ID is missing tags: ${MISSING_TAGS[*]}"
      RESOURCES_TO_TAG+=("$ID")
      RESOURCE_LABELS+=("$RESOURCE_TYPE $ID")
    fi
  done
}

echo "Auditing for missing tags in region [$REGION] using profile [$PROFILE]..."

VOLUMES=($(aws ec2 describe-volumes \
  --region "$REGION" \
  --profile "$PROFILE" \
  --filters Name=status,Values=available \
  --query "Volumes[*].VolumeId" \
  --output text))
audit_tags "EBS Volume" VOLUMES[@]

INSTANCES=($(aws ec2 describe-instances \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query "Reservations[*].Instances[*].InstanceId" \
  --output text))
audit_tags "EC2 Instance" INSTANCES[@]

SNAPSHOTS=($(aws ec2 describe-snapshots \
  --region "$REGION" \
  --profile "$PROFILE" \
  --owner-ids self \
  --query "Snapshots[*].SnapshotId" \
  --output text))
audit_tags "EC2 Snapshot" SNAPSHOTS[@]

IMAGES=($(aws ec2 describe-images \
  --region "$REGION" \
  --profile "$PROFILE" \
  --owners self \
  --query "Images[*].ImageId" \
  --output text))
audit_tags "EC2 AMI" IMAGES[@]

if [ ${#RESOURCES_TO_TAG[@]} -eq 0 ]; then
  echo "All resources have required tags."
  exit 0
fi

echo
read -p "Apply required tags to all ${#RESOURCES_TO_TAG[@]} resources listed above? (y/N): " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
  for ID in "${RESOURCES_TO_TAG[@]}"; do
    aws ec2 create-tags \
      --region "$REGION" \
      --profile "$PROFILE" \
      --resources "$ID" \
      --tags \
        Key=owner,Value="${TAG_INPUTS[owner]}" \
        Key=project,Value="${TAG_INPUTS[project]}" \
        Key=env,Value="${TAG_INPUTS[env]}" >/dev/null
  done
  echo "Tags applied to ${#RESOURCES_TO_TAG[@]} resources."
else
  echo "No changes made."
fi

echo "Tag audit complete."
