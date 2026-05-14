import { describe, it, expect, vi } from 'vitest';
import { parseCandidateArrayOrThrow } from '../src/ai/parser.js';

describe('parseCandidateArrayOrThrow', () => {
  it('returns all items when LLM output is fully valid', () => {
    const raw = JSON.stringify([
      {
        stem: '题 1',
        options: [
          { key: 'A', text: 'a' },
          { key: 'B', text: 'b' },
        ],
        answer: 'A',
        explanation: '',
        tags: [],
        difficulty: 2,
      },
      {
        stem: '题 2',
        options: [
          { key: 'A', text: 'x' },
          { key: 'B', text: 'y' },
        ],
        answer: 'B',
        explanation: '',
        tags: [],
        difficulty: 2,
      },
    ]);
    const out = parseCandidateArrayOrThrow(raw);
    expect(out).toHaveLength(2);
  });

  it('drops malformed item (options < 2) instead of failing the whole array', () => {
    // suppress the console.warn the parser emits on dropped items
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = JSON.stringify([
      {
        stem: '题 1',
        options: [
          { key: 'A', text: 'a' },
          { key: 'B', text: 'b' },
        ],
        answer: 'A',
        explanation: '',
        tags: [],
        difficulty: 2,
      },
      // bad: only 1 option
      {
        stem: '题 2',
        options: [{ key: 'A', text: 'only one' }],
        answer: 'A',
        explanation: '',
        tags: [],
        difficulty: 2,
      },
      {
        stem: '题 3',
        options: [
          { key: 'A', text: 'p' },
          { key: 'B', text: 'q' },
        ],
        answer: 'B',
        explanation: '',
        tags: [],
        difficulty: 2,
      },
    ]);
    const out = parseCandidateArrayOrThrow(raw);
    expect(out).toHaveLength(2);
    expect(out[0].stem).toBe('题 1');
    expect(out[1].stem).toBe('题 3');
    warn.mockRestore();
  });

  it('drops item whose answer is not in its options', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = JSON.stringify([
      {
        stem: 'good',
        options: [
          { key: 'A', text: 'a' },
          { key: 'B', text: 'b' },
        ],
        answer: 'A',
        explanation: '',
        tags: [],
        difficulty: 2,
      },
      {
        stem: 'bad answer not in options',
        options: [
          { key: 'A', text: 'a' },
          { key: 'B', text: 'b' },
        ],
        answer: 'Z',
        explanation: '',
        tags: [],
        difficulty: 2,
      },
    ]);
    const out = parseCandidateArrayOrThrow(raw);
    expect(out).toHaveLength(1);
    expect(out[0].stem).toBe('good');
    warn.mockRestore();
  });

  it('still throws on non-JSON / non-array', () => {
    expect(() => parseCandidateArrayOrThrow('not json at all')).toThrow();
    expect(() => parseCandidateArrayOrThrow('{"not": "array"}')).toThrow();
  });

  it('returns [] for empty array', () => {
    expect(parseCandidateArrayOrThrow('[]')).toEqual([]);
  });

  it('strips markdown fence around JSON', () => {
    const raw = '```json\n[]\n```';
    expect(parseCandidateArrayOrThrow(raw)).toEqual([]);
  });
});
