import { defineConfig } from '@flue/cli/config';

// Use the same Flue target for local builds and OpenComputer deployment so behavior stays aligned.
export default defineConfig({ target: 'cloudflare' });
