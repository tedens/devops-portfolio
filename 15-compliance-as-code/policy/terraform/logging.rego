# Audit logging.
#
# HIPAA 164.312(b) requires a record of activity on systems holding ePHI.
# SOC 2 CC7.2 wants the same thing for security monitoring. Both are hard to
# satisfy retrospectively: logs you did not turn on do not exist.

package terraform.logging

import rego.v1

deny contains msg if {
	some name
	input.resource.aws_vpc[name]
	not flow_log_exists(name)
	msg := sprintf("MEDIUM aws_vpc.%s has no flow log. Network activity cannot be reconstructed after an incident.", [name])
}

flow_log_exists(vpc_name) if {
	fl := input.resource.aws_flow_log[_][_]
	contains(sprintf("%v", [fl.vpc_id]), vpc_name)
}

deny contains msg if {
	some name
	b := input.resource.aws_s3_bucket[name][_]
	not b.logging
	not logging_resource_exists(name)
	msg := sprintf("MEDIUM aws_s3_bucket.%s has no access logging.", [name])
}

logging_resource_exists(bucket_name) if {
	lg := input.resource.aws_s3_bucket_logging[_][_]
	contains(sprintf("%v", [lg.bucket]), bucket_name)
}
