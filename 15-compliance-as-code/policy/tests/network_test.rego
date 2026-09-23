# Policies are code, so they get tests. A policy that silently stops matching
# after a provider schema change is worse than no policy, because the green
# build says everything is fine.

package terraform.network_test

import data.terraform.network
import rego.v1

sg(ingress) := {"resource": {"aws_security_group": {"db": [{"ingress": ingress}]}}}

test_denies_mysql_from_the_internet if {
	r := network.deny with input as sg([{
		"from_port": 3306, "to_port": 3306,
		"cidr_blocks": ["0.0.0.0/0"],
	}])
	count(r) == 1
}

test_denies_data_port_inside_a_wide_range if {
	# A range that happens to span Postgres still exposes Postgres.
	r := network.deny with input as sg([{
		"from_port": 1000, "to_port": 9999,
		"cidr_blocks": ["0.0.0.0/0"],
	}])
	count(r) > 0
}

test_denies_ipv6_wildcard if {
	r := network.deny with input as sg([{
		"from_port": 5432, "to_port": 5432,
		"cidr_blocks": ["::/0"],
	}])
	count(r) == 1
}

test_allows_data_port_from_a_private_range if {
	r := network.deny with input as sg([{
		"from_port": 3306, "to_port": 3306,
		"cidr_blocks": ["10.0.0.0/8"],
	}])
	count(r) == 0
}

test_allows_security_group_reference if {
	# The pattern the DR project uses: no CIDR at all.
	r := network.deny with input as sg([{
		"from_port": 3306, "to_port": 3306,
		"security_groups": ["sg-123"],
	}])
	count(r) == 0
}

test_denies_ssh_from_the_internet if {
	r := network.deny with input as sg([{
		"from_port": 22, "to_port": 22,
		"cidr_blocks": ["0.0.0.0/0"],
	}])
	count(r) == 1
}

test_denies_publicly_accessible_database if {
	r := network.deny with input as {"resource": {"aws_db_instance": {"restored": [{"publicly_accessible": true}]}}}
	count(r) == 1
}

test_allows_private_database if {
	r := network.deny with input as {"resource": {"aws_db_instance": {"restored": [{"publicly_accessible": false}]}}}
	count(r) == 0
}

test_warns_on_public_ip_subnet if {
	r := network.warn with input as {"resource": {"aws_subnet": {"public": [{"map_public_ip_on_launch": true}]}}}
	count(r) == 1
}

# ---------------------------------------------------------------------------
# aws_vpc_security_group_ingress_rule
#
# Every case below passed the policy clean before the standalone-resource
# rules were added, including a wide open port 22. The inline-block rules and
# these have to stay in step, because a project can use either syntax and
# 08 now uses this one.
# ---------------------------------------------------------------------------

rule(body) := {"resource": {"aws_vpc_security_group_ingress_rule": {"r": [body]}}}

test_standalone_rule_denies_ssh_from_the_internet if {
	r := network.deny with input as rule({
		"security_group_id": "sg-1",
		"cidr_ipv4": "0.0.0.0/0",
		"ip_protocol": "tcp",
		"from_port": 22, "to_port": 22,
	})
	count(r) == 1
}

test_standalone_rule_denies_postgres_from_the_internet if {
	r := network.deny with input as rule({
		"cidr_ipv4": "0.0.0.0/0",
		"ip_protocol": "tcp",
		"from_port": 5432, "to_port": 5432,
	})
	count(r) == 1
}

test_standalone_rule_denies_ipv6_wildcard if {
	r := network.deny with input as rule({
		"cidr_ipv6": "::/0",
		"ip_protocol": "tcp",
		"from_port": 22, "to_port": 22,
	})
	count(r) == 1
}

test_standalone_rule_denies_all_protocols if {
	# ip_protocol "-1" carries no from_port or to_port at all. A range check
	# alone would never fire on it, so this is the case most likely to be
	# missed, and it is the one that exposes everything.
	r := network.deny with input as rule({
		"cidr_ipv4": "0.0.0.0/0",
		"ip_protocol": "-1",
	})
	count(r) > 0
}

test_standalone_rule_denies_data_port_inside_a_range if {
	r := network.deny with input as rule({
		"cidr_ipv4": "0.0.0.0/0",
		"ip_protocol": "tcp",
		"from_port": 1000, "to_port": 9999,
	})
	count(r) > 0
}

test_standalone_rule_allows_security_group_reference if {
	# The fix this policy is asking for: no CIDR at all.
	r := network.deny with input as rule({
		"referenced_security_group_id": "sg-2",
		"ip_protocol": "tcp",
		"from_port": 22, "to_port": 22,
	})
	count(r) == 0
}

test_standalone_rule_allows_https_from_the_internet if {
	# An identity-aware proxy is meant to be reachable. 443 is neither a data
	# port nor an admin port, so this must not fire; if it did, 08 could not
	# be expressed at all and the rule would be turned off.
	r := network.deny with input as rule({
		"cidr_ipv4": "0.0.0.0/0",
		"ip_protocol": "tcp",
		"from_port": 443, "to_port": 443,
	})
	count(r) == 0
}

test_standalone_rule_allows_internal_cidr if {
	r := network.deny with input as rule({
		"cidr_ipv4": "10.10.0.0/16",
		"ip_protocol": "tcp",
		"from_port": 22, "to_port": 22,
	})
	count(r) == 0
}
