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

## How it works

Your app runs as the session's **resident brain**: `oc agent deploy` bundles it
(with your exact Flue version) into an artifact, and OpenComputer boots that
artifact inside the session's sandbox. File and shell tools execute on a
separate **workspace sandbox** — the agent edits files and runs commands there,
never on the box holding credentials. Every step lands in the session's
**durable event log**: the conversation survives crashes and hibernation, and
each deploy creates an immutable revision (roll back by repointing).

## What's supported today

This integration is **experimental** and intentionally constrained. Supported:

- One agent per app, exported through `serveOC` (see `src/oc.ts`)
- `anthropic/*` models (managed billing or your Anthropic key)
- Custom `defineTool` tools and subagents — they run in-process with your app
- Skills shipped with your app (`src/skills/**` rides each deploy), plus
  workspace skills from repos attached as sources
- GitHub watches as input events

Not yet: packaged skill imports (`with { type: 'skill' }`), Flue channels and
workflows, non-Anthropic models, multiple agents per app. The
[docs page](https://docs.opencomputer.dev/agent-sessions/flue) tracks the
full list.

**Note on outbound network:** custom tools run inside your agent's sandbox
with unrestricted outbound network access *in this release*; this will move
behind an egress policy. (This starter's tool is deliberately network-free —
it reads bundled fixture data.)

## Local development

The agent definition is plain Flue, so the standard Flue dev loop works:

```sh
npm run dev   # flue dev — Flue's own local runtime and sandbox
```

`src/oc.ts` is additive: local dev doesn't use it, and deploying doesn't
change your agent code.

## Rules this template follows

Deploys are validated, so these are checked, not just conventions:

- `model` in `src/agents/support-triage.ts` **must equal** `model` in `agent.toml`
- don't set `sandbox:` in the agent (OC supplies it) and don't add a `db.ts`
  (conversation durability is provided by the platform)
- don't name a custom tool `bash`, `read`, `write`, `edit`, `ls`, `say`, or
  `ask` — those are reserved
- no API keys anywhere in the repo — model credentials come from your OC
  account

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
