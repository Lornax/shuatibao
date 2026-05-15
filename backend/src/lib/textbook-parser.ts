// @ts-expect-error pdf-parse has no types
import pdfParse from 'pdf-parse';

/**
 * Parse a textbook PDF into per-chapter chunks for RAG.
 *
 * Approach:
 *   1. Hook pdf-parse's `pagerender` to collect per-page text + remember
 *      the byte offset where each page starts in the concatenated text.
 *      This lets us recover `(page_start, page_end)` for any chunk.
 *   2. Find chapter headings via regex (both Chinese 「第N章」 and English).
 *   3. Within each chapter (or whole text if no chapters detected), slide
 *      a ~1000-char window with line-break alignment.
 */

export type TextbookChunk = {
  chapter: string | null;
  pageStart: number;
  pageEnd: number;
  content: string;
};

const CHAPTER_RE = /(?:^|\n)\s*(第\s*[一二三四五六七八九十百零〇\d]{1,4}\s*章[^\n]{0,80}|Chapter\s+\d+[^\n]{0,80})/g;
const TARGET_CHUNK = 1000;
const MIN_CHUNK = 200;
const ALIGN_WINDOW = 200;

export async function parseTextbook(
  buf: Buffer,
): Promise<{ totalPages: number; chunks: TextbookChunk[] }> {
  const pageOffsets: number[] = []; // pageOffsets[i] = char offset where page i+1 starts
  let totalText = '';

  const pagerender = async (pageData: any) => {
    const textContent = await pageData.getTextContent({ normalizeWhitespace: false });
    const pageText =
      textContent.items.map((it: { str: string }) => it.str).join(' ') + '\n';
    pageOffsets.push(totalText.length);
    totalText += pageText;
    return pageText;
  };

  const result = await pdfParse(buf, { pagerender });
  const totalPages = result.numpages ?? pageOffsets.length;

  if (totalText.trim().length < 100) {
    return { totalPages, chunks: [] };
  }

  // char offset → 1-indexed page number (binary search)
  const offsetToPage = (offset: number): number => {
    let lo = 0;
    let hi = pageOffsets.length - 1;
    let ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (pageOffsets[mid] <= offset) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans + 1;
  };

  // find chapter boundaries
  const chapterMatches: { offset: number; title: string }[] = [];
  CHAPTER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CHAPTER_RE.exec(totalText)) !== null) {
    const title = m[1].trim().replace(/\s+/g, ' ').slice(0, 100);
    chapterMatches.push({ offset: m.index, title });
  }

  type Section = { chapter: string | null; start: number; end: number };
  const sections: Section[] =
    chapterMatches.length > 0
      ? chapterMatches.map((c, i) => ({
          chapter: c.title,
          start: c.offset,
          end: chapterMatches[i + 1]?.offset ?? totalText.length,
        }))
      : [{ chapter: null, start: 0, end: totalText.length }];

  const chunks: TextbookChunk[] = [];
  for (const sec of sections) {
    let pos = sec.start;
    while (pos < sec.end) {
      const target = Math.min(pos + TARGET_CHUNK, sec.end);
      let cut = target;
      if (target < sec.end) {
        const probeStart = Math.max(target - ALIGN_WINDOW, pos);
        const probeEnd = Math.min(target + ALIGN_WINDOW, sec.end);
        const window = totalText.slice(probeStart, probeEnd);
        // prefer line break nearest to target
        const idx = window.lastIndexOf('\n');
        if (idx >= 0) {
          cut = probeStart + idx + 1;
        }
      }
      cut = Math.max(cut, pos + MIN_CHUNK);
      cut = Math.min(cut, sec.end);
      const content = totalText.slice(pos, cut).trim();
      if (content.length >= MIN_CHUNK / 2) {
        chunks.push({
          chapter: sec.chapter,
          pageStart: offsetToPage(pos),
          pageEnd: offsetToPage(Math.max(cut - 1, pos)),
          content,
        });
      }
      pos = cut;
    }
  }

  return { totalPages, chunks };
}
