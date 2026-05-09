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
  similarity: number;
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

  listQuestions: (pid: string) => request<Question[]>(`/profiles/${pid}/questions`),
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

  parsePrompt: (pid: string, knowledge: string, difficulty: number) =>
    request<{ candidate: CandidateQuestion; source: 'ai_gen' }>(
      `/profiles/${pid}/parse/prompt`,
      { method: 'POST', body: JSON.stringify({ knowledge, difficulty }) },
    ),

  solveCandidate: (stem: string, options: { key: string; text: string }[]) =>
    request<{ answer: string; explanation: string }>(
      `/solve-candidate`,
      { method: 'POST', body: JSON.stringify({ stem, options }) },
    ),

  nextQuiz: (pid: string) => request<Question | { done: true }>(`/profiles/${pid}/quiz/next`),
  submitAttempt: (qid: string, input: { chosen: string; timeSpentMs?: number }) =>
    request<{
      attempt: { id: string; isCorrect: boolean; chosen: string };
      correctAnswer: string;
      explanation: string | null;
    }>(`/questions/${qid}/attempts`, { method: 'POST', body: JSON.stringify(input) }),

  wrongbook: (pid: string) => request<WrongItem[]>(`/profiles/${pid}/wrongbook`),
};
