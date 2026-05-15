import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('pdf-parse', () => ({
  default: vi.fn(async (_buf: Buffer, opts: any) => {
    // Simulate pdf-parse calling pagerender per page; we feed 3 mock pages.
    const pages = [
      '第 1 章 产品创新概述\n本章主要介绍产品创新的概念。' + '内容内容内容'.repeat(80),
      '产品生命周期理论是 NPDP 核心考点之一。包括引入期、成长期、成熟期、衰退期。' + '说明说明说明'.repeat(80),
      '第 2 章 战略管理\n企业战略与产品战略的关系。' + '关系关系关系'.repeat(80),
    ];
    if (opts?.pagerender) {
      for (const text of pages) {
        const fakePage = {
          getTextContent: async () => ({
            items: [{ str: text }],
          }),
        };
        await opts.pagerender(fakePage);
      }
    }
    return { text: pages.join('\n'), numpages: pages.length };
  }),
}));

vi.mock('../src/ai/client.js', () => ({
  embed: vi.fn(async (texts: string[]) =>
    texts.map((_, i) => Array.from({ length: 1024 }, () => 0.01 * (i + 1))),
  ),
  cosineSimilarity: vi.fn(() => 0.5),
  chatStudy: vi.fn(),
  generateStudyWelcome: vi.fn(),
  chatAboutQuestion: vi.fn(),
  recognizeQuestionFromImage: vi.fn(),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(),
  solveQuestion: vi.fn(),
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

function fakePdfForm(name = 'textbook.pdf') {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(40).fill(0x20)]);
  const fd = new FormData();
  fd.set('pdf', new File([bytes], name, { type: 'application/pdf' }));
  return fd;
}

async function waitFor<T>(check: () => Promise<T | null>, timeoutMs = 3000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await check();
    if (v !== null) return v;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('waitFor timeout');
}

describe('POST /api/profiles/:pid/textbooks', () => {
  it('rejects non-pdf', async () => {
    const fd = new FormData();
    fd.set('pdf', new File([new Uint8Array([1, 2])], 'a.txt', { type: 'text/plain' }));
    const res = await app.request(`/api/profiles/${pid}/textbooks`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing pdf', async () => {
    const res = await app.request(`/api/profiles/${pid}/textbooks`, {
      method: 'POST',
      headers: authHeaders(),
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });

  it('uploads + processes textbook → ready with chunks', async () => {
    const res = await app.request(`/api/profiles/${pid}/textbooks`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfForm(),
    });
    expect(res.status).toBe(201);
    const { id } = await res.json();

    // wait for worker to mark ready
    const final = await waitFor(async () => {
      const r = await app.request(`/api/profiles/${pid}/textbooks/${id}`, {
        headers: authHeaders(),
      });
      const body = await r.json();
      return body.status === 'ready' ? body : null;
    });
    expect(final.chunkCount).toBeGreaterThan(0);
    // chapter regex should pick up "第 1 章" and "第 2 章"
    expect(final.chapterCount).toBeGreaterThanOrEqual(2);
    expect(final.totalPages).toBe(3);
  });
});

describe('GET / DELETE textbooks', () => {
  it('lists profile textbooks', async () => {
    const upload = await app.request(`/api/profiles/${pid}/textbooks`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfForm(),
    });
    const { id } = await upload.json();
    await waitFor(async () => {
      const r = await app.request(`/api/profiles/${pid}/textbooks/${id}`, {
        headers: authHeaders(),
      });
      return (await r.json()).status === 'ready' ? true : null;
    });

    const res = await app.request(`/api/profiles/${pid}/textbooks`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.textbooks).toHaveLength(1);
    expect(body.textbooks[0].id).toBe(id);
  });

  it('deletes textbook + cascades chunks', async () => {
    const up = await app.request(`/api/profiles/${pid}/textbooks`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfForm(),
    });
    const { id } = await up.json();
    await waitFor(async () => {
      const r = await app.request(`/api/profiles/${pid}/textbooks/${id}`, {
        headers: authHeaders(),
      });
      return (await r.json()).status === 'ready' ? true : null;
    });
    const del = await app.request(`/api/profiles/${pid}/textbooks/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(del.status).toBe(200);
    const after = await app.request(`/api/profiles/${pid}/textbooks/${id}`, {
      headers: authHeaders(),
    });
    expect(after.status).toBe(404);
  });
});
