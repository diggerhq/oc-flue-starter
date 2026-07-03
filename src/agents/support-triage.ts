import { defineAgent } from '@flue/runtime';
import { lookupOrder } from '../tools/lookup-order.ts';

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

export default defineAgent(() => ({
  // Must match agent.toml — the deploy verifies all three copies agree.
  model: 'anthropic/claude-sonnet-5',
  tools: [lookupOrder],
  instructions,
  // No `sandbox:` here — OpenComputer supplies the session's sandbox.
  // Setting one is a deploy-time error on OC. (Run locally with `flue dev`,
  // which uses Flue's own default instead.)
}));
