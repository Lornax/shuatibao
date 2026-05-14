import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('pdf-parse', () => ({
  default: vi.fn(async (_buf: Buffer) => ({
    // text long enough to produce multiple chunks (default chunk size 3500)
    // we craft it with question-number boundaries so chunker can split cleanly
    text: ([1, 2, 3, 4, 5, 6, 7, 8] as const)
      .map((n) => `${n}. 第 ${n} 题题干 ` + '内容'.repeat(700) + '\nA. a\nB. b\nC. c\nD. d\n答案：A\n')
      .join(''),
  })),
}));

vi.mock('../src/ai/client.js', () => ({
  recognizeQuestionFromImage: vi.fn(),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(async () => [
    {
      stem: 'PDF 题 mock',
      options: [
        { key: 'A', text: 'a' },
        { key: 'B', text: 'b' },
      ],
      answer: 'A',
      explanation: '',
      tags: ['NPDP'],
      difficulty: 2,
    },
  ]),
  solveQuestion: vi.fn(),
  embed: vi.fn(),
  cosineSimilarity: vi.fn(),
}));

import { structureQuestionsFromPdfText } from '../src/ai/client.js';

let pid: string;

async function createProfile() {
  const res = await app.request('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ examName: 'NPDP' }),
  });
  const p = await res.json();
  return p.id as string;
}

function fakePdfFile(name = 't.pdf') {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(40).fill(0x20)]);
  const fd = new FormData();
  fd.set('pdf', new File([bytes], name, { type: 'application/pdf' }));
  return fd;
}

async function waitFor<T>(check: () => Promise<T | null>, timeoutMs = 2000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await check();
    if (v !== null) return v;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('waitFor timeout');
}

async function getJob(pid: string, jid: string) {
  const res = await app.request(`/api/profiles/${pid}/import-jobs/${jid}`, {
    headers: authHeaders(),
  });
  return { status: res.status, body: await res.json() };
}

beforeEach(async () => {
  pid = await createProfile();
  // reset mock to default success behavior every test
  vi.mocked(structureQuestionsFromPdfText).mockReset();
  vi.mocked(structureQuestionsFromPdfText).mockResolvedValue([
    {
      stem: 'PDF 题 mock',
      options: [
        { key: 'A', text: 'a' },
        { key: 'B', text: 'b' },
      ],
      answer: 'A',
      explanation: '',
      tags: ['NPDP'],
      difficulty: 2,
    },
  ]);
});

