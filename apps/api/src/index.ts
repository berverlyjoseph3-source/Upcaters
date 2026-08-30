// apps/api/src/index.ts
//
// FIXED: this file used to build its own separate, minimal Express app
// (helmet/cors/json only, a /health route, and require()-based route mounts
// pointing at files that don't exist: './middleware/rate-limiter',
// './middleware/request-logger', './routes/billing.routes',
// './routes/webhook.routes'). It never wired in agents, cron jobs, Redis,
// or most routes -- meaning `node dist/index.js` (what package.json's
// "main"/"start" actually run) booted a near-empty server while all the
// real application logic lived, unused, in app.ts.
//
// app.ts is the complete, correct application: it registers every agent,
// initializes Redis/cron/usage metering, mounts every route, and starts
// the HTTP listener itself. This file now simply loads it, so that
// dist/index.js (the documented entrypoint) actually runs the real app.
export { app, orchestratorClient } from './app';
