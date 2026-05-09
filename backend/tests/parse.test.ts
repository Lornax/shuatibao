import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('../src/ai/client.js', () => ({
  recognizeQuestionFromImage: vi.fn(async () => ({
    stem: 'mock 题干',
    options: [
      { key: 'A', text: 'a' },
      { key: 'B', text: 'b' },
    ],
    answer: 'A',
    explanation: '',
    tags: ['NPDP'],
    difficulty: 2,
  })),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(),
  embed: vi.fn(),
  cosineSimilarity: vi.fn(),
}));

let pid: string;

beforeEach(async () => {
  const p = await app
    .request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    })
    .then((r) => r.json());
  pid = p.id;
});

describe('POST /api/profiles/:pid/parse/image', () => {
  it('rejects unauth', async () => {
    const fd = new FormData();
    fd.set('image', new File([new Uint8Array([1, 2, 3])], 't.png', { type: 'image/png' }));
    const res = await app.request(`/api/profiles/${pid}/parse/image`, { method: 'POST', body: fd });
    expect(res.status).toBe(401);
  });

  it('rejects wrong profile', async () => {
    const fd = new FormData();
    fd.set('image', new File([new Uint8Array([1, 2, 3])], 't.png', { type: 'image/png' }));
    const res = await app.request('/api/profiles/00000000-0000-0000-0000-000000000000/parse/image', {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(404);
  });

  it('rejects no image', async () => {
    const fd = new FormData();
    const res = await app.request(`/api/profiles/${pid}/parse/image`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('image_missing');
  });

  it('rejects non-image', async () => {
    const fd = new FormData();
    fd.set('image', new File([new Uint8Array([1, 2, 3])], 't.txt', { type: 'text/plain' }));
    const res = await app.request(`/api/profiles/${pid}/parse/image`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('not_an_image');
  });

  it('returns candidate from mocked AI', async () => {
    const fd = new FormData();
    fd.set('image', new File([new Uint8Array([1, 2, 3])], 't.png', { type: 'image/png' }));
    const res = await app.request(`/api/profiles/${pid}/parse/image`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidate.stem).toBe('mock 题干');
    expect(body.source).toBe('photo');
  });
});
