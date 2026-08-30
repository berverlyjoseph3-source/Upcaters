"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestratorClient = exports.app = void 0;
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
var app_1 = require("./app");
Object.defineProperty(exports, "app", { enumerable: true, get: function () { return app_1.app; } });
Object.defineProperty(exports, "orchestratorClient", { enumerable: true, get: function () { return app_1.orchestratorClient; } });
//# sourceMappingURL=index.js.map