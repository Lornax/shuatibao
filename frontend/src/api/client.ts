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

export type Question = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
  tags: string[];
  difficulty: number;
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
    },
  ) => request<Question>(`/profiles/${pid}/questions`, { method: 'POST', body: JSON.stringify(input) }),

  nextQuiz: (pid: string) => request<Question | { done: true }>(`/profiles/${pid}/quiz/next`),
  submitAttempt: (qid: string, input: { chosen: string; timeSpentMs?: number }) =>
    request<{
      attempt: { id: string; isCorrect: boolean; chosen: string };
      correctAnswer: string;
      explanation: string | null;
    }>(`/questions/${qid}/attempts`, { method: 'POST', body: JSON.stringify(input) }),

  wrongbook: (pid: string) => request<WrongItem[]>(`/profiles/${pid}/wrongbook`),
};
