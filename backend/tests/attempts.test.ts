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
let qid: string;

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
};

beforeEach(async () => {
  const pRes = await app.request('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ examName: 'NPDP' }),
  });
  const p = await pRes.json();
  pid = p.id;
  const qRes = await app.request(`/api/profiles/${pid}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(validQuestion),
  });
  const q = await qRes.json();
  qid = q.question.id;
});

describe('POST /api/questions/:qid/attempts', () => {
  it('records correct attempt', async () => {
    const res = await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'B', timeSpentMs: 5000 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempt.isCorrect).toBe(true);
    expect(body.correctAnswer).toBe('B');
  });

  it('records wrong attempt and reveals answer', async () => {
    const res = await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'A' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempt.isCorrect).toBe(false);
    expect(body.correctAnswer).toBe('B');
    expect(body.explanation).toBe(validQuestion.explanation);
  });
});

describe('GET /api/profiles/:pid/wrongbook', () => {
  it('returns wrong attempts only', async () => {
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'A' }),
    });
    const res = await app.request(`/api/profiles/${pid}/wrongbook`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(qid);
    expect(body[0].last_chosen).toBe('A');
    expect(body[0].wrong_count).toBe(1);
  });

  it('excludes question once correctly answered after wrong', async () => {
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'A' }),
    });
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'B' }),
    });
    const res = await app.request(`/api/profiles/${pid}/wrongbook`, { headers: authHeaders() });
    const body = await res.json();
    expect(body).toHaveLength(0);
  });
});

describe('GET /api/profiles/:pid/quiz/next', () => {
  it('returns a question when unanswered exists', async () => {
    const res = await app.request(`/api/profiles/${pid}/quiz/next`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(qid);
  });

  it('returns done=true when all correctly answered', async () => {
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'B' }),
    });
    const res = await app.request(`/api/profiles/${pid}/quiz/next`, { headers: authHeaders() });
    const body = await res.json();
    expect(body.done).toBe(true);
  });
});
