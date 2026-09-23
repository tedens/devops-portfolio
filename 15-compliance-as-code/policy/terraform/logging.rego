# Audit logging.
#
# HIPAA 164.312(b) requires a record of activity on systems holding ePHI.
# SOC 2 CC7.2 wants the same for security monitoring. Both are hard to satisfy
# retrospectively: logs you did not turn on do not exist.

package terraform.logging

import data.terraform.common
import rego.v1

deny contains msg if {
	vpc := common.resources("aws_vpc")[_]
	not flow_log_exists(vpc.name)
	msg := sprintf("MEDIUM aws_vpc.%s has no flow log. Network activity cannot be reconstructed after an incident.", [vpc.name])
}

flow_log_exists(vpc_name) if {
	fl := common.resources("aws_flow_log")[_]
	contains(sprintf("%v", [fl.body.vpc_id]), vpc_name)
}

deny contains msg if {
	b := common.resources("aws_s3_bucket")[_]
	not b.body.logging
	not logging_resource_exists(b.name)
	msg := sprintf("MEDIUM aws_s3_bucket.%s has no access logging.", [b.name])
}

logging_resource_exists(bucket_name) if {
	lg := common.resources("aws_s3_bucket_logging")[_]
	contains(sprintf("%v", [lg.body.bucket]), bucket_name)
}
