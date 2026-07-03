# oc-flue-starter

A [Flue](https://flueframework.com) agent that deploys to
[OpenComputer](https://opencomputer.dev) as a **durable session**: it keeps its
conversation across restarts, hibernates between turns (you don't pay for idle),
runs shell/file tools in an isolated sandbox, and wakes up when you message it.

The agent itself is plain Flue — a support-triage bot with one typed tool and
one skill, laid out the standard Flue way (`src/agents/`, discovered by
filename). The entire OpenComputer integration is [`src/oc.ts`](./src/oc.ts),
three lines.

**Docs:** [Run Flue agents on OpenComputer](https://docs.opencomputer.dev/agent-sessions/flue)

## Prerequisites

- Node **22.19+**
- The [`oc` CLI](https://docs.opencomputer.dev/cli/overview), logged in
- An OpenComputer account with either **managed billing** (default — model
  usage billed to your OC credits) or an
  [Anthropic credential](https://docs.opencomputer.dev/agent-sessions/credentials)

## Quickstart

```sh
git clone https://github.com/diggerhq/oc-flue-starter && cd oc-flue-starter
npm install

# 1. Create the agent (name must match agent.toml)
oc agent create support-triage --runtime flue --model anthropic/claude-sonnet-5

# 2. Build + deploy (runs `oc-flue-build`, uploads the artifact, verifies it boots)
oc agent deploy

# 3. Talk to it
oc session create --input "Customer says order 1042 hasn't arrived. What do I tell them?"
oc session logs <session-id>
```

Reply to anything the agent asks with
`oc session steer <session-id> "your answer"`, or open the session in the
[dashboard](https://app.opencomputer.dev) and chat there. The triage **skill**
ships with the deploy (it lives in `src/skills/` and rides the artifact) — try
it: `oc session create --input "Order 2203 arrived with a bent tent pole."`

To give the agent a **codebase to work on**, attach a repo as a session
source — it lands in the agent's workspace (and any `.agents/skills/` that
repo carries for its own development become available too):

```sh
oc session create --input "Fix the failing test." --source your-org/your-repo
```

## Project structure

```
agent.toml                       # OC deploy manifest: name, model, runtime = flue
flue.config.ts                   # Flue's own build config (used by `npm run dev`)
src/
  oc.ts                          # the OpenComputer entry — the whole integration
  agents/support-triage.ts       # the agent (plain Flue; the filename is the agent's name)
  tools/lookup-order.ts          # a typed custom tool (valibot schema, bundled fixture data)
  data/orders.json               # fixture the tool reads — bundled into the artifact
  skills/triage/SKILL.md         # the agent's skill — ships with the deploy
```

Skills in `src/skills/` belong to **this agent** and travel with every deploy:
the artifact carries them, and OpenComputer places them into the agent's
workspace where Flue discovers them at runtime. This is separate from
`.agents/skills/` in repos you attach as sources — that convention means
"skills for agents working on *that* repo," and those are picked up from the
workspace too. (Flue's packaged skill imports — `with { type: 'skill' }` —
aren't supported on OC yet.)

## What `serveOC` does (so your app doesn't have to)

`src/oc.ts` hands your agent to `@opencomputer/flue`, which wires the
platform in at run time:

- **Durable conversation, zero config** — it opens Flue's conversation store
  on the session's persistent state volume; the agent resumes with full
  context after restarts and hibernation. (That's why adding a `db.ts` is a
  deploy error — a second store would fork the truth.)
- **Sandbox wiring** — Flue's built-in `read`/`write`/`edit`/`bash` execute
  on the session's **workspace sandbox** (a separate machine, where `--source`
  repos are checked out). Your **custom tools run in-process** with your app.
- **`say` and `ask` tools, injected** — `ask` makes the session yield
  `needs_input`, wait at zero compute, and resume with the user's answer.
  (Stock Flue has no human-in-the-loop primitive.)
- **Model routing** — the Anthropic provider is registered against your OC
  credential (or managed billing) at run time; the model string in your code
  just works, and no key ever exists in this repo or the bundle.
- **Turn plumbing** — session turns are admitted into Flue's engine
  idempotently; every step and tool call lands in the session's event log.

## What's different from a stock Flue app

Six things, all enforced at build/deploy time (violations fail before a
session exists):

1. The `src/oc.ts` entry exists (everything else is plain Flue — `flue dev`
   still works).
2. `sandbox:` stays **unset** and there is **no `db.ts`** — both are supplied.
3. The model is declared in three places (`defineAgent`, `agent.toml`, the OC
   agent) and must be **identical**.
4. Skills live in `src/skills/**` (shipped with each deploy); packaged
   `with {type:'skill'}` imports and Flue channels/workflows aren't supported
   yet — the [docs](https://docs.opencomputer.dev/agent-sessions/flue) track
   the full profile.
5. Custom tools can't use the reserved names `bash`, `read`, `write`, `edit`,
   `ls`, `say`, `ask`.
6. No API keys anywhere in the repo or bundle — model credentials come from
   your OpenComputer account (CI greps for leaks).

**Custom tools run inside the deployed artifact**, which implies two rules:
anything they need at run time must be **bundled** (this starter `import`s
its fixture JSON — the repo checkout is not on the app's filesystem), and
outbound network from tools is currently unrestricted but will move behind an
egress policy — keep tools self-contained where you can.

## Local development

The agent definition is plain Flue, so the standard Flue dev loop works:

```sh
npm run dev   # flue dev — Flue's own local runtime and sandbox
```

`src/oc.ts` is additive: local dev doesn't use it, and deploying doesn't
change your agent code.

## Troubleshooting

- **`provider 401` on the first turn** — the agent has no usable model
  credential: attach an Anthropic credential to the agent, or enable managed
  billing.
- **`oc agent deploy` fails at verification** — your bundle didn't boot; the
  deploy output includes the probe's error (typically a profile violation:
  `sandbox` set, a packaged-skill import, or a reserved tool name).
- **Model rejected at deploy** — the three model declarations diverge (agent,
  `agent.toml`, code), or the model isn't on the
  [supported list](https://docs.opencomputer.dev/agent-sessions/flue#models).
