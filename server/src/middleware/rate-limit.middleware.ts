import rateLimit from 'express-rate-limit';

// Only the public share-token endpoint still uses an express-rate-limit
// instance — the rest of the rate limiting now happens inside the MCP
// controller (per-user, per-minute). Other limiters (global / auth /
// upload) were retired together with the legacy Express routes.

export const shareTokenRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});
