# Identity and access.
#
# SOC 2 CC6.1 and CC6.3, HIPAA 164.312(a)(1) and 164.312(d).

package terraform.identity

import rego.v1

# IMDSv2. A hop limit above 1 lets a container reach the node's credentials,
# which turns a web application vulnerability into an AWS one.
deny contains msg if {
	some name
	inst := input.resource.aws_instance[name][_]
	opts := inst.metadata_options[_]
	opts.http_tokens != "required"
	msg := sprintf("HIGH aws_instance.%s allows IMDSv1. Set http_tokens = \"required\".", [name])
}

deny contains msg if {
	some name
	inst := input.resource.aws_instance[name][_]
	not inst.metadata_options
	msg := sprintf("HIGH aws_instance.%s does not pin IMDSv2. Add a metadata_options block.", [name])
}

# A policy document with Action "*" on Resource "*" is an admin grant however
# it is described.
deny contains msg if {
	some name
	doc := input.data.aws_iam_policy_document[name][_]
	stmt := doc.statement[_]
	stmt.actions[_] == "*"
	stmt.resources[_] == "*"
	msg := sprintf("CRITICAL data.aws_iam_policy_document.%s grants * on *.", [name])
}

warn contains msg if {
	some name
	inst := input.resource.aws_instance[name][_]
	inst.key_name
	msg := sprintf("aws_instance.%s has an SSH key pair. Prefer SSM Session Manager, which is logged and needs no open port.", [name])
}
