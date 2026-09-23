# Bootstrap

The one part that cannot be GitOps, because something has to install the thing
that reads git. Everything after this is declarative and lives in `apps/`.

Versions are pinned. An unpinned `install.yaml` from a `stable` branch means
the cluster you get today and the cluster you get next month are different
clusters, which is the opposite of what a GitOps tool is for.
