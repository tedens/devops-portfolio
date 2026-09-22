# Encryption at rest.
#
# HIPAA 164.312(a)(2)(iv) treats encryption as addressable rather than
# required, which in practice means "do it or write down why not". This
# organisation does it, so the exception has to go in baseline/accepted.yaml
# with a name and a date against it.

package terraform.encryption

import rego.v1

deny contains msg if {
	some name
	db := input.resource.aws_db_instance[name][_]
	not db.storage_encrypted
	msg := sprintf("HIGH aws_db_instance.%s has no storage encryption.", [name])
}

deny contains msg if {
	some name
	vol := input.resource.aws_ebs_volume[name][_]
	not vol.encrypted
	msg := sprintf("HIGH aws_ebs_volume.%s is unencrypted.", [name])
}

deny contains msg if {
	some name
	topic := input.resource.aws_sns_topic[name][_]
	not topic.kms_master_key_id
	msg := sprintf("MEDIUM aws_sns_topic.%s is unencrypted. Alert payloads often quote the data that triggered them.", [name])
}

deny contains msg if {
	some name
	q := input.resource.aws_sqs_queue[name][_]
	not q.sqs_managed_sse_enabled
	not q.kms_master_key_id
	msg := sprintf("MEDIUM aws_sqs_queue.%s is unencrypted.", [name])
}

deny contains msg if {
	some name
	inst := input.resource.aws_instance[name][_]
	rbd := inst.root_block_device[_]
	not rbd.encrypted
	msg := sprintf("HIGH aws_instance.%s has an unencrypted root volume.", [name])
}
