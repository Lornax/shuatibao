import OpenAI from 'openai';
import { config } from '../config.js';
import {
  VISION_RECOGNIZE_PROMPT,
  PROMPT_GEN_PROMPT,
  PDF_STRUCTURE_PROMPT,
  SOLVE_PROMPT,
} from './prompts.js';
import {
  parseCandidateOrThrow,
  parseCandidateArrayOrThrow,
  type CandidateQuestion,
} from './parser.js';

const client = new OpenAI({
  apiKey: config.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const MODEL_VISION = 'qwen-vl-max';
const MODEL_TEXT = 'qwen-max';
const MODEL_EMBEDDING = 'text-embedding-v3';

export async function recognizeQuestionFromImage(imageBase64DataUrl: string): Promise<CandidateQuestion> {
  const r = await client.chat.completions.create({
    model: MODEL_VISION,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_RECOGNIZE_PROMPT },
          { type: 'image_url', image_url: { url: imageBase64DataUrl } },
        ],
      },
    ],
    temperature: 0.1,
  });
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateOrThrow(typeof raw === 'string' ? raw : '');
}

export async function generateQuestionFromPrompt(
  knowledge: string,
  difficulty = 2,
  chapter?: string,
  topics?: string,
): Promise<CandidateQuestion> {
  const userMsg = [
    `知识点：${knowledge}`,
    chapter ? `教材章节：${chapter}` : '',
    topics ? `考点关键词：${topics}` : '',
    `难度：${difficulty}`,
  ].filter(Boolean).join('\n');
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: PROMPT_GEN_PROMPT },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.7,
  });
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateOrThrow(raw);
}

export async function structureQuestionsFromPdfText(pdfText: string): Promise<CandidateQuestion[]> {
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: PDF_STRUCTURE_PROMPT },
      { role: 'user', content: pdfText },
    ],
    temperature: 0.1,
  });
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateArrayOrThrow(raw);
}

export async function solveQuestion(
  stem: string,
  options: { key: string; text: string }[],
): Promise<{ answer: string; explanation: string }> {
  const optionsStr = options.map((o) => `${o.key}. ${o.text}`).join('\n');
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      {
        role: 'system',
        content: SOLVE_PROMPT.replace('{stem}', stem).replace('{options}', optionsStr),
      },
    ],
    temperature: 0.3,
  });
  const raw = (r.choices[0]?.message?.content ?? '').trim();
  const json = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '');
  let obj: any;
  try {
    obj = JSON.parse(json);
  } catch (e) {
    throw new Error(`solveQuestion bad JSON: ${raw.slice(0, 200)}`);
  }
  if (typeof obj.answer !== 'string' || typeof obj.explanation !== 'string') {
    throw new Error(`solveQuestion bad shape: ${raw.slice(0, 200)}`);
  }
  if (!options.find((o) => o.key === obj.answer)) {
    throw new Error(`solveQuestion answer "${obj.answer}" not in options`);
  }
  return obj;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const r = await client.embeddings.create({
    model: MODEL_EMBEDDING,
    input: texts,
  });
  return r.data.map((d) => d.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('vector length mismatch');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
