import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { basicAuth } from 'hono/basic-auth';
import { config } from './config.js';
import { auth } from './middleware/auth.js';
import type { AuthVars } from './middleware/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { questionsRouter } from './routes/questions.js';
import { attemptsRouter } from './routes/attempts.js';
import { parseRouter } from './routes/parse.js';
import { solveRouter } from './routes/solve.js';
import { tagsRouter } from './routes/tags.js';
import { importJobsRouter } from './routes/import-jobs.js';
import { chatRouter } from './routes/chat.js';
import { studyChatRouter } from './routes/study-chat.js';
import { selfHealOnBoot } from './lib/import-worker.js';

const app = new Hono<{ Variables: AuthVars }>();
const isProd = process.env.NODE_ENV === 'production';

// dev: vite (5173) → backend (3001) needs CORS. prod: same-origin, no CORS needed.
if (!isProd) {
  app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));
}

// production: HTTP basic-auth wraps the SPA + static assets so IP scanners
// can't load the JS bundle and extract the hardcoded API token. /api/* and
// /health bypass this layer — the browser sends Authorization: Bearer there
// after the SPA is loaded.
if (isProd && config.BASIC_AUTH_USER && config.BASIC_AUTH_PASS) {
  const bauth = basicAuth({
    username: config.BASIC_AUTH_USER,
    password: config.BASIC_AUTH_PASS,
  });
  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/api/') || c.req.path === '/health') {
      return next();
    }
    return bauth(c, next);
  });
}

app.use('/api/*', auth);

app.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));
app.get('/api/me', (c) => c.json({ userId: c.get('userId') }));

app.route('/api/profiles', profilesRouter);
app.route('/api', questionsRouter);
app.route('/api', attemptsRouter);
app.route('/api', parseRouter);
app.route('/api', solveRouter);
app.route('/api', tagsRouter);
app.route('/api', importJobsRouter);
app.route('/api', chatRouter);
app.route('/api', studyChatRouter);

// production: serve the built frontend as a SPA from ./public
if (isProd) {
  // hashed assets (/assets/*) are content-addressed by Vite → cache forever.
  // index.html and SPA fallback paths MUST NOT cache so users always get the
  // latest bundle reference after a deploy (otherwise mobile browsers stick
  // with an outdated JS bundle and you see "fix not applied" reports).
  app.use('/*', async (c, next) => {
    await next();
    const p = c.req.path;
    if (p.startsWith('/assets/')) {
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  });
  app.use('/*', serveStatic({ root: './public' }));
  // SPA fallback — any unmatched path returns index.html so client-side router can handle it
  app.use('/*', serveStatic({ root: './public', path: 'index.html' }));
}

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  selfHealOnBoot()
    .then((n) => {
      if (n > 0) console.log(`[import-jobs] self-healed ${n} stale job(s) on boot`);
    })
    .catch((e) => console.error('[import-jobs] self-heal failed', e));
  serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    console.log(`backend listening on :${info.port}`);
  });
}

export { app };
