import { defineConfig } from '@flue/cli/config';

// OpenComputer hosts a stock `flue build --target cloudflare` Worker (a WfP tenant script). `flue dev`
// and `npm run build` both target Cloudflare so local and deployed behavior match.
export default defineConfig({ target: 'cloudflare' });
