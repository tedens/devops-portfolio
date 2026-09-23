# Supply chain security

Project 16 deploys an image. Nothing proved the image running was the one CI
built. This does: every build is signed with the workflow's own identity, an
SBOM and SLSA provenance are attached, and an admission controller refuses
anything that is not signed by that identity, attested by that builder, and
built from this repository.

```
01 builds  ->  17 signs, attests, admits only what it signed  ->  16 deploys
```

## Run it

```bash
./scripts/up.sh             # kind + local registry + Kyverno 1.19, pinned
./scripts/sign-local.sh     # build, push, sign, attest SBOM + provenance, install policy
./scripts/tamper-drill.sh   # five images at the door, one gets in
./scripts/verify.sh localhost:5001/demo-service@sha256:...   # same verdict, from outside
```

You need cosign **v2**, syft, crane, kind, kubectl and docker. The version
pins, and the reason cosign is v2, are in `bootstrap/versions.env`.

## The drill

```
case1-signed          signed, SBOM and provenance attested by the trusted attestor
                      admitted; tag rewritten to sha256:32b23557...
case2-unsigned        rebuilt from the same source, never signed
                      refused: image is not signed by the builder this cluster trusts
case3-wrong-signer    tampered build, validly signed AND attested by a key the cluster does not trust
                      refused: image is not signed by the builder this cluster trusts
case4-no-sbom         signed by the trusted key, no SBOM or provenance attached
                      refused: image has no SBOM attestation from the trusted builder
case5-foreign         docker.io/library/busybox:1.36
                      refused: only images from kind-registry:5000/demo-service are admitted here

PASS: 5/5. One image got in, and it was the one that should have.
```

Cases 2 to 5 are the reasons the policy has the shape it has. A policy that
only refused case 2 is beaten by case 3 (anyone can sign) and case 5 (use a
different name) without forging anything.

The drill is itself tested. Flip the policy to `Audit` and run it again: four
cases are admitted and the drill fails 4 of 5. A drill that passes against a
toothless policy is measuring nothing.

## Two rules, in a deliberate order

**Allowlist first.** `ImageValidatingPolicy` only evaluates images that match
its `matchImageReferences`. An image from `docker.io` does not match, and
would be admitted untouched. `registry-allowlist.yaml` is a plain
`ValidatingPolicy` that refuses every container, init container and ephemeral
container not on the allowed repository, before signatures come into it.

**Then signatures, then attestations, then what the attestations say.**
Signature by the builder. SBOM attestation by the builder. Provenance
attestation by the *provenance signer*, which is not the builder (below).
Then two CEL checks on the provenance payload: `builder.id` must be the
builder this environment expects, and `invocation.configSource.uri` must be
this repository on `main`. Without those two, provenance for a completely
different repository, signed by the same generator, passes.

`mutateDigest: true` rewrites the tag to the verified digest on admission, so
what runs is what was checked even if the tag moves later.

## Who signs what

In CI two identities sign, and the policy names both:

| | signs | identity |
|---|---|---|
| builder | image, SBOM | `…/.github/workflows/supply-chain.yml@refs/heads/main` via GitHub OIDC |
| provenance | SLSA provenance | `slsa-framework/slsa-github-generator/…/generator_container_slsa3.yml@refs/tags/vX.Y.Z` |

The generator signing with its own identity is the point. A provenance
statement signed by the workflow that ran the build is a claim the build
makes about itself. Rename `supply-chain.yml`, sign from another workflow or
another branch, and nothing is admitted. That is the control working.

Locally there is one throwaway key for both roles, generated under `.local/`
and never committed, and the provenance is written by `sign-local.sh` about
itself. The policy is honest about that: the local render expects
`builder.id` to start with `local://`. Same base policy, different attestor
file. `policy/attestors/` is the whole difference between the two
environments and is reviewable on its own.

## What it took to get here

Every one of these produced a wrong result that looked plausible.

