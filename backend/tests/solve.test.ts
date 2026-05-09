import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('../src/ai/client.js', () => ({
  solveQuestion: vi.fn(async () => ({ answer: 'B', explanation: 'because B is the right one in NPDP context' })),
  embed: vi.fn(async (texts: string[]) => texts.map(() => new Array(1024).fill(0.1))),
  cosineSimilarity: vi.fn(() => 0.5),
  recognizeQuestionFromImage: vi.fn(),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(),
}));

const validBody = {
  stem: '产品生命周期分几阶段？',
  options: [
    { key: 'A', text: '3' },
    { key: 'B', text: '4' },
    { key: 'C', text: '5' },
    { key: 'D', text: '6' },
  ],
};

describe('POST /api/solve-candidate', () => {
  it('rejects no body', async () => {
    const res = await app.request('/api/solve-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns answer from mocked solve', async () => {
    const res = await app.request('/api/solve-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBe('B');
    expect(body.explanation).toBeTruthy();
  });
});

describe('POST /api/questions/:qid/solve', () => {
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
      body: JSON.stringify({ ...validBody, answer: 'B' }),
    });
    qid = (await qRes.json()).question.id;
  });

  it('returns 404 for unknown question', async () => {
    const res = await app.request('/api/questions/00000000-0000-0000-0000-000000000000/solve', {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(res.status).toBe(404);
  });

  it('returns AI answer for known question', async () => {
    const res = await app.request(`/api/questions/${qid}/solve`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).answer).toBe('B');
  });
});
