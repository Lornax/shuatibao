import type { MiddlewareHandler } from 'hono';
import { config } from '../config.js';

export type AuthVars = {
  userId: string;
};

export const auth: MiddlewareHandler<{ Variables: AuthVars }> = async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== config.API_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  c.set('userId', config.SEED_USER_ID);
  await next();
};
