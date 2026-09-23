---
title: "Supply Chain Security"
layout: page
permalink: /17-supply-chain/
description: "Every build signed with the workflow's own identity, SBOM and SLSA provenance attached, and an admission controller that refuses anything not signed by that identity, attested by that builder, and built from this repository."
---

[Project 16]({{ site.baseurl }}/16-gitops-delivery/) deploys an image.
Nothing proved the image running was the one CI built. This does.

Every build is signed with the workflow's own identity, an SBOM and SLSA
provenance are attached, and an admission controller refuses anything that is
not signed by that identity, attested by that builder, and built from this
repository.

```
01 builds  ->  17 signs, attests, admits only what it signed  ->  16 deploys
```

## Five images at the door

```
case1-signed          signed, SBOM and provenance attested by the trusted attestor
                      admitted; tag rewritten to sha256:32b23557...
case2-unsigned        rebuilt from the same source, never signed
                      refused: image is not signed by the builder this cluster trusts
case3-wrong-signer    tampered build, validly signed AND attested by another key
                      refused: image is not signed by the builder this cluster trusts
case4-no-sbom         signed by the trusted key, no SBOM or provenance attached
                      refused: image has no SBOM attestation from the trusted builder
case5-foreign         docker.io/library/busybox:1.36
                      refused: only images from kind-registry:5000/demo-service are admitted here

PASS: 5/5. One image got in, and it was the one that should have.
```

Cases 2 to 5 are why the policy has the shape it has. A policy that only
refused case 2 is beaten by case 3, since anyone can sign, and by case 5,
since anyone can use a different name, without forging anything.

The drill is itself tested. Flip the policy to `Audit` and four cases are
admitted; the drill fails 4 of 5. A drill that passes against a toothless
policy measures nothing.

## Two rules, in a deliberate order

**Allowlist first.** Kyverno's `ImageValidatingPolicy` only evaluates images
that match its reference globs. An image from `docker.io` does not match and
would be admitted untouched. A plain `ValidatingPolicy` refuses every
container, init container and ephemeral container that is not on the allowed
repository, before any signature is looked at.

**Then signatures, then attestations, then what the attestations say.** A
valid provenance signature says who attested. Two CEL checks on the payload
say what they attested to: `builder.id` must be the builder this environment
expects, and `invocation.configSource.uri` must be this repository on `main`.
Without those, provenance for a completely different repository, signed by
the same generator, passes.

Admission rewrites the tag to the verified digest, so what runs is what was
checked even if the tag moves afterwards.

## Who signs what

Two identities sign in CI, and the policy names both.

The **builder** is this repository's `supply-chain.yml` workflow on `main`,
authenticated by GitHub's OIDC issuer. It signs the image and attests the
SBOM. Not "anything signed with cosign", not "anyone in the org": one
workflow file, one branch.

The **provenance signer** is the SLSA generator's reusable workflow at a
release tag. It attests provenance with its own identity, and that is the
point: a provenance statement signed by the workflow that ran the build is a
claim the build makes about itself. Rename the workflow, sign from another
branch, and nothing is admitted. That is the control working.

Locally, one throwaway key stands in for both and the provenance is written
by the signing script about itself. The policy says so: the local render
expects `builder.id` to start with `local://`. Same base policy, different
attestor file; `policy/attestors/` is the entire difference between the two
environments.

## Six things that looked right and were not

**cosign v3 writes a format Kyverno 1.19 does not see.** v3 has no legacy
mode; it writes only Sigstore bundles via OCI referrers. Kyverno 1.19.1 has
bundle auto-detection, but against this registry it found nothing and looked
for `.sig` tags instead. A correctly signed image was refused with
`no signatures found`, the identical refusal an unsigned image gets. The SLSA
generator pins cosign v2 and writes legacy `.att`. So cosign is pinned to
v2.6.5, the last v2, and there is one format end to end.

**The first smoke test tested nothing.** The published schema put
`failurePolicy` under `webhookConfiguration`; 1.19 rejects that field, the
policy was never created, and both the signed and the unsigned pod were
admitted. The installed CRD, via `kubectl explain --recursive`, is the
authority. The docs page is not.

**Signatures and attestations are treated differently, and only one path is
documented.** With `insecureIgnoreTlog` the signature path tolerates a
missing transparency-log entry. The attestation path does not: an SBOM
attached with `--tlog-upload=false` fails as `cosign bundle verification failed` whatever the policy says. So the local drill uploads to the public
Rekor log, as CI does. That is also the honest choice: a signature nobody
can look up is one you take the signer's word for.

**The SLSA generator does not sign as you.** Provenance verified against the
workflow's identity fails, correctly. Hence two attestors.

**Globs are `repo:*` and `repo@*`.** The first render had `repo/*`, which
matches nothing an image reference ever looks like.

**The predicate leaked a hostname.** The first local provenance put the
workstation's hostname in `builder.id`, and attestation payloads go to the
public log, where they cannot be removed. Fixed; that one entry is permanent.

## What has and has not been run

The local path, end to end, with the output above: cluster, signing,
attestations, all five drill cases, the Audit self-test, and verification
from outside the cluster. Project 15's compliance gate reports zero new
findings on this directory.

The CI path ran on the first push: keyless signing to GHCR, SBOM attestation,
the SLSA generator's provenance, then the admission drill against that image
on a fresh kind cluster.

```
verify.sh   signature ok; SBOM 218 packages
            provenance builder: slsa-github-generator/.../generator_container_slsa3.yml@refs/tags/v2.1.0
case1       admitted; tag rewritten to sha256:d952013c...
case2       refused: not signed by the builder this cluster trusts
case3       refused: not signed by the builder this cluster trusts
case5       refused: only images from ghcr.io/tedens/devops-portfolio/demo-service are admitted
PASS: 4/4
```

Case 4 was skipped there, since with no key on the runner there was nothing
to sign a no-attestation image with. The build job now signs one with the
workflow identity and attests nothing to it, and the second run refused it
on the SBOM rule: `PASS: 5/5`. That is the case that tests the attestation
rules on their own, with the signature rule satisfied by the real identity.

One thing does not hold yet. GitHub created the GHCR package private, so
verifying the published image with cosign works from CI and fails with an
authentication error from anywhere else. The "anyone can reach the same
verdict" property is true of the design and false of the deployment until the
package is made public.
