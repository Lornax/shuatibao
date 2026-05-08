import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';

const app = new Hono();

app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));

app.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`backend listening on :${info.port}`);
});

export { app };
