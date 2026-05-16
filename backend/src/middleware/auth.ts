import type { MiddlewareHandler } from 'hono';
import { config } from '../config.js';
import { verifyUserJwt } from '../lib/auth.js';

export type AuthVars = {
  userId: string;
};

/**
 * Bearer token middleware. Accepts:
 *   1. JWT signed by signUserJwt() — multi-user mode (preferred)
 *   2. The legacy hardcoded API_TOKEN — falls back to SEED_USER_ID for
 *      single-user setups / tests / migration period
 */
export const auth: MiddlewareHandler<{ Variables: AuthVars }> = async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'unauthorized' }, 401);

  // try JWT first
  const payload = await verifyUserJwt(token);
  if (payload?.sub) {
    c.set('userId', payload.sub);
    await next();
    return;
  }

  // fall back to legacy fixed API_TOKEN (tests, migration phase)
  if (token === config.API_TOKEN) {
    c.set('userId', config.SEED_USER_ID);
    await next();
    return;
  }

  return c.json({ error: 'unauthorized' }, 401);
};
