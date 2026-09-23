# Network exposure rules.
#
# These encode decisions an organisation has made, which is why they live here
# rather than relying on a scanner's defaults. Trivy already knows that an open
# security group is bad in general; it does not know that this organisation
# treats any data port reachable from the internet as a release blocker.

package terraform.network

import data.terraform.common
import rego.v1

# Ports that must never be reachable from outside the VPC. Reaching one of
# these from the internet means an attacker is talking to the datastore rather
# than to the application in front of it.
data_ports := {
	1433, # SQL Server
	3306, # MySQL
	5432, # PostgreSQL
	6379, # Redis
	9200, # Elasticsearch
	11211, # Memcached
	27017, # MongoDB
}

admin_ports := {22, 3389}

open_cidrs := {"0.0.0.0/0", "::/0"}

# HIPAA 164.312(e)(1) transmission security, SOC 2 CC6.6 boundary protection.
deny contains msg if {
	sg := common.resources("aws_security_group")[_]
	rule := common.nested(sg.body, "ingress")[_]
	rule.cidr_blocks[_] in open_cidrs
	port := data_ports[_]
	rule.from_port <= port
	rule.to_port >= port
	msg := sprintf(
		"CRITICAL aws_security_group.%s allows data port %d from the internet. Reference a security group instead of a CIDR.",
		[sg.name, port],
	)
}

# Admin ports from anywhere are how bastions become incidents. A jump host
# should be reachable through an identity-aware proxy, not from 0.0.0.0/0.
deny contains msg if {
	sg := common.resources("aws_security_group")[_]
	rule := common.nested(sg.body, "ingress")[_]
	rule.cidr_blocks[_] in open_cidrs
	port := admin_ports[_]
	rule.from_port <= port
	rule.to_port >= port
	msg := sprintf(
		"HIGH aws_security_group.%s allows admin port %d from the internet. Front it with an identity-aware proxy.",
		[sg.name, port],
	)
}

# A database addressable from the internet is one credential leak away from
# being read, whatever the security group in front of it says.
deny contains msg if {
	db := common.resources("aws_db_instance")[_]
	db.body.publicly_accessible == true
	msg := sprintf(
		"CRITICAL aws_db_instance.%s is publicly accessible. A restored snapshot holds the same data as production.",
		[db.name],
	)
}

warn contains msg if {
	sn := common.resources("aws_subnet")[_]
	sn.body.map_public_ip_on_launch == true
	msg := sprintf(
		"aws_subnet.%s assigns public IPs on launch. Anything placed here is internet-facing by default.",
		[sn.name],
	)
}
