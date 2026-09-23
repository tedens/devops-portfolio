#!/usr/bin/env ruby
# Renders policy/base for one environment.
#
#   render-policy.rb local <repository> <public-key-file>
#   render-policy.rb ci    <repository>
#
# Two things vary by environment and nothing else: which repository images
# must come from, and who has to have signed them. Both policies in base/
# carry the ALLOWED_REPOSITORY placeholder in strings, and image-policy.yaml
# carries a placeholder attestor that the overlay replaces wholesale, so the
# attestor's shape (key vs keyless) is a file in policy/attestors/, reviewable
# on its own, rather than a patch against a patch.
#
# Kustomize was the obvious tool and was not used: its replacements target
# whole fields and cannot substitute inside a glob or a message string, and
# a strategic-merge patch cannot swap a `key` block for a `keyless` block
# without leaving the old one behind.

require "yaml"

mode, repository, key_file = ARGV
abort "usage: render-policy.rb local|ci <repository> [public-key-file]" unless %w[local ci].include?(mode) && repository

root = File.expand_path("..", __dir__)
attestors = YAML.load_file(File.join(root, "policy/attestors/#{mode == "ci" ? "ci-keyless" : "local-key"}.yaml"))["attestors"]

if mode == "local"
  abort "local mode needs the public key file" unless key_file && File.exist?(key_file)
  attestors.each { |a| a["cosign"]["key"]["data"] = File.read(key_file) if a.dig("cosign", "key") }
end

# What the provenance payload must say, per environment. Locally the
# provenance is written by sign-local.sh about itself, and the policy is
# honest about that; in CI it must come from the SLSA generator and point at
# this repository on main.
PAYLOAD = {
  "local" => { "EXPECTED_BUILDER_ID_PREFIX" => "local://",
               "EXPECTED_SOURCE_URI_PREFIX" => "file://" },
  "ci"    => { "EXPECTED_BUILDER_ID_PREFIX" => "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@refs/tags/v",
               "EXPECTED_SOURCE_URI_PREFIX" => "git+https://github.com/tedens/devops-portfolio@refs/heads/main" },
}.fetch(mode)

def substitute(node, from, to)
  case node
  when Hash  then node.transform_values { |v| substitute(v, from, to) }
  when Array then node.map { |v| substitute(v, from, to) }
  when String then node.gsub(from, to)
  else node
  end
end

docs = []
%w[registry-allowlist.yaml image-policy.yaml].each do |f|
  doc = YAML.load_file(File.join(root, "policy/base", f))
  doc = substitute(doc, "ALLOWED_REPOSITORY", repository)
  PAYLOAD.each { |from, to| doc = substitute(doc, from, to) }

  if doc["kind"] == "ImageValidatingPolicy"
    doc["spec"]["attestors"] = attestors
    # Plain-HTTP registry only exists in the local drill. This key must not
    # appear in a CI render, and a reviewer should be able to check that by
    # reading the attestor file, not by knowing this script.
    doc["spec"]["credentials"] = { "allowInsecureRegistry" => true } if mode == "local"
    # GHCR creates a package private on first push, and Kyverno fetches
    # signatures itself rather than through the kubelet, so it needs its own
    # pull secret in its own namespace. CI creates it from GITHUB_TOKEN. If
    # the package is later made public the secret is simply unused.
    doc["spec"]["credentials"] = { "secrets" => ["ghcr-pull"] } if mode == "ci"
  end
  docs << doc
end

puts docs.map { |d| d.to_yaml }.join
