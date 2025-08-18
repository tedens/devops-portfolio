import boto3
import json
import logging
import os
import random
import string
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secrets_client = boto3.client('secretsmanager')

def lambda_handler(event, context):
    logger.info(f"Rotation function triggered with event: {json.dumps(event)}")

    step = event['Step']
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']

    # Confirm the secret version is staged correctly
    metadata = secrets_client.describe_secret(SecretId=secret_arn)
    if not metadata['RotationEnabled']:
        raise ValueError("Rotation not enabled for this secret")

    versions = metadata['VersionIdsToStages']
    if token not in versions or "AWSCURRENT" in versions[token]:
        raise ValueError("Invalid or duplicate version token")

    if step == "createSecret":
        create_secret(secret_arn, token)
    elif step == "setSecret":
        set_secret(secret_arn, token)
    elif step == "testSecret":
        test_secret(secret_arn, token)
    elif step == "finishSecret":
        finish_secret(secret_arn, token)
    else:
        raise ValueError(f"Unknown step '{step}'")

def create_secret(secret_arn, token):
    try:
        # Check if secret version already exists
        secrets_client.get_secret_value(SecretId=secret_arn, VersionId=token)
        logger.info("createSecret: A pending secret version already exists.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            new_secret = {
                "username": "auto-rotated-user",
                "password": generate_password()
            }
            secrets_client.put_secret_value(
                SecretId=secret_arn,
                ClientRequestToken=token,
                SecretString=json.dumps(new_secret),
                VersionStages=["AWSPENDING"]
            )
            logger.info("createSecret: New secret version created.")
        else:
            raise

def set_secret(secret_arn, token):
    # Example: Apply new credentials to external service (e.g., DB or API)
    logger.info("setSecret: Skipped — customize this step if needed.")

def test_secret(secret_arn, token):
    # Example: Attempt to auth with AWSPENDING secret
    logger.info("testSecret: Skipped — implement connection validation if needed.")

def finish_secret(secret_arn, token):
    metadata = secrets_client.describe_secret(SecretId=secret_arn)
    current_version = None
    for version, stages in metadata['VersionIdsToStages'].items():
        if "AWSCURRENT" in stages:
            current_version = version
            break

    if current_version == token:
        logger.info("finishSecret: Version already marked as AWSCURRENT.")
        return

    # Finalize version
    secrets_client.update_secret_version_stage(
        SecretId=secret_arn,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version
    )
    logger.info("finishSecret: AWSCURRENT stage moved to new version.")

def generate_password(length=24):
    chars = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    return ''.join(random.SystemRandom().choice(chars) for _ in range(length))