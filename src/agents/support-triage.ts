import { defineAgent, defineAgentProfile } from '@flue/runtime';
import { useOcGateway, route, DEFAULT_MODEL } from '@opencomputer/flue';
import { lookupOrder } from '../tools/lookup-order.ts';
import triage from '../skills/triage/SKILL.md' with { type: 'skill' };

// HTTP-transport opt-in — an OC-hosted agent is reachable at /agents/:name/:id ONLY when its module
// exports `route`. The OC dispatch Worker is the auth boundary, so this pass-through adds none.
export { route };

const instructions = `
You are a support triage agent for Acme Outfitters.

For each customer message:
1. Work out what the customer needs. If order-related, use the lookup_order
   tool to pull the order before answering.
2. For refund or damage reports, follow the "triage" skill step by step.
3. If you are missing information you cannot look up (an order id, a photo,
   the customer's intent), ask for it — don't guess.
4. Keep answers short and concrete: what you found, what happens next.
`;

// The agent name is the filename (support-triage) and must match agent.toml.
export default defineAgent((ctx) => {
  // Point the managed `anthropic` provider at the OC gateway. MUST be inside the initializer —
  // top-level module code is stripped by the Cloudflare build.
  useOcGateway(ctx);
  return {
    profile: defineAgentProfile({ instructions }),
    // Prompt-caching-safe default (claude-haiku-4-5); keep in lockstep with agent.toml.
    model: DEFAULT_MODEL,
    tools: [lookupOrder],
    // Packaged into the Worker module graph; no workspace or sandbox is needed to discover it.
    skills: [triage],
  };
});