describe('POST /api/profiles/:pid/import-jobs', () => {
  it('rejects unauthorized', async () => {
    const res = await app.request(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      body: fakePdfFile(),
    });
    expect(res.status).toBe(401);
  });

  it('rejects other user profile (404)', async () => {
    const res = await app.request(
      '/api/profiles/00000000-0000-0000-0000-000000000000/import-jobs',
      { method: 'POST', headers: authHeaders(), body: fakePdfFile() },
    );
    expect(res.status).toBe(404);
  });

  it('rejects missing pdf field (400)', async () => {
    const res = await app.request(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: new FormData(),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('pdf_missing');
  });

  it('creates a job, runs worker, accumulates candidates, marks completed', async () => {
    const res = await app.request(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfFile(),
    });
    expect(res.status).toBe(201);
    const { jobId, totalChunks } = await res.json();
    expect(typeof jobId).toBe('string');
    expect(totalChunks).toBeGreaterThanOrEqual(2);

    const final = await waitFor(async () => {
      const r = await getJob(pid, jobId);
      return r.body.status === 'completed' ? r.body : null;
    });

    expect(final.status).toBe('completed');
    expect(final.doneChunks).toBe(final.totalChunks);
    // mock returns 1 candidate per chunk × N chunks
    expect(final.candidates.length).toBe(final.totalChunks);
    expect(final.candidates[0].stem).toBe('PDF 题 mock');
    expect(final.finishedAt).toBeTruthy();
  });

  it('preserves partial candidates when a chunk fails', async () => {
    // 1st chunk succeeds, 2nd throws
    vi.mocked(structureQuestionsFromPdfText).mockReset();
    vi.mocked(structureQuestionsFromPdfText)
      .mockResolvedValueOnce([
        {
          stem: 'good',
          options: [
            { key: 'A', text: 'a' },
            { key: 'B', text: 'b' },
          ],
          answer: 'A',
          explanation: '',
          tags: ['NPDP'],
          difficulty: 2,
        },
      ])
      .mockRejectedValue(new Error('mock LLM timeout'));

    const res = await app.request(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfFile(),
    });
    expect(res.status).toBe(201);
    const { jobId } = await res.json();

    const final = await waitFor(async () => {
      const r = await getJob(pid, jobId);
      return r.body.status === 'failed' ? r.body : null;
    });

    expect(final.status).toBe('failed');
    expect(final.error).toContain('mock LLM timeout');
    expect(final.candidates).toHaveLength(1);
    expect(final.candidates[0].stem).toBe('good');
  });

  it('returns 409 with existing jobId when another job is already in flight', async () => {
    // first job: keep it stuck "running" by making structureQuestions never resolve
    let resolveFirst: () => void;
    const firstChunkPromise = new Promise<unknown[]>((resolve) => {
      resolveFirst = () =>
        resolve([
          {
            stem: 's',
            options: [
              { key: 'A', text: 'a' },
              { key: 'B', text: 'b' },
            ],
            answer: 'A',
            explanation: '',
            tags: ['NPDP'],
            difficulty: 2,
          },
        ]);
    });
    vi.mocked(structureQuestionsFromPdfText).mockReset();
    vi.mocked(structureQuestionsFromPdfText).mockReturnValue(
      firstChunkPromise as Promise<never>,
    );

    const r1 = await app.request(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfFile(),
    });
    expect(r1.status).toBe(201);
    const { jobId: firstId } = await r1.json();

    // give the worker a tick to flip status to running
    await new Promise((r) => setTimeout(r, 30));

    const r2 = await app.request(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfFile(),
    });
    expect(r2.status).toBe(409);
    const body = await r2.json();
    expect(body.error).toBe('job_in_progress');
    expect(body.jobId).toBe(firstId);

    // unblock so the worker can finish and not leak across tests
    resolveFirst!();
    await waitFor(async () => {
      const r = await getJob(pid, firstId);
      return r.body.status === 'completed' || r.body.status === 'failed' ? r.body : null;
    });
  });
});

describe('GET /api/profiles/:pid/import-jobs', () => {
  it('lists jobs filtered by status', async () => {
    // create + complete a job
    const r1 = await app.request(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfFile(),
    });
    const { jobId } = await r1.json();
    await waitFor(async () => {
      const r = await getJob(pid, jobId);
      return r.body.status === 'completed' ? r.body : null;
    });

    const r2 = await app.request(
      `/api/profiles/${pid}/import-jobs?status=completed`,
      { headers: authHeaders() },
    );
    expect(r2.status).toBe(200);
    const body = await r2.json();
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].id).toBe(jobId);

    const r3 = await app.request(
      `/api/profiles/${pid}/import-jobs?status=running,pending`,
      { headers: authHeaders() },
    );
    expect((await r3.json()).jobs).toHaveLength(0);
  });
});

describe('GET /api/profiles/:pid/import-jobs/:jid', () => {
  it('404 when job belongs to different profile', async () => {
    const r1 = await app.request(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: fakePdfFile(),
    });
    const { jobId } = await r1.json();
    await waitFor(async () => {
      const r = await getJob(pid, jobId);
      return r.body.status === 'completed' ? r.body : null;
    });

    // create a second profile, try to read the first profile's job through it
    const otherPid = await createProfile();
    const res = await app.request(
      `/api/profiles/${otherPid}/import-jobs/${jobId}`,
      { headers: authHeaders() },
    );
    expect(res.status).toBe(404);
  });
});
