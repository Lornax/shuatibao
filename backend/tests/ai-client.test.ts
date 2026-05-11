import { describe, it, expect } from 'vitest';
import { embed, cosineSimilarity, generateQuestionFromPrompt } from '../src/ai/client.js';

const skip = !process.env.DASHSCOPE_API_KEY || process.env.SKIP_AI_TESTS === '1';

describe.skipIf(skip)('AI client smoke (calls real dashscope)', () => {
  it('embed returns >= 1024-dim vector', async () => {
    const r = await embed(['你好世界']);
    expect(r).toHaveLength(1);
    expect(r[0].length).toBeGreaterThanOrEqual(1024);
  }, 30000);

  it('cosineSimilarity finds similar texts high', async () => {
    const r = await embed(['产品生命周期分为几个阶段', '产品生命周期分几阶段']);
    const sim = cosineSimilarity(r[0], r[1]);
    expect(sim).toBeGreaterThan(0.85);
  }, 30000);

  it('cosineSimilarity finds unrelated low', async () => {
    const r = await embed(['产品生命周期', '今天天气真好']);
    const sim = cosineSimilarity(r[0], r[1]);
    expect(sim).toBeLessThan(0.6);
  }, 30000);

  it('generateQuestionFromPrompt returns valid CandidateQuestion', async () => {
    const q = await generateQuestionFromPrompt('产品生命周期的成熟期特征', 2);
    expect(q.stem).toBeTruthy();
    expect(q.options.length).toBeGreaterThanOrEqual(3);
    expect(q.options.map((o) => o.key)).toContain(q.answer);
    expect(Array.isArray(q.tags)).toBe(true);
  }, 60000);
});
