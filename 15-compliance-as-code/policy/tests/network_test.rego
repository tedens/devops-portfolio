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
