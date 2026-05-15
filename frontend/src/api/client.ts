const TOKEN = import.meta.env.VITE_API_TOKEN as string;

if (!TOKEN) {
  throw new Error('VITE_API_TOKEN missing in frontend/.env.local');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`api ${path} ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Profile = {
  id: string;
  examName: string;
  target: string | null;
  examDate: string | null;
  dailyMinutes: number;
  status: 'active' | 'archived' | 'given_up';
  createdAt: string;
};

export type QuestionSource = 'photo' | 'manual' | 'pdf' | 'ai_gen';

export type Question = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
  tags: string[];
  difficulty: number;
  source: QuestionSource;
  createdAt: string;
  attemptTotal?: number;
  attemptCorrect?: number;
  accuracy?: number | null;
};

export type CandidateQuestion = {
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string;
  tags: string[];
  difficulty: number;
};

export type SimilarQuestion = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
  similarity: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type ImportJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ImportJobSummary = {
  id: string;
  status: ImportJobStatus;
  kind: string;
  filename: string;
  totalChunks: number;
  doneChunks: number;
  candidatesCount: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type ImportJob = ImportJobSummary & {
  candidates: CandidateQuestion[];
};

export type WrongItem = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
  last_chosen: string;
  last_attempted_at: string;
  wrong_count: number;
};

export const api = {
  listProfiles: () => request<Profile[]>('/profiles'),
  createProfile: (input: { examName: string; target?: string; examDate?: string; dailyMinutes?: number }) =>
    request<Profile>('/profiles', { method: 'POST', body: JSON.stringify(input) }),
  getProfile: (id: string) => request<Profile>(`/profiles/${id}`),
  patchProfile: (
    id: string,
    input: Partial<{ examName: string; target: string | null; examDate: string | null; dailyMinutes: number }>,
  ) => request<Profile>(`/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteProfile: (id: string) => request<{ ok: true }>(`/profiles/${id}`, { method: 'DELETE' }),
  getQuestion: (id: string) => request<Question>(`/questions/${id}`),

  listQuestions: (pid: string) => request<Question[]>(`/profiles/${pid}/questions`),

  listQuestionsPaged: (pid: string, opts: { limit: number; offset?: number }) =>
    request<{ rows: Question[]; total: number }>(
      `/profiles/${pid}/questions?limit=${opts.limit}&offset=${opts.offset ?? 0}`,
    ),
  createQuestion: (
    pid: string,
    input: {
      stem: string;
      options: { key: string; text: string }[];
      answer: string;
      explanation?: string;
      tags?: string[];
      difficulty?: number;
      source?: QuestionSource;
      sourceMeta?: Record<string, unknown>;
    },
  ) => request<{ question: Question; similar: SimilarQuestion[] }>(`/profiles/${pid}/questions`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),

  parseImage: (pid: string, file: File) => {
    const fd = new FormData();
    fd.set('image', file);
    return fetch(`/api/profiles/${pid}/parse/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: fd,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`parseImage ${res.status}: ${await res.text()}`);
      return res.json() as Promise<{ candidate: CandidateQuestion; source: 'photo' }>;
    });
  },

  parsePdf: (pid: string, file: File) => {
    const fd = new FormData();
    fd.set('pdf', file);
    return fetch(`/api/profiles/${pid}/parse/pdf`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: fd,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`parsePdf ${res.status}: ${await res.text()}`);
      return res.json() as Promise<{ candidates: CandidateQuestion[]; source: 'pdf'; count: number }>;
    });
  },

  createPdfImportJob: (pid: string, file: File) => {
    const fd = new FormData();
    fd.set('pdf', file);
    return fetch(`/api/profiles/${pid}/import-jobs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: fd,
    }).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (res.status === 201) return { ok: true as const, jobId: body.jobId as string, totalChunks: body.totalChunks as number };
      if (res.status === 409) return { ok: false as const, conflict: true as const, existingJobId: body.jobId as string };
      throw new Error(`createPdfImportJob ${res.status}: ${JSON.stringify(body)}`);
    });
  },

  getImportJob: (pid: string, jid: string) =>
    request<ImportJob>(`/profiles/${pid}/import-jobs/${jid}`),

  listImportJobs: (pid: string, statuses?: ImportJobStatus[]) =>
    request<{ jobs: ImportJobSummary[] }>(
      `/profiles/${pid}/import-jobs${statuses ? `?status=${statuses.join(',')}` : ''}`,
    ),

  patchImportJob: (pid: string, jid: string, candidates: CandidateQuestion[]) =>
    request<ImportJob>(`/profiles/${pid}/import-jobs/${jid}`, {
      method: 'PATCH',
      body: JSON.stringify({ candidates }),
    }),

  deleteImportJob: (pid: string, jid: string) =>
    request<{ ok: boolean; signaled?: boolean; deleted?: boolean }>(
      `/profiles/${pid}/import-jobs/${jid}`,
      { method: 'DELETE' },
    ),

  parsePrompt: (
    pid: string,
    input: { knowledge: string; difficulty: number; chapter?: string; topics?: string },
  ) =>
    request<{ candidate: CandidateQuestion; source: 'ai_gen' }>(
      `/profiles/${pid}/parse/prompt`,
      { method: 'POST', body: JSON.stringify(input) },
    ),

  listTags: (pid: string) => request<{ tag: string; cnt: number }[]>(`/profiles/${pid}/tags`),

  solveCandidate: (stem: string, options: { key: string; text: string }[]) =>
    request<{ answer: string; explanation: string }>(
      `/solve-candidate`,
      { method: 'POST', body: JSON.stringify({ stem, options }) },
    ),

  solveQuestionById: (qid: string) =>
    request<{ answer: string; explanation: string }>(
      `/questions/${qid}/solve`,
      { method: 'POST' },
    ),

  listChatMessages: (qid: string) =>
    request<{ messages: ChatMessage[] }>(`/questions/${qid}/chat`),

  postChatMessage: (qid: string, content: string) =>
    request<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
      `/questions/${qid}/chat`,
      { method: 'POST', body: JSON.stringify({ content }) },
    ),

  clearChatMessages: (qid: string) =>
    request<{ ok: true }>(`/questions/${qid}/chat`, { method: 'DELETE' }),

  nextQuiz: (pid: string, opts: { wrongOnly?: boolean } = {}) =>
    request<Question | { done: true }>(
      `/profiles/${pid}/quiz/next${opts.wrongOnly ? '?wrong_only=true' : ''}`,
    ),
  submitAttempt: (qid: string, input: { chosen: string; timeSpentMs?: number }) =>
    request<{
      attempt: { id: string; isCorrect: boolean; chosen: string };
      correctAnswer: string;
      explanation: string | null;
    }>(`/questions/${qid}/attempts`, { method: 'POST', body: JSON.stringify(input) }),

  wrongbook: (pid: string) => request<WrongItem[]>(`/profiles/${pid}/wrongbook`),

  deleteQuestion: (id: string) => request<{ ok: true }>(`/questions/${id}`, { method: 'DELETE' }),

  patchQuestion: (
    id: string,
    input: Partial<{
      stem: string;
      options: { key: string; text: string }[];
      answer: string;
      explanation: string | null;
      tags: string[];
      difficulty: number;
    }>,
  ) => request<Question>(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
};
