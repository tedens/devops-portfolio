package terraform.encryption_test

import data.terraform.encryption
import rego.v1

test_denies_unencrypted_database if {
	r := encryption.deny with input as {"resource": {"aws_db_instance": {"db": [{"storage_encrypted": false}]}}}
	count(r) == 1
}

test_allows_encrypted_database if {
	r := encryption.deny with input as {"resource": {"aws_db_instance": {"db": [{"storage_encrypted": true}]}}}
	count(r) == 0
}

test_denies_database_with_encryption_unset if {
	# Absent is not the same as false to a human, but it is to AWS.
	r := encryption.deny with input as {"resource": {"aws_db_instance": {"db": [{"identifier": "x"}]}}}
	count(r) == 1
}

test_denies_unencrypted_root_volume if {
	r := encryption.deny with input as {"resource": {"aws_instance": {"v": [{"root_block_device": [{"encrypted": false}]}]}}}
	count(r) == 1
}

test_allows_encrypted_root_volume if {
	r := encryption.deny with input as {"resource": {"aws_instance": {"v": [{"root_block_device": [{"encrypted": true}]}]}}}
	count(r) == 0
}

test_allows_sqs_with_managed_sse if {
	r := encryption.deny with input as {"resource": {"aws_sqs_queue": {"q": [{"sqs_managed_sse_enabled": true}]}}}
	count(r) == 0
}

test_denies_plain_sqs if {
	r := encryption.deny with input as {"resource": {"aws_sqs_queue": {"q": [{"name": "q"}]}}}
	count(r) == 1
}
