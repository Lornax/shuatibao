import { describe, it, expect } from 'vitest';
import { chunkPdfText } from '../src/lib/pdf-chunker.js';

describe('chunkPdfText', () => {
  it('returns [] for empty / whitespace-only text', () => {
    expect(chunkPdfText('')).toEqual([]);
    expect(chunkPdfText('   \n\n  ')).toEqual([]);
  });

  it('returns 1 chunk when text is shorter than targetSize', () => {
    const text = '只有一道题。\n1. 这是题干？\nA. 选项A\nB. 选项B\n答案：A\n';
    const chunks = chunkPdfText(text, 3500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits long text without question markers by hard size', () => {
    const text = 'x'.repeat(10000);
    const chunks = chunkPdfText(text, 3500);
    // 10000 / 3500 ≈ 3 chunks, allow 3 or 4
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.length).toBeLessThanOrEqual(4);
    // each chunk should not exceed 1.3 * targetSize
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(Math.ceil(3500 * 1.3));
    }
    // reconstructed text equals original (no chars lost)
    expect(chunks.join('')).toBe(text);
  });

  it('aligns split point to question-number boundary "N." when available', () => {
    // each question ~1450 chars, 4 questions ~5800 chars
    const q = (n: number) =>
      `${n}. 这是第 ${n} 题的题干，` + '内容'.repeat(700) + `\nA. 选项A\nB. 选项B\nC. 选项C\nD. 选项D\n答案：A\n`;
    const text = q(1) + q(2) + q(3) + q(4);
    const chunks = chunkPdfText(text, 2000);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // each chunk (except possibly the first) should start with a question number marker
    // i.e. the split is right before "\n2." / "\n3." etc.
    for (let i = 1; i < chunks.length; i++) {
      // chunk start should be at "N. " (with leading \n consumed by previous chunk's end)
      expect(/^\d{1,3}[\.、)]\s/.test(chunks[i])).toBe(true);
    }
    // reconstruction preserves original text
    expect(chunks.join('')).toBe(text);
  });

  it('aligns to "第 N 题" boundary when present', () => {
    const q = (n: number) => `第 ${n} 题：` + '内容'.repeat(600) + '\n';
    const text = q(1) + q(2) + q(3) + q(4) + q(5);
    const chunks = chunkPdfText(text, 1500);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < chunks.length; i++) {
      expect(/^第\s*\d+\s*[题道节]/.test(chunks[i])).toBe(true);
    }
    expect(chunks.join('')).toBe(text);
  });

  it('falls back to hard split when no boundary in search window', () => {
    // long blob with one boundary far from target — should hard split
    const text = 'a'.repeat(5000) + '\n2. 第二题题干' + 'b'.repeat(100);
    const chunks = chunkPdfText(text, 1500);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.join('')).toBe(text);
  });
});
