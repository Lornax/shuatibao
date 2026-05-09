import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('pdf-parse', () => ({
  default: vi.fn(async (buf: Buffer) => ({ text: 'Mock PDF extracted text content here for testing purposes' })),
}));

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
  generateQuestionFromPrompt: vi.fn(async () => ({
    stem: 'mock 出题题干',
    options: [
      { key: 'A', text: 'aa' },
      { key: 'B', text: 'bb' },
      { key: 'C', text: 'cc' },
      { key: 'D', text: 'dd' },
    ],
    answer: 'C',
    explanation: 'because',
    tags: ['NPDP'],
    difficulty: 3,
  })),
  structureQuestionsFromPdfText: vi.fn(async () => [
    {
      stem: 'PDF 题 1',
      options: [
        { key: 'A', text: '1' },
        { key: 'B', text: '2' },
      ],
      answer: 'A',
      explanation: '',
      tags: ['NPDP'],
      difficulty: 2,
    },
    {
      stem: 'PDF 题 2',
      options: [
        { key: 'A', text: 'x' },
        { key: 'B', text: 'y' },
      ],
      answer: 'B',
      explanation: '',
      tags: ['NPDP'],
      difficulty: 1,
    },
  ]),
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

describe('POST /api/profiles/:pid/parse/prompt', () => {
  it('rejects unauth', async () => {
    const res = await app.request(`/api/profiles/${pid}/parse/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ knowledge: '产品生命周期' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects empty knowledge', async () => {
    const res = await app.request(`/api/profiles/${pid}/parse/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ knowledge: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns candidate from mocked AI', async () => {
    const res = await app.request(`/api/profiles/${pid}/parse/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ knowledge: '产品生命周期' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidate.stem).toBe('mock 出题题干');
    expect(body.source).toBe('ai_gen');
  });
});

describe('POST /api/profiles/:pid/parse/pdf', () => {
  it('returns candidates array from mocked AI', async () => {
    const fd = new FormData();
    // 拼一个看起来像 PDF 的 buffer，mock 会忽略实际内容
    const fakePdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(40).fill(0x20)]);
    fd.set('pdf', new File([fakePdfBytes], 't.pdf', { type: 'application/pdf' }));
    const res = await app.request(`/api/profiles/${pid}/parse/pdf`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidates).toHaveLength(2);
    expect(body.source).toBe('pdf');
    expect(body.count).toBe(2);
  });

  it('rejects no pdf', async () => {
    const fd = new FormData();
    const res = await app.request(`/api/profiles/${pid}/parse/pdf`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('pdf_missing');
  });
});
