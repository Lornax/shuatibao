import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Textbook } from '../api/client';
import { Box } from '../components/Box';
import { Layout } from '../components/Layout';

const POLL_MS = 2000;

export function TextbookList() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [list, setList] = useState<Textbook[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!pid) return;
    try {
      const r = await api.listTextbooks(pid);
      setList(r.textbooks);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  // poll while any textbook is processing
  useEffect(() => {
    if (!list || list.every((t) => t.status !== 'processing')) return;
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !pid) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) return setError('请选 PDF 文件');
    if (f.size > 50 * 1024 * 1024) return setError('PDF 超过 50MB');
    setError(null);
    setUploading(true);
    try {
      await api.uploadTextbook(pid, f);
      await load();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(tb: Textbook) {
    if (!pid) return;
    if (!window.confirm(`删除教材「${tb.filename}」？AI 将无法再引用它。`)) return;
    try {
      await api.deleteTextbook(pid, tb.id);
      load();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Layout title="教材库" back={() => nav(`/profiles/${pid}`)}>
      <div className="space-y-3">
        <Box variant="dashed" className="p-3 bg-chip-cream">
          <p className="font-cn text-sm font-bold mb-1">📚 教材决定 AI 的精准度</p>
          <p className="font-cn text-xs text-ink-2 leading-relaxed">
            <span className="text-ink">没导入教材</span>：AI 答题、解析、出题都靠通用知识回答，章节 / 页码可能不准，甚至会编造。
            <br />
            <span className="text-ink">导入教材后</span>：AI 优先引用教材原文，解析末尾标注 <span className="font-handBold">[第 X 章·第 Y 页]</span>，让你能直接翻书核对。
          </p>
          <p className="font-cn text-[11px] text-ink-3 mt-2">
            上传 PDF（≤50MB），几百页的教材需要几分钟解析 + 嵌入。
          </p>
        </Box>

        <label className="block">
          <Box
            variant="thick"
            className={`p-4 text-center cursor-pointer ${uploading ? 'opacity-60' : 'hover:bg-chip-cream'}`}
          >
            <p className="font-cn font-bold">📚 上传教材 PDF</p>
            <p className="font-cn text-xs text-ink-3 mt-1">
              {uploading ? '上传中...' : '点这里选 PDF（≤50MB）'}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={onPick}
              disabled={uploading}
              className="hidden"
            />
          </Box>
        </label>

        {error && (
          <Box variant="dashed" className="p-2 border-accent">
            <p className="font-cn text-xs text-accent break-words">{error}</p>
          </Box>
        )}

        {list === null && (
          <p className="font-cn text-sm text-ink-2 text-center mt-3">加载中...</p>
        )}
        {list && list.length === 0 && (
          <Box variant="dashed" className="p-4 text-center">
            <p className="font-cn text-sm text-ink-2">还没有教材，上传一份开始用</p>
          </Box>
        )}

        <div className="space-y-2">
          {list?.map((tb) => (
            <TextbookCard key={tb.id} tb={tb} pid={pid!} onDelete={() => handleDelete(tb)} />
          ))}
        </div>
      </div>
    </Layout>
  );
}

function TextbookCard({
  tb,
  pid,
  onDelete,
}: {
  tb: Textbook;
  pid: string;
  onDelete: () => void;
}) {
  const statusInfo = STATUS_INFO[tb.status];
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [chapters, setChapters] = useState<
    | null
    | {
        chapter: string | null;
        chunkCount: number;
        pageStart: number | null;
        pageEnd: number | null;
      }[]
  >(null);

  async function toggleChapters() {
    if (chaptersOpen) {
      setChaptersOpen(false);
      return;
    }
    setChaptersOpen(true);
    if (chapters === null) {
      try {
        const r = await api.listTextbookChapters(pid, tb.id);
        setChapters(r.chapters);
      } catch {
        setChapters([]);
      }
    }
  }

  return (
    <Box variant="soft" className="p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-cn text-sm flex-1 truncate font-bold">{tb.filename}</p>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full border border-ink text-[10px] font-handBold leading-none ${statusInfo.bg} ml-2 shrink-0`}
        >
          {statusInfo.label}
        </span>
      </div>
      <div className="font-cn text-xs text-ink-2 space-y-0.5">
        <div>
          {tb.fileSize > 0 ? `${(tb.fileSize / 1024 / 1024).toFixed(1)} MB` : '—'}
          {tb.totalPages > 0 && ` · ${tb.totalPages} 页`}
        </div>
        {tb.status === 'ready' && (
          <div>
            🧩 {tb.chunkCount} 段 · 📑 {tb.chapterCount > 0 ? `${tb.chapterCount} 章` : '未识别章节'}
          </div>
        )}
        {tb.status === 'processing' && (
          <div className="text-ink-3">
            正在解析 + 嵌入...（PDF 大概几分钟，关掉页面也会继续）
          </div>
        )}
        {tb.status === 'failed' && tb.error && (
          <div className="text-accent break-words">⚠ {tb.error}</div>
        )}
      </div>

      {tb.status === 'ready' && (
        <div className="mt-2">
          <button
            onClick={toggleChapters}
            className="font-cn text-xs text-ink-2 underline"
          >
            📑 章节明细 {chaptersOpen ? '▴' : '▾'}
          </button>
          {chaptersOpen && (
            <Box variant="dashed" className="p-2 mt-2 bg-paper">
              {chapters === null && (
                <p className="font-cn text-xs text-ink-3">加载中...</p>
              )}
              {chapters && chapters.length === 0 && (
                <p className="font-cn text-xs text-ink-3">没有识别到章节</p>
              )}
              {chapters && chapters.length > 0 && (
                <ul className="space-y-1 font-cn text-xs">
                  {chapters.map((c, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="flex-1 truncate">
                        {c.chapter ?? <span className="text-ink-3 italic">未识别章节</span>}
                      </span>
                      <span className="text-ink-3 text-[11px] shrink-0">
                        {c.chunkCount} 段
                        {c.pageStart != null && ` · 第 ${c.pageStart}${c.pageEnd && c.pageEnd !== c.pageStart ? `-${c.pageEnd}` : ''} 页`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Box>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-2 items-center">
        {tb.cosDownloadUrl && (
          <a
            href={tb.cosDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="font-cn text-xs underline"
          >
            📄 下载原文件
          </a>
        )}
        <button
          onClick={onDelete}
          className="ml-auto font-cn text-xs text-accent underline"
        >
          删除
        </button>
      </div>
    </Box>
  );
}

const STATUS_INFO: Record<Textbook['status'], { label: string; bg: string }> = {
  processing: { label: '处理中', bg: 'bg-chip-cream' },
  ready: { label: '✓ 可用', bg: 'bg-chip-green' },
  failed: { label: '✗ 失败', bg: 'bg-chip-pink' },
};
