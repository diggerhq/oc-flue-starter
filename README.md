# Flue on OpenComputer starter

Deploy a typed [Flue](https://flueframework.com) app as an OpenComputer agent. This support-triage
example has one custom tool, one packaged skill, and durable multi-turn sessions. It deliberately
starts without a sandbox, so model-only turns and tools that use bundled data can run immediately.

For the complete runtime model and supported profile, see
[Flue on OpenComputer](https://docs.opencomputer.dev/agent-sessions/flue).

## Run it

You need Node 22.19 or newer, the [`oc` CLI](https://docs.opencomputer.dev/cli/overview), and an
OpenComputer organization with Managed model access. Log in with `oc login`, then:

```sh
git clone https://github.com/diggerhq/oc-flue-starter
cd oc-flue-starter
npm ci

oc agent deploy
oc session create \
  --agent support-triage \
  --input "Order 2203 arrived with a torn shoulder strap. What happens next?"
```

The create command prints a session id beginning with `ses_`. Paste it at the prompt below:

```sh
printf 'Session id: '
read -r SESSION_ID
oc session logs "$SESSION_ID"
oc session steer "$SESSION_ID" "Please summarize the next step in one sentence."
```

You can also start the agent and follow its event stream in the
[OpenComputer dashboard](https://app.opencomputer.dev).

The first prompt should make the agent look up order `2203`, apply the damage-triage skill, and
explain the replacement path. The follow-up continues the same stored conversation.

## What is included

| Path | Purpose |
| --- | --- |
| `agent.toml` | OpenComputer agent name, model, runtime, and non-secret variables |
| `package-lock.json` | Reproducible dependencies for local and managed builds |
| `flue.config.ts` | Flue build target shared by local development and deployment |
| `src/app.ts` | Standard OpenComputer hosting app and health route |
| `src/agents/support-triage.ts` | Agent instructions, model, tools, and skills |
| `src/tools/lookup-order.ts` | Typed custom tool |
| `src/data/orders.json` | Fixture imported into the deployed app |
| `src/skills/triage/SKILL.md` | Packaged Flue skill imported by the agent |
| `examples/with-sandbox.ts` | Complete, typechecked optional-sandbox example |

The tool imports its fixture, and the agent imports its skill with Flue's
`with { type: 'skill' }` mechanism. Both become part of the deployed module graph. They do not rely
on a repository checkout or a sandbox filesystem.

## How it runs

OpenComputer runs the compiled Flue app and connects it to agents, sessions, events, steering, and
Managed model access. Each OpenComputer session maps to one durable Flue conversation. Session
creation and steering return after the input is durably accepted; the model turn continues
asynchronously, and later messages queue in order.

Under the hood, deployment builds Flue's Cloudflare target. The deployed app handles requests in a
Worker, while each session's conversation and turn state live in its own Durable Object. This is why
a session can begin without provisioning a virtual machine. A sandbox is resolved only if the agent
actually performs a shell or filesystem operation.

OpenComputer supplies the model gateway binding during deployment. Provider credentials are not
stored in this repository or compiled into the app.

## Make it your own

- Change the behavior in `src/agents/support-triage.ts`.
- Add a typed `defineTool`, import all data it needs, and include it in the agent's `tools` array.
- Add a `SKILL.md`, import it with `with { type: 'skill' }`, and include it in `skills`.
- To rename the agent, rename `src/agents/support-triage.ts` and update `name` in `agent.toml` together.
- Keep the model in `agent.toml` aligned with the model returned by the agent definition.

### Optional sandbox

The default agent has no sandbox. If it needs a Linux shell or durable files, use the complete
[sandbox example](examples/with-sandbox.ts) as the starting point. Declaring `ocSandbox` performs no
provisioning during Worker startup or Flue runtime initialization. The first real shell or file
operation resolves one sandbox for that session, and later operations reuse it.

The sandbox starts empty. Repository checkout and repo-backed workspaces are not implemented for
Flue sessions yet.

### Variables and secrets

Put non-secret values in `agent.toml`:

```toml
[vars]
SUPPORT_REGION = "eu-west"
```

Send secret values over standard input, then deploy the updated configuration:

```sh
printf '%s' "$SUPPORT_API_KEY" | oc agent secret set SUPPORT_API_KEY --from-stdin
oc agent deploy
```

Secret values are write-only. Names beginning with `OC_` or `FLUE_` are reserved by the platform.
Never put a credential in `agent.toml` or source code.

## Deployment behavior

`oc agent deploy` scans the source, builds the app, uploads its modules and platform bindings, then
waits for the exact live deployment to answer health checks before reporting an active revision.

There is currently one live deployed app per agent. Uploading a new build changes the code used by
new and existing sessions before verification completes. To restore known-good code, check out that
source and deploy it again. Do not downgrade across an incompatible Flue storage migration.

## Develop locally

```sh
npm run typecheck
npm run build
npm run dev
```

`npm run dev` uses the same Flue build target as deployment. Keep generated `dist/`, `.flue-vite/`,
`.wrangler/`, and `.flue-vite.wrangler.jsonc` output out of git.

## Current boundaries

- Direct text session messages are the supported ingress. Channels and workflows are not connected.
- Repository sources, watches, publishing, attachments, and repo-backed workspaces are not supported.
- The Managed gateway currently supports the configured Anthropic model; per-session model overrides
  are rejected.
- Custom tools in the deployed app can reach platform-managed outbound hosts only. Tenant-configured
  egress is not available.
- Platform turn limits, automatic conversation compaction, and automatic deployed-app rollback are
  not available yet.

## Troubleshooting

- If `flue build` is unavailable, run `npm ci` with Node 22.19 or newer.
- If credential scanning blocks deployment, remove the reported key and store the value with
  `oc agent secret set ... --from-stdin`.
- If verification fails, fix the import-time or health-route error reported by the deploy and retry.
- If a session stops advancing, open **All events** in the dashboard or run
  `oc session logs "$SESSION_ID"`. Runtime errors are recorded without a diagnostic redeployment.
