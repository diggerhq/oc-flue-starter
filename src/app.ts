// The OpenComputer hosting app: mounts Flue's routes, adds the `/health` probe (stock Flue has none),
// and forwards lifecycle/usage to OC_INGEST. Nothing to edit — deploy with `oc agent deploy`.
export { default } from '@opencomputer/flue/app';
