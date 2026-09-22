package terraform.identity_test

import data.terraform.identity
import rego.v1

test_denies_imdsv1 if {
	r := identity.deny with input as {"resource": {"aws_instance": {"b": [{"metadata_options": [{"http_tokens": "optional"}]}]}}}
	count(r) == 1
}

test_allows_imdsv2 if {
	r := identity.deny with input as {"resource": {"aws_instance": {"b": [{"metadata_options": [{"http_tokens": "required"}]}]}}}
	count(r) == 0
}

test_denies_missing_metadata_options if {
	r := identity.deny with input as {"resource": {"aws_instance": {"b": [{"ami": "ami-1"}]}}}
	count(r) == 1
}

test_denies_admin_policy_document if {
	r := identity.deny with input as {"data": {"aws_iam_policy_document": {"p": [{"statement": [{"actions": ["*"], "resources": ["*"]}]}]}}}
	count(r) == 1
}

test_allows_scoped_policy_document if {
	r := identity.deny with input as {"data": {"aws_iam_policy_document": {"p": [{"statement": [{"actions": ["s3:GetObject"], "resources": ["arn:aws:s3:::b/*"]}]}]}}}
	count(r) == 0
}

test_warns_on_ssh_key_pair if {
	r := identity.warn with input as {"resource": {"aws_instance": {"b": [{"key_name": "prod"}]}}}
	count(r) == 1
}
