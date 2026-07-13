# Working on this repo

This is a Flue agent that deploys to OpenComputer (`oc agent deploy`). The
deploy validates a strict profile — keep these invariants or the deploy fails:

- **Model string appears in TWO files and must be identical**:
  `agent.toml` (`model = "..."`) and `src/agents/support-triage.ts`
  (`model: '...'`). Change both together (CI checks this).
- Keep the platform wiring in the agent definition: `useOcGateway(ctx)` and
  `sandbox: ocSandbox(ctx.env)`. Never add a `db.ts` or any API key/secret —
  Flue owns conversation persistence, while OpenComputer supplies the sandbox
  service and model credentials. CI greps for key-shaped strings.
- **Custom tool names**: `bash`, `read`, `write`, `edit`, `ls`, `grep`,
  `glob`, `say`, `ask` are reserved — pick anything else.
- **Tools run from the deployed bundle, not the repo checkout**: anything a
  tool needs at run time must be `import`ed (see
  `src/tools/lookup-order.ts` importing `../data/orders.json`), never read
  from disk by path.
- **Skills** live at `src/skills/<name>/SKILL.md` and ship with each deploy.
  Do not create a root `.agents/skills/` for the agent's own skills — that
  path is reserved for its conventional meaning (skills for agents working
  on a repo attached as a session source).
- **Layout is Flue-canonical**: source under `src/`; the agent's filename is
  its Flue name (`support-triage.ts`); `src/opencomputer.ts` is the only
  OpenComputer-specific file. Don't import packaged skills
  (`with { type: 'skill' }`) — unsupported and a build error.
- `dist-oc/` is build output — gitignored, never commit it.

Build: `npm run build`. Deploy: `oc agent deploy` (builds and uploads the
Cloudflare Worker revision). Docs:
https://docs.opencomputer.dev/agent-sessions/flue
