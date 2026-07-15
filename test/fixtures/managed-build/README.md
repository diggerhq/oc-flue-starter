# Managed-build fixtures

The repository root is the canonical successful Flue source. It is a complete public starter, not
a test-only copy. `success.projection.json` records the stable fields that an offline
`oc agent build --check-only` must project into the schema-v1 deployment descriptor.
`success.artifact.json` records the builder-independent full descriptor and canonical bundle
digest. The builder supplies its own `oc@<version>` value, so that release-specific value is
intentionally absent from both fixtures.

The default fixture check has no dependency on an unreleased CLI. To exercise the cross-repository
golden contract with an explicitly built or installed binary, run:

```sh
OC_BIN=/absolute/path/to/oc npm run test:fixtures
```

That opt-in check runs both `--check-only` and the full Cloudflare build, compares the JSON printed
to standard output with the persisted `deployment.json`, and independently verifies the bundle's
size and SHA-256 digest. CI can set `OC_BIN` once a released CLI version is pinned; until then its
normal fixture, typecheck, and build checks remain self-contained.

`npm-ci-lock-mismatch/` is a self-contained source root that passes manifest and lockfile-shape
inspection, then fails deterministically during the fixed `npm ci` install step. Its lockfile
intentionally omits the declared `@flue/cli` package. This produces an actionable package-lock
error without running repository code or relying on a registry outage.

Do not use the failure fixture as an npm workspace or import it from the starter. Managed-build and
integration tests should select it directly as the repository root.
