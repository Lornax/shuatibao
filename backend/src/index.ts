import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { auth } from './middleware/auth.js';
import type { AuthVars } from './middleware/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { questionsRouter } from './routes/questions.js';

const app = new Hono<{ Variables: AuthVars }>();

app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/api/*', auth);

app.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));
app.get('/api/me', (c) => c.json({ userId: c.get('userId') }));

app.route('/api/profiles', profilesRouter);
app.route('/api', questionsRouter);

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    console.log(`backend listening on :${info.port}`);
  });
}

export { app };
