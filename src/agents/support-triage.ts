import { defineAgent, defineAgentProfile } from '@flue/runtime';
import {
  useOcGateway,
  route,
  DEFAULT_MODEL,
  ocRepoTools,
  ocSandbox,
  type OcRepoEnv,
  type OcSandboxEnv,
} from '@opencomputer/flue';
import { lookupOrder } from '../tools/lookup-order.ts';
import triage from '../skills/triage/SKILL.md' with { type: 'skill' };

// Export the transport route OpenComputer uses to dispatch accepted session input.
export { route };

type SupportTriageEnv = OcRepoEnv & OcSandboxEnv;

const instructions = `
You are a support triage agent for Acme Outfitters.

For support requests:
1. Work out what the customer needs. If order-related, use the lookup_order
   tool to pull the order before answering.
2. For refund or damage reports, follow the "triage" skill step by step.
3. If you are missing information you cannot look up (an order id, a short
   description of the problem, or the customer's intent), ask for it. Do not guess.
4. Keep answers short and concrete: include the order id for order-specific
   answers, what you found, and what happens next.

When the user asks you to inspect or change a repository:
1. Call list_working_repos before doing repository work. Resolve an exact
   owner/repository from that list; never assume the app's deployment repository
   is the target. A bare name is usable only when the list has exactly one match.
   Otherwise ask the user to choose.
2. Tell the user the exact owner/repository you resolved. If their target was
   exact, continue without asking for redundant confirmation.
3. Call add_source with the returned repository id and requested ref. Await it,
   then do all filesystem and shell work inside the returned source path. Never
   run authenticated Git or push directly.
4. Inspect and test the diff. Before publishing, state the exact repository,
   base branch, and intended changes.
5. Use github_publish_pull_request with the source name returned by add_source.
   Report its pull-request URL, no-changes result, or recovery error exactly.
`;

// The agent name is the filename (support-triage) and must match agent.toml.
export default defineAgent<SupportTriageEnv>((ctx) => {
  // Register OpenComputer's managed model gateway inside the Flue initializer.
  useOcGateway(ctx);
  return {
    profile: defineAgentProfile({ instructions }),
    // Prompt-caching-safe default (claude-haiku-4-5); keep in lockstep with agent.toml.
    model: DEFAULT_MODEL,
    // Both adapters are lazy: a sandbox is created only when real work needs it.
    sandbox: ocSandbox(ctx.env),
    tools: [lookupOrder, ...ocRepoTools(ctx)],
    // Packaged into the Worker module graph; no workspace or sandbox is needed to discover it.
    skills: [triage],
  };
});