**cosign v3 writes a format Kyverno 1.19 does not see.** v3 has no legacy
mode: it writes only Sigstore bundles
(`application/vnd.dev.sigstore.bundle.v0.3+json`) via OCI referrers. Kyverno
1.19.1 has bundle auto-detection, but against my registry it found nothing
and fell back to looking for `.sig` tags. A correctly signed image was refused
with `no signatures found`, byte-for-byte the same refusal an unsigned image
gets. The SLSA generator pins cosign v2 and writes legacy `.att`. So cosign
is pinned to v2.6.5, the last v2, and there is one format end to end.

**The first smoke test tested nothing.** The published schema put
`failurePolicy` under `webhookConfiguration`; 1.19 rejects that field, the
policy was never created, and both the signed and the unsigned pod were
"admitted". `kubectl explain imagevalidatingpolicies.policies.kyverno.io.spec
--recursive` on the installed CRD is the authority, not the docs page.

**Kyverno treats signatures and attestations differently, and only one is
documented.** With `insecureIgnoreTlog: true` the signature path tolerates a
missing transparency-log entry. The attestation path does not: an SBOM
attached with `--tlog-upload=false` fails as `cosign bundle verification failed` regardless of policy (`verifier.go`, the `!verified` branch). So the
local drill uploads to the public Rekor log, same as CI. That is also the
honest choice; a signature nobody can look up is one you take the signer's
word for.

**The SLSA generator does not sign as you.** Provenance verified against the
workflow's identity fails, correctly. Two attestors.

**Globs are `repo:*` and `repo@*`.** The first render had `repo/*`, which
matches nothing an image reference ever looks like.

**The predicate leaked a hostname.** The first local provenance put
`$(hostname)` in `builder.id`, and attestation payloads go to the public log,
where they cannot be removed. It is fixed; the one entry is permanent.

## What is public, and what is not

Running `sign-local.sh` writes to rekor.sigstore.dev: a throwaway public key,
the digest of a demo image, its registry path, an SBOM of a Node base image,
and a provenance predicate. Entries are permanent. CI does the same with the
workflow's OIDC identity.

CI publishes the image to `ghcr.io/tedens/devops-portfolio/demo-service`.
GitHub creates that package **private**, so `verify.sh` against it works from
CI, which has a token, and fails from anywhere else with an authentication
error. Kyverno in CI reads it through a pull secret made from `GITHUB_TOKEN`.
Making the package public is a setting on the package, and until it is, the
"anyone can reach the same verdict" property holds only in principle.

## Layout

```
bootstrap/versions.env       pins, and why cosign is v2
bootstrap/kind-config.yaml   containerd trusts the local registry
policy/base/                 the two rules, environment-neutral
policy/attestors/            ci-keyless.yaml, local-key.yaml: the only thing that differs
scripts/render-policy.rb     base + attestor file -> policy for one environment
scripts/up.sh                cluster, registry, Kyverno
scripts/sign-local.sh        build, sign, attest, install policy
scripts/tamper-drill.sh      five cases; --ci uses the GHCR images for cases 1 and 4
scripts/verify.sh            cosign from outside the cluster, same verdict
workload/demo-service.yaml   what gets admitted
```

## What has and has not been run

The local path, end to end: cluster, signing, attestations, all five drill
cases, the Audit self-test, and `verify.sh`, with the output above. The
compliance gate from project 15 reports zero new findings on this directory.

The CI path ran on the first push. Keyless signing to GHCR, SBOM attestation,
the SLSA generator's provenance, and then the admission drill against that
image on a fresh kind cluster:

```
verify.sh   signature ok; SBOM 218 packages; provenance builder:
            https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@refs/tags/v2.1.0
case1       admitted; tag rewritten to sha256:d952013c...
case2       refused: not signed by the builder this cluster trusts
case3       refused: not signed by the builder this cluster trusts
case5       refused: only images from ghcr.io/tedens/devops-portfolio/demo-service are admitted
PASS: 4/4
```

Case 4 was skipped on that first run: without a key on the runner there was
nothing to sign a no-attestation image with. The build job now signs one
with the workflow identity and attests nothing to it, and the second run
refused it on the SBOM rule:

```
case4       signed by the trusted CI identity, but no SBOM or provenance attached
            refused: image has no SBOM attestation from the trusted builder
PASS: 5/5
```

That is the case that tests the attestation rules on their own, with the
signature rule satisfied by the real identity. If the Actions tab shows a red
run, this section is overstating things.
