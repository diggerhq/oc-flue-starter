# Managed-build fixtures

The repository root is the canonical successful Flue source. It is a complete public starter, not
a test-only copy. `success.projection.json` records the stable fields that an offline
`oc agent build` must project into the schema-v1 deployment descriptor. The builder supplies its
own version plus the canonical bundle digest and size; those runtime-produced values intentionally
are not hardcoded here.

`npm-ci-lock-mismatch/` is a self-contained source root that passes manifest and lockfile-shape
inspection, then fails deterministically during the fixed `npm ci` install step. Its lockfile
intentionally omits the declared `@flue/cli` package. This produces an actionable package-lock
error without running repository code or relying on a registry outage.

Do not use the failure fixture as an npm workspace or import it from the starter. Managed-build and
integration tests should select it directly as the repository root.
