/**
 * Split PDF-extracted plain text into LLM-friendly chunks.
 *
 * Aligns cuts to question-number boundaries when possible
 * (e.g. "\n2. ..." or "\n第 2 题：...") so a chunk doesn't break
 * mid-question. Falls back to a hard cut at targetSize if no boundary
 * is in the search window.
 *
 * Concatenating the returned chunks equals the original text — no
 * characters are dropped.
 */

const QNUM_BOUNDARY = /\n(\d{1,3}[\.、)]\s|第\s*\d+\s*[题道节])/g;

export function chunkPdfText(text: string, targetSize = 3500): string[] {
  if (!text.trim()) return [];
  if (text.length <= targetSize) return [text];

  const minSearch = Math.floor(targetSize * 0.7);
  const maxSearch = Math.ceil(targetSize * 1.3);

  const chunks: string[] = [];
  let offset = 0;

  while (offset < text.length) {
    const remaining = text.length - offset;
    if (remaining <= targetSize) {
      chunks.push(text.slice(offset));
      break;
    }

    const windowStart = offset + minSearch;
    const windowEnd = Math.min(offset + maxSearch, text.length);

    let bestCut = -1;
    QNUM_BOUNDARY.lastIndex = windowStart;
    let m: RegExpExecArray | null;
    while ((m = QNUM_BOUNDARY.exec(text)) !== null) {
      if (m.index >= windowEnd) break;
      // match starts at "\n"; cut just after it so next chunk begins with the marker
      bestCut = m.index + 1;
    }

    const cut = bestCut > 0 ? bestCut : offset + targetSize;
    chunks.push(text.slice(offset, cut));
    offset = cut;
  }

  return chunks;
}
