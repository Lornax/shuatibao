import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('../src/ai/client.js', () => ({
  generateStudyWelcome: vi.fn(async (_p, _s, language = 'zh') =>
    language === 'en' ? 'Welcome mock: start with one question today' : '欢迎语 mock：今天先刷错题本 10 道',
  ),
  chatStudy: vi.fn(async (_p, _s, _h, msg: string) => `mocked study reply to: ${msg}`),
  chatAboutQuestion: vi.fn(),
  recognizeQuestionFromImage: vi.fn(),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(),
  solveQuestion: vi.fn(),
  embed: vi.fn(async () => [Array.from({ length: 1024 }, () => 0.01)]),
  cosineSimilarity: vi.fn(() => 0),
}));

let pid: string;

beforeEach(async () => {
  const pRes = await app.request('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ examName: 'NPDP' }),
  });
  pid = (await pRes.json()).id;
});

describe('POST /api/profiles/:pid/study-chat/welcome', () => {
  it('inserts a welcome assistant message when history is empty', async () => {
    const res = await app.request(`/api/profiles/${pid}/study-chat/welcome`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(false);
    expect(body.message.role).toBe('assistant');
    expect(body.message.content).toContain('欢迎语 mock');
  });

  it('generates English welcome when requested by the client language', async () => {
    const res = await app.request(`/api/profiles/${pid}/study-chat/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ language: 'en' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(false);
    expect(body.message.role).toBe('assistant');
    expect(body.message.content).toContain('Welcome mock');
  });

  it('skips when history already exists', async () => {
    // first call inserts
    await app.request(`/api/profiles/${pid}/study-chat/welcome`, {
      method: 'POST',
      headers: authHeaders(),
    });
    // second call should be a no-op
    const res = await app.request(`/api/profiles/${pid}/study-chat/welcome`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toBe(true);
  });

  it('returns 404 for unknown profile', async () => {
    const res = await app.request(
      '/api/profiles/00000000-0000-0000-0000-000000000000/study-chat/welcome',
      { method: 'POST', headers: authHeaders() },
    );
    expect(res.status).toBe(404);
  });
});

describe('POST /api/profiles/:pid/study-chat', () => {
  it('persists user + assistant and returns both', async () => {
    const res = await app.request(`/api/profiles/${pid}/study-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ content: '今天该刷什么？' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userMessage.role).toBe('user');
    expect(body.userMessage.content).toBe('今天该刷什么？');
    expect(body.assistantMessage.role).toBe('assistant');
    expect(body.assistantMessage.content).toContain('mocked study reply');
  });

  it('rejects empty content', async () => {
    const res = await app.request(`/api/profiles/${pid}/study-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ content: '' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/profiles/:pid/study-chat', () => {
  it('returns asc-ordered history', async () => {
    for (const msg of ['一问', '二问']) {
      await app.request(`/api/profiles/${pid}/study-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content: msg }),
      });
    }
    const res = await app.request(`/api/profiles/${pid}/study-chat`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const { messages } = await res.json();
    expect(messages).toHaveLength(4);
    expect(messages[0].content).toBe('一问');
    expect(messages[2].content).toBe('二问');
  });
});
