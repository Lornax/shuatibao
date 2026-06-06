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

// 用于"找位置"：宽匹配, 把后面 80 字符吃进来是为了能在文本里准确定位章节起点
const CHAPTER_RE = /(?:^|\n)\s*(第\s*[一二三四五六七八九十百零〇\d]{1,4}\s*章[^\n]{0,80}|Chapter\s+\d+[^\n]{0,80})/g;
// 用于"提取章节号"
const CHAPTER_NUM_RE = /第\s*([一二三四五六七八九十百零〇\d]+)\s*章|Chapter\s+(\d+)/;
// 用于"提取干净标题"：章节号后紧跟的若干字符, 遇数字/英文 / 标点 / 多空格立即停
// 标题正则: 抓 "第 X 章" / "Chapter N" 前缀, 然后允许任意非控制字符直到换行/句号/段落标志.
// 之前限定 CJK + 全角标点过严, 遇到半角空格就断, 导致 "第三章 数据类型" 被截成 "第三章 数".
// 现在允许半角空格 + 数字 + 英文等, 但用 [^\n。．.；;] 排除明显的段落分隔符, 最多 30 字符.
const CHAPTER_TITLE_CLEAN_RE = /^(第\s*[一二三四五六七八九十百零〇\d]{1,4}\s*章|Chapter\s+\d+)[\s:：]*([^\n\r。．；;]{0,30})/;
const CN_DIGITS: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};
const TARGET_CHUNK = 1000;
const MIN_CHUNK = 200;
const ALIGN_WINDOW = 200;

/**
 * Clean a raw chapter match. PDF text frequently has the chapter title bleed
 * into body content (e.g. "第 1 章战略＠一一 SWOT 优势..."). We want just
 * "第 1 章 战略". Strategy: keep "第 N 章" / "Chapter N" + at most ~20 chars
 * of Chinese title following it, stop at first non-CJK character.
 */
function cleanChapterTitle(raw: string): string {
  const m = raw.match(CHAPTER_TITLE_CLEAN_RE);
  if (!m) return raw.trim().slice(0, 30);
  const prefix = m[1].replace(/\s+/g, ' ').trim();
  const titleBody = (m[2] || '').trim();
  return titleBody ? `${prefix} ${titleBody}` : prefix;
}

/**
 * Parse a Chinese chapter number like "一", "十", "十一", "二十三" into int.
 * Fallback null for unknown forms; caller treats null as "can't dedupe".
 */
function parseChapterNumber(title: string): number | null {
  const m = title.match(CHAPTER_NUM_RE);
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  // 中文数字：支持 1-99
  if (raw === '十') return 10;
  if (raw.startsWith('十')) {
    const tail = CN_DIGITS[raw[1]];
    return tail != null ? 10 + tail : null;
  }
  if (raw.includes('十')) {
    const [tensCh, onesCh] = raw.split('十');
    const tens = CN_DIGITS[tensCh];
    const ones = onesCh ? CN_DIGITS[onesCh] ?? 0 : 0;
    if (tens != null) return tens * 10 + ones;
    return null;
  }
  if (CN_DIGITS[raw] != null) return CN_DIGITS[raw];
  return null;
}

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

  // 某些 PDF (尤其图像式 / 异常编码) 提取后字符串夹杂 NUL (0x00) 字节, PostgreSQL text 字段不允许.
  // 一次性 strip 掉, 影响所有下游 (chunk content / chapter title 等).
  // eslint-disable-next-line no-control-regex
  totalText = totalText.replace(/\x00/g, '');

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

  // find all chapter occurrences (includes TOC + page headers + inline refs)
  const allMatches: { offset: number; title: string; num: number | null }[] = [];
  CHAPTER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CHAPTER_RE.exec(totalText)) !== null) {
    const raw = m[1].trim().replace(/\s+/g, ' ');
    const cleanTitle = cleanChapterTitle(raw);
    allMatches.push({ offset: m.index, title: cleanTitle, num: parseChapterNumber(raw) });
  }

  // Dedupe by chapter number: keep the **earliest** occurrence per number
  // that's outside the TOC region. TOC heuristic: TOC usually packs chapter
  // matches close together (< 200 chars apart). Real chapter heads in body
  // are far apart. Use median gap between matches to find a cutoff.
  let chapterMatches: { offset: number; title: string; num: number | null }[] = [];
  const numbered = allMatches.filter((x) => x.num != null);
  if (numbered.length === 0) {
    // no parseable numbers (e.g. fancy chapter titles); fall back to dedupe by title
    const seen = new Set<string>();
    chapterMatches = allMatches.filter((x) => {
      if (seen.has(x.title)) return false;
      seen.add(x.title);
      return true;
    });
  } else {
    // for each chapter number, pick the LAST occurrence — body usually comes
    // after TOC, so the last match for "第 1 章" is most likely the real heading
    // (page headers repeat but for the same number across many pages, the
    // last one is still in or after body)
    const lastByNum = new Map<number, { offset: number; title: string; num: number | null }>();
    for (const x of allMatches) {
      if (x.num == null) continue;
      lastByNum.set(x.num, x);
    }
    chapterMatches = Array.from(lastByNum.values()).sort((a, b) => a.offset - b.offset);
    // Sanity: if still > 50 chapters, the regex is matching garbage. Cap.
    if (chapterMatches.length > 50) {
      console.warn(
        `[textbook-parser] ${chapterMatches.length} chapters detected (>50), likely false positives; truncating to first 50`,
      );
      chapterMatches = chapterMatches.slice(0, 50);
    }
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
