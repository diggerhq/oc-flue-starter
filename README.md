# oc-flue-starter

A small [Flue](https://flueframework.com) agent deployed as a durable OpenComputer session. It has
one typed order lookup tool and one packaged triage skill. The default path needs no sandbox: session
admission returns quickly, the model and custom tool run in the tenant Worker, and conversation state
persists between turns.

## Quickstart

Requirements: Node 22.19+, the `oc` CLI, and an OpenComputer account with managed billing or an
Anthropic credential.

```sh
git clone https://github.com/diggerhq/oc-flue-starter
cd oc-flue-starter
npm install

oc agent deploy
oc session create --agent support-triage --input "Order 2203 arrived with a bent tent pole. What happens next?"
oc session logs <session-id>
```

Continue an existing session with:

```sh
oc session steer <session-id> "The damaged item is the tent pole."
```

You can also create and chat with the session in the
[OpenComputer dashboard](https://app.opencomputer.dev).

## What is in the example

```text
agent.toml                       OpenComputer agent name, model and runtime
flue.config.ts                   stock Cloudflare-target Flue build
src/app.ts                       OpenComputer hosting app and /health route
src/agents/support-triage.ts     agent definition
src/tools/lookup-order.ts        typed custom tool
src/data/orders.json             fixture imported into the Worker bundle
src/skills/triage/SKILL.md       packaged Flue skill imported by the agent
```

The `SKILL.md` file is imported with Flue's `with { type: 'skill' }` mechanism, so it is part of the
Worker module graph and available to `activate_skill`; it is not copied into a workspace. Likewise,
the custom tool imports its data. A deployed Worker cannot read this git checkout by path.

OpenComputer supplies the model gateway and deployment token. The repository and built artifact
contain no model credentials. Each successful deploy creates a revision only after the exact live
Worker answers its health probe stably.

## Optional sandbox hands

This example deliberately omits a sandbox. Add one only when the agent truly needs a Linux shell or
durable files:

```ts
import { ocSandbox } from '@opencomputer/flue';

// inside defineAgent(...)
sandbox: ocSandbox(ctx.env),
```

Declaring `ocSandbox` does not allocate a machine during harness initialization. The first real
shell/file operation resolves one persistent session sandbox; later operations reuse it. Repository
checkout/materialization for Flue sessions is not implemented yet, so do not assume an attached repo
appears in that workspace.

## Development

```sh
npm run typecheck
npm run build
npm run dev
```

`npm run dev` uses Flue's Cloudflare development target. Both the packaged skill and custom tool are
part of the ordinary Flue app; OpenComputer-specific hosting is limited to the gateway/route helpers
and `src/app.ts`.

Keep `agent.toml` and `DEFAULT_MODEL` aligned. Reserved `OC_` and `FLUE_` environment names are
platform-owned, and credentials must never be committed.

Current boundaries: direct session messages are the supported ingress; channels, workflows,
attachments and repo-backed workspaces are not part of this starter's tested OpenComputer profile.
See [Flue on OpenComputer](https://docs.opencomputer.dev/agent-sessions/flue) for the platform guide.
