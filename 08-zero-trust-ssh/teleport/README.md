# Teleport configuration

Two files used to live here: `teleport.yaml` and `github-sso.yaml`. Both are
gone, for different reasons.

`teleport.yaml` was a copy that nothing read. The setup instructions told you
to `scp` it onto the host by hand, so the file in git and the file actually
running drifted apart the first time anyone edited one of them. The config is
now rendered by
[`terraform/templates/proxy-user-data.sh.tftpl`](../terraform/templates/proxy-user-data.sh.tftpl)
and written at boot, which means Terraform owns it and a change to it replaces
the instance.

`github-sso.yaml` held `client_id` and `client_secret` as inline placeholders.
They were only placeholders, but the shape teaches the habit: the first person
to make it work commits a live OAuth secret to a public repository. Those
values now come from Secrets Manager at boot, are written to a file with mode
0600 outside the repository, and are shredded when the bootstrap script exits.
Populate the secret named in the `github_oauth_secret_arn` output with:

```json
{
  "client_id": "...",
  "client_secret": "...",
  "organization": "your-github-org",
  "team": "your-team"
}
```

## What is still here

`roles/` holds the RBAC definitions, and these are the ones that run: Terraform
reads them with `file()` and writes them to the proxy at boot, so reviewing the
YAML in this directory is reviewing what the cluster enforces.

- `ssh-operator.yaml` is what a member of the mapped GitHub team receives.
  The previous connector mapped a whole team onto Teleport's built-in `admin`
  role, which can delete the audit log it is recorded in. This one can open a
  session on nodes labelled `env: demo, role: workload` and nothing else, for
  eight hours, with a hardware second factor required at session start rather
  than only at login, and with `record_session: strict` so a session that
  cannot be recorded does not begin.
- `auditor.yaml` can replay recordings and read audit events, and cannot open
  a session anywhere. Whoever reviews the recordings should not also be able
  to create them.
