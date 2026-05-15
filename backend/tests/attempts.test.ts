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

  it('keeps question in wrongbook after 1 wrong + 1 correct (streak=1)', async () => {
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
    expect(body).toHaveLength(1);
    expect(body[0].correct_streak).toBe(1);
    expect(body[0].source).toBe('auto');
  });

  it('removes question after 3 consecutive correct answers (mastered)', async () => {
    // 1 错 → 加入错题本
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'A' }),
    });
    // 3 对 → 自动移除
    for (let i = 0; i < 3; i++) {
      await app.request(`/api/questions/${qid}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ chosen: 'B' }),
      });
    }
    const res = await app.request(`/api/profiles/${pid}/wrongbook`, { headers: authHeaders() });
    expect(await res.json()).toHaveLength(0);
  });

  it('resets streak when answered wrong again', async () => {
    // 1 错 + 2 对 → streak=2
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
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'B' }),
    });
    // 再 1 错 → streak 重置为 0
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'A' }),
    });
    const res = await app.request(`/api/profiles/${pid}/wrongbook`, { headers: authHeaders() });
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].correct_streak).toBe(0);
  });
});

describe('POST/DELETE /api/questions/:qid/wrongbook (manual)', () => {
  it('manually adds a question with source=manual', async () => {
    const res = await app.request(`/api/questions/${qid}/wrongbook`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry.source).toBe('manual');
    expect(body.alreadyIn).toBe(false);

    // POST 第二次：alreadyIn=true，不报错
    const second = await app.request(`/api/questions/${qid}/wrongbook`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(second.status).toBe(200);
    expect((await second.json()).alreadyIn).toBe(true);

    // wrongbook 列表应该有这道题
    const list = await app.request(`/api/profiles/${pid}/wrongbook`, { headers: authHeaders() });
    const items = await list.json();
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('manual');
  });

  it('manually removes a question', async () => {
    await app.request(`/api/questions/${qid}/wrongbook`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const del = await app.request(`/api/questions/${qid}/wrongbook`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(del.status).toBe(200);
    const list = await app.request(`/api/profiles/${pid}/wrongbook`, { headers: authHeaders() });
    expect(await list.json()).toHaveLength(0);
  });

  it('GET /questions/:qid/wrongbook tells whether the question is in', async () => {
    const before = await app.request(`/api/questions/${qid}/wrongbook`, { headers: authHeaders() });
    expect((await before.json()).entry).toBeNull();

    await app.request(`/api/questions/${qid}/wrongbook`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const after = await app.request(`/api/questions/${qid}/wrongbook`, { headers: authHeaders() });
    const body = await after.json();
    expect(body.entry).not.toBeNull();
    expect(body.entry.source).toBe('manual');
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
