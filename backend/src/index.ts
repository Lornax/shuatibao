import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { auth } from './middleware/auth.js';
import type { AuthVars } from './middleware/auth.js';

const app = new Hono<{ Variables: AuthVars }>();

app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/api/*', auth);

app.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));
app.get('/api/me', (c) => c.json({ userId: c.get('userId') }));

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`backend listening on :${info.port}`);
});

export { app };
