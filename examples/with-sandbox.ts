import { defineAgent, defineAgentProfile } from '@flue/runtime';
import {
  DEFAULT_MODEL,
  ocSandbox,
  route,
  useOcGateway,
  type OcSandboxEnv,
} from '@opencomputer/flue';

export { route };

export default defineAgent<OcSandboxEnv>((ctx) => {
  useOcGateway(ctx);

  return {
    profile: defineAgentProfile({
      instructions: 'Use the shell or filesystem only when the task requires it.',
    }),
    model: DEFAULT_MODEL,
    sandbox: ocSandbox(ctx.env),
  };
});
