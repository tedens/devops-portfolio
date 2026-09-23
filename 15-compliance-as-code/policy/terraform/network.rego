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

# ---------------------------------------------------------------------------
# The same two rules again, for aws_vpc_security_group_ingress_rule.
#
# These rules were written against the inline ingress block, which is the only
# shape any project here used at the time. Rewriting 08 with the standalone
# rule resources, which is what AWS now recommends, showed the gap: a rule
# opening port 22 to 0.0.0.0/0 written the modern way passed the whole policy
# clean. A control that only recognises the deprecated syntax is worse than no
# control, because the dashboard is green either way.
#
# The standalone resource differs in three ways that matter here. It carries
# one CIDR rather than a list, it names it cidr_ipv4 or cidr_ipv6 instead of
# cidr_blocks, and ip_protocol = "-1" means every port with no from_port or
# to_port present at all.
# ---------------------------------------------------------------------------

deny contains msg if {
	rule := common.resources("aws_vpc_security_group_ingress_rule")[_]
	rule_is_open(rule.body)
	port := data_ports[_]
	rule_covers_port(rule.body, port)
	msg := sprintf(
		"CRITICAL aws_vpc_security_group_ingress_rule.%s allows data port %d from the internet. Set referenced_security_group_id instead of a CIDR.",
		[rule.name, port],
	)
}

deny contains msg if {
	rule := common.resources("aws_vpc_security_group_ingress_rule")[_]
	rule_is_open(rule.body)
	port := admin_ports[_]
	rule_covers_port(rule.body, port)
	msg := sprintf(
		"HIGH aws_vpc_security_group_ingress_rule.%s allows admin port %d from the internet. Front it with an identity-aware proxy.",
		[rule.name, port],
	)
}

rule_is_open(body) if body.cidr_ipv4 in open_cidrs

rule_is_open(body) if body.cidr_ipv6 in open_cidrs

# "-1" is every protocol on every port. AWS rejects from_port and to_port
# alongside it, so a range check would never fire and the rule would be missed.
rule_covers_port(body, _) if body.ip_protocol == "-1"

rule_covers_port(body, port) if {
	body.ip_protocol != "-1"
	body.from_port <= port
	body.to_port >= port
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
