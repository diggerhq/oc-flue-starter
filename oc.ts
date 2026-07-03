// The whole OpenComputer integration. Everything else in this repo is plain Flue.
import { serveOC } from '@opencomputer/flue';
import agent from './agents/support.ts';

serveOC(agent);
