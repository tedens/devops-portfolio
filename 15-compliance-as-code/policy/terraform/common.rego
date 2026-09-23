# Shared helpers.
#
# The HCL parser does not emit a stable shape: a resource with one block comes
# back as an object, and the same resource with several comes back as an array
# of objects. Which one you get has also changed between conftest versions.
#
# Every rule therefore goes through resources(), which normalises both into a
# list of {name, body} pairs. Writing input.resource.aws_x[name][_] directly
# works until the day the shape flips, and then the policy silently stops
# matching while the build stays green.

package terraform.common

import rego.v1

# All blocks of a resource type, whichever shape the parser used.
resources(kind) := [{"name": name, "body": body} |
	some name
	raw := input.resource[kind][name]
	body := as_list(raw)[_]
]

# Same, for data sources.
data_blocks(kind) := [{"name": name, "body": body} |
	some name
	raw := input.data[kind][name]
	body := as_list(raw)[_]
]

# Nested blocks (ingress, root_block_device, metadata_options) have the same
# problem one level down.
nested(body, key) := as_list(body[key])

as_list(v) := v if is_array(v)

as_list(v) := [v] if is_object(v)

as_list(v) := [] if {
	not is_array(v)
	not is_object(v)
}
