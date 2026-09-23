# The bug these exist to prevent.
#
# The HCL parser returns a resource as an object when there is one block and
# an array when there are several, and conftest changed which it did between
# versions. The original policies assumed an array, so on real input they
# stopped matching entirely while every other test stayed green. These pin
# both shapes.

package terraform.shape_test

import data.terraform.encryption
import data.terraform.identity
import data.terraform.network
import rego.v1

open_mysql := {
	"from_port": 3306,
	"to_port": 3306,
	"cidr_blocks": ["0.0.0.0/0"],
}

# --- resource emitted as a bare object (single block) --------------------

test_object_shape_security_group if {
	r := network.deny with input as {"resource": {"aws_security_group": {"db": {"ingress": open_mysql}}}}
	count(r) == 1
}

test_object_shape_db_instance if {
	r := network.deny with input as {"resource": {"aws_db_instance": {"d": {"publicly_accessible": true}}}}
	count(r) == 1
}

test_object_shape_instance_metadata if {
	r := identity.deny with input as {"resource": {"aws_instance": {"b": {"metadata_options": {"http_tokens": "optional"}}}}}
	count(r) == 1
}

test_object_shape_root_volume if {
	r := encryption.deny with input as {"resource": {"aws_instance": {"b": {
		"metadata_options": {"http_tokens": "required"},
		"root_block_device": {"encrypted": false},
	}}}}
	count(r) == 1
}

# --- resource emitted as an array (several blocks) -----------------------

test_array_shape_security_group if {
	r := network.deny with input as {"resource": {"aws_security_group": {"db": [{"ingress": [open_mysql]}]}}}
	count(r) == 1
}

test_array_shape_instance_metadata if {
	r := identity.deny with input as {"resource": {"aws_instance": {"b": [{"metadata_options": [{"http_tokens": "optional"}]}]}}}
	count(r) == 1
}

# --- several resources of the same type ----------------------------------
# The original comprehension keyed an object by resource name and blew up
# with eval_conflict_error the moment two blocks shared a key.

test_multiple_security_groups_do_not_conflict if {
	r := network.deny with input as {"resource": {"aws_security_group": {
		"a": [{"ingress": [open_mysql]}],
		"b": [{"ingress": [{"from_port": 22, "to_port": 22, "cidr_blocks": ["0.0.0.0/0"]}]}],
	}}}
	count(r) == 2
}

test_multiple_ingress_blocks_on_one_group if {
	r := network.deny with input as {"resource": {"aws_security_group": {"a": [{"ingress": [
		{"from_port": 3023, "to_port": 3026, "cidr_blocks": ["0.0.0.0/0"]},
		open_mysql,
	]}]}}}
	count(r) == 1
}
