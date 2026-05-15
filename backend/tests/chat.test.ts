import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('../src/ai/client.js', () => ({
  chatAboutQuestion: vi.fn(async (_q, _h, msg: string) => `mocked reply to: ${msg}`),
  recognizeQuestionFromImage: vi.fn(),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(),
  solveQuestion: vi.fn(),
  embed: vi.fn(async () => [Array.from({ length: 1024 }, () => 0.01)]),
  cosineSimilarity: vi.fn(() => 0),
}));

let pid: string;
let qid: string;

beforeEach(async () => {
  const pRes = await app.request('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ examName: 'NPDP' }),
  });
  pid = (await pRes.json()).id;

  const qRes = await app.request(`/api/profiles/${pid}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      stem: '测试题',
      options: [
        { key: 'A', text: 'a' },
        { key: 'B', text: 'b' },
      ],
      answer: 'A',
      explanation: '答案是 A',
      tags: ['NPDP'],
      difficulty: 2,
      source: 'manual',
    }),
  });
  qid = (await qRes.json()).question.id;
});

describe('POST /api/questions/:qid/chat', () => {
  it('persists user + assistant messages and returns both', async () => {
    const res = await app.request(`/api/questions/${qid}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ content: '为什么是 A？' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userMessage.content).toBe('为什么是 A？');
    expect(body.userMessage.role).toBe('user');
    expect(body.assistantMessage.content).toContain('mocked reply');
    expect(body.assistantMessage.role).toBe('assistant');
  });

  it('returns 404 for unknown question', async () => {
    const res = await app.request(
      '/api/questions/00000000-0000-0000-0000-000000000000/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content: 'x' }),
      },
    );
    expect(res.status).toBe(404);
  });

  it('rejects empty content (400)', async () => {
    const res = await app.request(`/api/questions/${qid}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ content: '' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/questions/:qid/chat', () => {
  it('returns chat history in chronological order', async () => {
    for (const msg of ['第一问', '第二问', '第三问']) {
      await app.request(`/api/questions/${qid}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content: msg }),
      });
    }
    const res = await app.request(`/api/questions/${qid}/chat`, {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const { messages } = await res.json();
    // 3 user + 3 assistant
    expect(messages).toHaveLength(6);
    const roles = messages.map((m: { role: string }) => m.role);
    expect(roles).toEqual(['user', 'assistant', 'user', 'assistant', 'user', 'assistant']);
    expect(messages[0].content).toBe('第一问');
    expect(messages[4].content).toBe('第三问');
  });

  it('returns empty array when no messages', async () => {
    const res = await app.request(`/api/questions/${qid}/chat`, {
      headers: authHeaders(),
    });
    const { messages } = await res.json();
    expect(messages).toEqual([]);
  });
});

describe('DELETE /api/questions/:qid/chat', () => {
  it('clears all messages', async () => {
    await app.request(`/api/questions/${qid}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ content: 'hi' }),
    });
    const del = await app.request(`/api/questions/${qid}/chat`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(del.status).toBe(200);
    const after = await app.request(`/api/questions/${qid}/chat`, {
      headers: authHeaders(),
    });
    expect((await after.json()).messages).toEqual([]);
  });
});
