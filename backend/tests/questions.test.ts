import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('../src/ai/client.js', () => ({
  embed: vi.fn(async (texts: string[]) => texts.map(() => new Array(1024).fill(0.1))),
  cosineSimilarity: vi.fn(() => 0.5),
  recognizeQuestionFromImage: vi.fn(),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(),
}));

let pid: string;

beforeEach(async () => {
  const res = await app.request('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ examName: 'NPDP' }),
  });
  pid = (await res.json()).id;
});

const validQuestion = {
  stem: '产品生命周期分为几个阶段？',
  options: [
    { key: 'A', text: '3' },
    { key: 'B', text: '4' },
    { key: 'C', text: '5' },
    { key: 'D', text: '6' },
  ],
  answer: 'B',
  explanation: '导入、成长、成熟、衰退',
  tags: ['NPDP', '基础'],
  difficulty: 2,
};

describe('POST /api/profiles/:pid/questions', () => {
  it('creates question', async () => {
    const res = await app.request(`/api/profiles/${pid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.question.stem).toBe(validQuestion.stem);
    expect(body.question.options).toHaveLength(4);
    expect(body.question.source).toBe('manual');
    expect(body.similar).toEqual([]);
  });

  it('rejects answer not in options', async () => {
    const res = await app.request(`/api/profiles/${pid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ...validQuestion, answer: 'Z' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects unknown profile', async () => {
    const res = await app.request('/api/profiles/00000000-0000-0000-0000-000000000000/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/profiles/:pid/questions', () => {
  it('lists questions', async () => {
    await app.request(`/api/profiles/${pid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    const res = await app.request(`/api/profiles/${pid}/questions`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

describe('GET /api/questions/:id', () => {
  it('returns single question', async () => {
    const createRes = await app.request(`/api/profiles/${pid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    const created = await createRes.json();
    const res = await app.request(`/api/questions/${created.question.id}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect((await res.json()).stem).toBe(validQuestion.stem);
  });
});
