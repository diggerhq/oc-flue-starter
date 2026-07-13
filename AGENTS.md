# Working on this starter

This is a stock Cloudflare-target Flue app deployed with `oc agent deploy`.

- Keep `agent.toml` model aligned with `@opencomputer/flue`'s `DEFAULT_MODEL`.
- Never commit credentials or generated `dist/`, `.flue-vite/` or `.wrangler/` output.
- Custom tools run in the Worker. Import every runtime fixture; do not read the git checkout by path.
- Agent-owned skills are packaged imports: `SKILL.md` plus `with { type: 'skill' }`, then `skills: [...]`.
  Do not claim they are copied into a workspace.
- The default example intentionally has no `sandbox:`. Add `ocSandbox(ctx.env)` only for a feature
  that genuinely needs shell/files, and keep repo workspace support out until it is implemented.
- Keep `src/app.ts` exporting `@opencomputer/flue/app`; its `/health` route is part of deploy activation.
- Reserved `OC_` and `FLUE_` names belong to the platform.

Validate with `npm run typecheck` and `npm run build`. Deploy with `oc agent deploy`.
