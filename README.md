# oc-flue-starter

A [Flue](https://flueframework.com) agent that deploys to
[OpenComputer](https://docs.opencomputer.dev/agent-sessions/overview) as a **durable session**: it keeps its
conversation across restarts, hibernates between turns (you don't pay for idle),
runs shell/file tools in an isolated sandbox, and wakes up when you message it.

The agent itself is plain Flue — a support-triage bot with one typed tool and
one skill, laid out the standard Flue way (`src/agents/`, discovered by
filename). The entire OpenComputer integration is [`src/opencomputer.ts`](./src/opencomputer.ts),
three lines.

**Docs:** [Flue on OpenComputer](https://docs.opencomputer.dev/agent-sessions/flue)
(includes adapting an existing Flue app — it's this repo minus the example
agent: the entry file, `agent.toml`, deploy)

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

# 1. Create the agent (optional — deploy creates it from agent.toml if missing)
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

Every deploy is an immutable
[revision](https://docs.opencomputer.dev/agent-sessions/revisions); rollback
is repointing. Sessions keep the revision they started on.

To give the agent a **codebase to work on**, attach a repo as a session
source — it lands in the agent's workspace, along with any `.agents/skills/`
the repo carries (skills for working on that repo):

```sh
oc session create --input "Fix the failing test." --source your-org/your-repo
```

## Project structure

```
agent.toml                       # OC deploy manifest: name, model, runtime = flue
flue.config.ts                   # Flue's own build config (used by `npm run dev`)
src/
  opencomputer.ts                # the OpenComputer entry — the whole integration
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

`src/opencomputer.ts` is an ordinary module you own — nothing generates or
injects it; it plays the same role as `cloudflare.ts` in a Cloudflare-deployed
Flue app (an optional platform-specific entry). A full Flue app with `app.ts`,
channels, or workflows can add this file unchanged and keep self-hosting:
code not imported by it isn't in the OpenComputer artifact.

It hands your agent to `@opencomputer/flue`, which connects it to the
platform at run time:

- **Conversation persistence** — opens Flue's conversation store on the
  session's state volume; history survives restarts and hibernation. Adding
  a `db.ts` is a build error because a second store would fork the
  conversation history.
- **Sandbox** — Flue's built-in `read`/`write`/`edit`/`bash`/`grep`/`glob`
  execute on the session's workspace sandbox (a separate machine, where
  `--source` repos are checked out). Custom tools run in-process with your
  app.
- **`say` and `ask` tools** — `say` posts a user-visible message mid-run;
  `ask` yields the session as `needs_input` and hibernates it until the user
  replies, then the run continues with the answer. Stock Flue has no
  equivalent.
- **Model credentials** — the Anthropic provider is registered with
  credentials resolved from your OC account (managed billing or a stored
  key). This repo and the bundle contain no credentials.
- **Turn handling** — session turns are admitted into Flue's engine with
  idempotent ids; if the platform side of a turn dies mid-run, the retry
  re-attaches to the still-running engine instead of re-running it (the
  model call is not repeated). Every step and tool call is written to the
  session's event log.

## What's different from a stock Flue app

Six rules, each enforced before a session can exist:

1. The `src/opencomputer.ts` entry exists (build). Everything else is plain
   Flue — `flue dev` still works.
2. `sandbox:` stays **unset** and there is **no `db.ts`** (build) — both are
   supplied by the platform.
3. The model is declared in three places (`defineAgent`, `agent.toml`, the OC
   agent) and must be **identical** (deploy).
4. Skills live in `src/skills/**` (shipped with each deploy); packaged
   `with {type:'skill'}` imports are rejected (build). Channels/workflows
   aren't supported — the
   [docs](https://docs.opencomputer.dev/agent-sessions/flue) track the full
   profile.
5. Custom tools can't use the reserved names `bash`, `read`, `write`, `edit`,
   `ls`, `grep`, `glob`, `say`, `ask` (build).
6. No API keys anywhere in the repo or bundle — model credentials come from
   your OpenComputer account. This repo's CI greps for key-shaped strings;
   the deploy scans the built artifact and fails on a hit (deploy).

**Custom tools run inside the deployed artifact**, with two consequences:
anything they need at run time must be **bundled** (this starter `import`s
its fixture JSON — the repo checkout is not on the app's filesystem), and
outbound network from tools is currently unrestricted; an egress policy is
planned, so don't embed secrets in the bundle to call your own APIs.

## Local development

The agent definition is plain Flue, so the standard Flue dev loop works:

```sh
npm run dev   # flue dev — Flue's own local runtime and sandbox
```

`flue dev` exercises the loop and your custom tools — not skills: its default
local environment is an empty in-memory filesystem, so `src/skills/**` only
take effect on OpenComputer (shipped with the artifact, placed into the
agent's workspace at run time). `src/opencomputer.ts` is additive: local dev
doesn't use it, and deploying doesn't change your agent code.

## Troubleshooting

- **Build fails (`oc-flue-build`)** — a profile violation, named in the
  error: `sandbox:` set, a `db.ts`, a packaged-skill import, a reserved tool
  name, or a model that isn't `anthropic/…`. Nothing is uploaded.
- **Deploy fails at verification** — the bundle built but didn't boot in the
  scratch sandbox; the deploy output includes the probe's error. Usual
  cause: a top-level crash in your code (something that only happens at
  import time).
- **Model rejected at deploy** — the three declarations diverge (agent,
  `agent.toml`, code); see
  [models](https://docs.opencomputer.dev/agent-sessions/flue#models).
- **`provider 401` on the first turn** — the agent has no usable model
  credential: attach an Anthropic credential, or enable managed billing.
