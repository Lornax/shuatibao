import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';
import { cosineSimilarity as mockedCos } from '../src/ai/client.js';

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

describe('similar response includes options/answer fields', () => {
  it('returns full similar fields when similarity high', async () => {
    const profileRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const testPid = (await profileRes.json()).id;

    // create first question (similar will be empty since no others exist)
    const r1 = await app.request(`/api/profiles/${testPid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    expect((await r1.json()).similar).toEqual([]);

    // mock cosineSimilarity to return 0.92 for next call
    vi.mocked(mockedCos).mockReturnValue(0.92);

    // create second question
    const r2 = await app.request(`/api/profiles/${testPid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ...validQuestion, stem: '稍微不一样的题干' }),
    });
    const body2 = await r2.json();
    expect(body2.similar).toHaveLength(1);
    expect(body2.similar[0]).toHaveProperty('options');
    expect(body2.similar[0]).toHaveProperty('answer');
    expect(body2.similar[0]).toHaveProperty('explanation');
    expect(body2.similar[0].similarity).toBeGreaterThanOrEqual(0.85);

    // reset for other tests
    vi.mocked(mockedCos).mockReturnValue(0.5);
  });
});

describe('DELETE /api/questions/:id', () => {
  it('deletes question', async () => {
    const profileRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const testPid = (await profileRes.json()).id;
    const qRes = await app.request(`/api/profiles/${testPid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    const qid = (await qRes.json()).question.id;

    const delRes = await app.request(`/api/questions/${qid}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(delRes.status).toBe(200);

    const getRes = await app.request(`/api/questions/${qid}`, { headers: authHeaders() });
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for missing question', async () => {
    const res = await app.request('/api/questions/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/questions/:id', () => {
  it('updates stem', async () => {
    const profileRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const testPid = (await profileRes.json()).id;
    const qRes = await app.request(`/api/profiles/${testPid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    const qid = (await qRes.json()).question.id;

    const patchRes = await app.request(`/api/questions/${qid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ stem: '改后的题干' }),
    });
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).stem).toBe('改后的题干');
  });

  it('rejects answer not in options on patch', async () => {
    const profileRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const testPid = (await profileRes.json()).id;
    const qRes = await app.request(`/api/profiles/${testPid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    const qid = (await qRes.json()).question.id;

    const patchRes = await app.request(`/api/questions/${qid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ answer: 'Z' }),
    });
    expect(patchRes.status).toBe(400);
  });
});

describe('POST /api/profiles/:pid/questions/batch-delete', () => {
  it('deletes multiple questions in one call', async () => {
    const profileRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const pid = (await profileRes.json()).id;
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await app.request(`/api/profiles/${pid}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...validQuestion, stem: `题 ${i}` }),
      });
      ids.push((await r.json()).question.id);
    }
    const res = await app.request(`/api/profiles/${pid}/questions/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ids: ids.slice(0, 2) }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(2);

    const remaining = await app.request(`/api/profiles/${pid}/questions`, {
      headers: authHeaders(),
    });
    expect(await remaining.json()).toHaveLength(1);
  });

  it('rejects ids not belonging to profile', async () => {
    const p1Res = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'A' }),
    });
    const p1 = (await p1Res.json()).id;
    const p2Res = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'B' }),
    });
    const p2 = (await p2Res.json()).id;

    // create question under p1
    const qRes = await app.request(`/api/profiles/${p1}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    const qid = (await qRes.json()).question.id;

    // try to delete it via p2's endpoint
    const del = await app.request(`/api/profiles/${p2}/questions/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ids: [qid] }),
    });
    expect(del.status).toBe(200);
    expect((await del.json()).deleted).toBe(0);

    // p1 still has the question
    const list = await app.request(`/api/profiles/${p1}/questions`, { headers: authHeaders() });
    expect(await list.json()).toHaveLength(1);
  });
});
