import { defineConfig } from '@flue/cli/config';

// Build-time config for Flue's own tooling (`npm run dev`). The OpenComputer
// deploy path doesn't use this — `oc agent deploy` builds src/opencomputer.ts directly.
export default defineConfig({ target: 'node' });
