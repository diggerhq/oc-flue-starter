import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
// Fixture data rides the artifact bundle — custom tools run inside the
// agent's sandbox, so anything they need at runtime must be imported, not
// read from the repo checkout. (A real integration would call your API here;
// see the README's note on outbound network access.)
import orders from '../data/orders.json' with { type: 'json' };

export const lookupOrder = defineTool({
  name: 'lookup_order',
  description:
    'Look up an Acme order by id (e.g. "1042"). Returns status, items, and shipping info.',
  input: v.object({
    order_id: v.pipe(v.string(), v.regex(/^\d+$/, 'numeric order id')),
  }),
  run({ input }) {
    const order = (orders as Record<string, unknown>)[input.order_id];
    if (!order) {
      return { found: false, hint: 'No such order. Ask the customer to double-check the id.' };
    }
    return { found: true, order };
  },
});
