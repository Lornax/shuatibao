import { z } from 'zod';

export const candidateQuestionSchema = z.object({
  stem: z.string().min(1).max(2000),
  options: z
    .array(z.object({ key: z.string().min(1).max(4), text: z.string().min(1).max(500) }))
    .min(2)
    .max(8),
  answer: z.string().max(20).default(''),
  explanation: z.string().max(2000).default(''),
  tags: z.array(z.string().max(30)).max(10).default(['NPDP']),
  difficulty: z.number().int().min(1).max(5).default(2),
});

export type CandidateQuestion = z.infer<typeof candidateQuestionSchema>;

export const candidateArraySchema = z.array(candidateQuestionSchema);

export const errorResponseSchema = z.object({
  error: z.string(),
});

export function parseCandidateOrThrow(raw: string): CandidateQuestion {
  const json = stripMarkdownFence(raw);
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch (e) {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const errCheck = errorResponseSchema.safeParse(obj);
  if (errCheck.success) {
    throw new Error(`AI rejected: ${errCheck.data.error}`);
  }

  const result = candidateQuestionSchema.safeParse(obj);
  if (!result.success) {
    throw new Error(`AI JSON failed schema: ${result.error.message}; raw: ${raw.slice(0, 200)}`);
  }

  const keys = result.data.options.map((o) => o.key);
  if (result.data.answer && !keys.includes(result.data.answer)) {
    throw new Error(`AI answer "${result.data.answer}" not in options ${keys.join(',')}`);
  }

  return result.data;
}

export function parseCandidateArrayOrThrow(raw: string): CandidateQuestion[] {
  const json = stripMarkdownFence(raw);
  let arr: unknown;
  try {
    arr = JSON.parse(json);
  } catch (e) {
    throw new Error(`AI returned invalid JSON array: ${raw.slice(0, 200)}`);
  }
  if (!Array.isArray(arr)) {
    throw new Error(`AI did not return a JSON array; raw: ${raw.slice(0, 200)}`);
  }
  // Per-item validation: drop bad questions instead of failing the whole
  // chunk. A single malformed item (missing option, etc.) used to nuke an
  // entire chunk of ~5 questions, which is why 100-question PDFs ended up
  // losing half their content.
  const out: CandidateQuestion[] = [];
  let droppedCount = 0;
  for (let i = 0; i < arr.length; i++) {
    const result = candidateQuestionSchema.safeParse(arr[i]);
    if (!result.success) {
      droppedCount++;
      console.warn(
        `[parseCandidateArray] dropped item ${i}: ${result.error.message.slice(0, 200)}`,
      );
      continue;
    }
    const q = result.data;
    const keys = q.options.map((o) => o.key);
    if (q.answer && !keys.includes(q.answer)) {
      droppedCount++;
      console.warn(
        `[parseCandidateArray] dropped item ${i}: answer "${q.answer}" not in options ${keys.join(',')}`,
      );
      continue;
    }
    out.push(q);
  }
  if (droppedCount > 0) {
    console.warn(
      `[parseCandidateArray] kept ${out.length} / dropped ${droppedCount} (LLM produced malformed items)`,
    );
  }
  return out;
}

function stripMarkdownFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].trim() : trimmed;
}
