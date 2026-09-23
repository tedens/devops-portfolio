# Encryption at rest.
#
# HIPAA 164.312(a)(2)(iv) treats encryption as addressable rather than
# required, which in practice means "do it or write down why not". This
# organisation does it, so the exception has to go in baseline/accepted.json
# with a name and a date against it.

package terraform.encryption

import data.terraform.common
import rego.v1

deny contains msg if {
	db := common.resources("aws_db_instance")[_]
	not db.body.storage_encrypted
	msg := sprintf("HIGH aws_db_instance.%s has no storage encryption.", [db.name])
}

deny contains msg if {
	v := common.resources("aws_ebs_volume")[_]
	not v.body.encrypted
	msg := sprintf("HIGH aws_ebs_volume.%s is unencrypted.", [v.name])
}

deny contains msg if {
	t := common.resources("aws_sns_topic")[_]
	not t.body.kms_master_key_id
	msg := sprintf("MEDIUM aws_sns_topic.%s is unencrypted. Alert payloads often quote the data that triggered them.", [t.name])
}

deny contains msg if {
	q := common.resources("aws_sqs_queue")[_]
	not q.body.sqs_managed_sse_enabled
	not q.body.kms_master_key_id
	msg := sprintf("MEDIUM aws_sqs_queue.%s is unencrypted.", [q.name])
}

deny contains msg if {
	i := common.resources("aws_instance")[_]
	rbd := common.nested(i.body, "root_block_device")[_]
	not rbd.encrypted
	msg := sprintf("HIGH aws_instance.%s has an unencrypted root volume.", [i.name])
}
