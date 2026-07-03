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
oc session create --input "Customer says order 1042 hasn't arrived — what do I tell them?"
oc session logs <session-id>
```

Reply to anything the agent asks with
`oc session steer <session-id> "your answer"`, or open the session in the
[dashboard](https://app.opencomputer.dev) and chat there. The triage **skill** is
packaged into the artifact from `src/skills/` on every deploy — try it:
`oc session create --input "Order 2203 arrived with a bent tent pole."`

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

Skills in `src/skills/` belong to **this agent**: the build packages them
into the artifact, and at run time they are written into the agent's
workspace, where Flue's normal discovery finds them. This is separate from
`.agents/skills/` in repos you attach as sources — that convention means
"skills for agents working on *that* repo," and those are picked up from the
workspace too. (Flue's packaged skill imports — `with { type: 'skill' }` —
aren't supported on OC yet.)

## What `serveOC` does

`src/oc.ts` hands your agent to `@opencomputer/flue`, which connects it to
the platform at run time:

- **Conversation persistence** — opens Flue's conversation store on the
  session's state volume; history survives restarts and hibernation. Adding
  a `db.ts` is a deploy error because a second store would fork the
  conversation history.
- **Sandbox** — Flue's built-in `read`/`write`/`edit`/`bash` execute on the
  session's workspace sandbox (a separate machine, where `--source` repos
  are checked out). Custom tools run in-process with your app.
- **`say` and `ask` tools** — `ask` yields the session as `needs_input` and
  hibernates it until the user replies, then the run continues with the
  answer. Stock Flue has no equivalent.
- **Model credentials** — the Anthropic provider is registered with
  credentials resolved from your OC account (managed billing or a stored
  key). This repo and the bundle contain no credentials.
- **Turn handling** — session turns are admitted into Flue's engine with
  idempotent ids (platform retries can't double-run one); every step and
  tool call is written to the session's event log.

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
   your OpenComputer account. This repo's CI greps for key-shaped strings,
   and the deploy scans the built artifact and fails on a hit.

**Custom tools run inside the deployed artifact**, which implies two rules:
anything they need at run time must be **bundled** (this starter `import`s
its fixture JSON — the repo checkout is not on the app's filesystem), and
outbound network from tools is currently unrestricted; an egress policy is
planned, so don't embed secrets in the bundle to call your own APIs.

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
