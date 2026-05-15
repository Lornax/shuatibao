import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ImportJob } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

const POLL_MS = 1500;

export function ImportJobProgress() {
  const { pid, jid } = useParams<{ pid: string; jid: string }>();
  const nav = useNavigate();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!pid || !jid) return;
    let cancelled = false;
    let terminal = false;

    async function tick() {
      try {
        const j = await api.getImportJob(pid!, jid!);
        if (cancelled) return;
        setJob(j);
        setPollError(null);
        if (j.status === 'completed' || j.status === 'failed') {
          terminal = true;
        }
      } catch (e) {
        if (!cancelled) setPollError(String(e));
      }
    }

    tick();
    const id = window.setInterval(() => {
      if (!terminal) tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pid, jid]);

  async function handleCancel() {
    if (!pid || !jid || !job) return;
    if (!window.confirm('确定取消这次导入吗？已识别的题仍可用。')) return;
    setCancelling(true);
    try {
      await api.deleteImportJob(pid, jid);
      // worker will flip to failed(cancelled) on its next chunk boundary —
      // stay on this page; polling will pick up the new status
    } catch (e) {
      setPollError(String(e));
    } finally {
      setCancelling(false);
    }
  }

  if (!job) {
    return (
      <Layout title="PDF 解析中" back={() => nav(`/profiles/${pid}`)}>
        <Box variant="dashed" className="p-3">
          <p className="font-cn text-sm text-ink-2">{pollError ?? '加载导入任务...'}</p>
        </Box>
      </Layout>
    );
  }

  const pct = job.totalChunks > 0 ? Math.round((job.doneChunks / job.totalChunks) * 100) : 0;
  const titleByStatus: Record<typeof job.status, string> = {
    pending: 'PDF 解析中',
    running: 'PDF 解析中',
    completed: 'PDF 解析完成',
    failed: job.error === 'cancelled' ? 'PDF 解析已取消' : 'PDF 解析失败',
  };
  const isTerminal = job.status === 'completed' || job.status === 'failed';
  const eta = computeEtaText(job);

  return (
    <Layout title={titleByStatus[job.status]} back={() => nav(`/profiles/${pid}`)}>
      <div className="space-y-3">
        <Box variant="soft" className="p-3 flex items-center gap-2 bg-chip-cream">
          <span className="border border-ink rounded px-1.5 py-0.5 text-[10px] font-handBold leading-none bg-white">
            PDF
          </span>
          <p className="font-cn text-sm flex-1 truncate">{job.filename}</p>
          {job.cosDownloadUrl && (
            <a
              href={job.cosDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="font-cn text-xs underline shrink-0"
            >
              📄 下载原文件
            </a>
          )}
        </Box>

        <Box variant="thick" className="p-3">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-cn text-sm">已完成批次</span>
            <span className="font-handBold text-sm">
              {job.doneChunks} / {job.totalChunks}
              {job.status === 'completed' ? ' ✓' : job.status === 'failed' ? ' ✗' : ''}
            </span>
          </div>
          {!isTerminal && (
            <p className="font-cn text-xs text-ink-3 mb-2">
              PDF 已切成 {job.totalChunks} 个批次分别解析{eta ? ` · 预计还需 ${eta}` : ''}
            </p>
          )}
          <ProgressBar pct={pct} status={job.status} />
          <ChunkGrid total={job.totalChunks} done={job.doneChunks} status={job.status} />
        </Box>

        <div className="grid grid-cols-3 gap-2">
          <StatCard num={job.doneChunks} label="已完成批次" tone={job.status === 'completed' ? 'green' : 'plain'} />
          <StatCard
            num={Math.max(0, job.totalChunks - job.doneChunks)}
            label={isTerminal ? '剩余批次' : '待处理批次'}
          />
          <StatCard num={job.candidates.length} label="已识别题" tone="accent" />
        </div>

        {job.status === 'failed' && job.error && job.error !== 'cancelled' && (
          <Box variant="dashed" className="p-3 border-accent bg-[rgba(217,74,58,0.06)]">
            <p className="font-handBold text-sm text-accent mb-1">⚠ AI 调用失败</p>
            <p className="font-cn text-xs text-ink-2 break-words">{job.error}</p>
          </Box>
        )}

        {!isTerminal && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-sm text-ink-2">
              🧠 AI 正在结构化第 {Math.min(job.doneChunks + 1, job.totalChunks)} 批
              <ThinkingDots />
            </p>
          </Box>
        )}

        {job.status === 'completed' && (
          <Button
            variant="accent"
            className="w-full justify-center"
            onClick={() => nav(`/profiles/${pid}/import-jobs/${jid}/review`, { replace: true })}
          >
            开始审核 {job.candidates.length} 道题 →
          </Button>
        )}

        {job.status === 'failed' && job.candidates.length > 0 && (
          <Button
            variant="accent"
            className="w-full justify-center"
            onClick={() => nav(`/profiles/${pid}/import-jobs/${jid}/review`, { replace: true })}
          >
            用现有 {job.candidates.length} 题 →
          </Button>
        )}

        {job.status === 'failed' && (
          <Button
            variant="default"
            className="w-full justify-center"
            onClick={() => nav(`/profiles/${pid}/questions/from-pdf`, { replace: true })}
          >
            重传整本 PDF
          </Button>
        )}

        {!isTerminal && (
          <>
            <Button
              variant="ghost"
              className="w-full justify-center"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? '正在取消...' : '取消导入'}
            </Button>
            <Box variant="dashed" className="p-2">
              <p className="font-cn text-xs text-ink-3">
                可以关掉这个页面去做别的，回来在档案页能找到这次导入。取消会在当前批次跑完后立即生效。
              </p>
            </Box>
          </>
        )}

        {pollError && !isTerminal && (
          <Box variant="dashed" className="p-2 border-accent">
            <p className="font-cn text-xs text-accent">轮询出错：{pollError}</p>
          </Box>
        )}
      </div>
    </Layout>
  );
}

function computeEtaText(job: ImportJob): string | null {
  if (job.status !== 'running' && job.status !== 'pending') return null;
  if (!job.startedAt || job.doneChunks <= 0) return null;
  const elapsed = Date.now() - new Date(job.startedAt).getTime();
  const perChunk = elapsed / job.doneChunks;
  const remaining = perChunk * Math.max(0, job.totalChunks - job.doneChunks);
  if (remaining <= 0) return null;
  const secs = Math.round(remaining / 1000);
  if (secs < 60) return `${secs} 秒`;
  const mins = Math.floor(secs / 60);
  const rsecs = secs % 60;
  return rsecs === 0 ? `${mins} 分` : `${mins} 分 ${rsecs} 秒`;
}

function ProgressBar({ pct, status }: { pct: number; status: ImportJob['status'] }) {
  const fillColor =
    status === 'completed' ? '#d4e8d0' : status === 'failed' ? '#f4d4d0' : '#f4c542';
  return (
    <div className="relative h-5 border-2 border-ink rounded-md bg-white overflow-hidden">
      <div
        className="h-full border-r-2 border-ink transition-all"
        style={{ width: `${pct}%`, background: fillColor }}
      />
      <div className="absolute inset-0 flex items-center justify-center font-handBold text-xs">
        {status === 'completed' ? '完成' : status === 'failed' ? '已结束' : `${pct}%`}
      </div>
    </div>
  );
}

function ChunkGrid({
  total,
  done,
  status,
}: {
  total: number;
  done: number;
  status: ImportJob['status'];
}) {
  if (total <= 1) return null;
  const cells = Array.from({ length: total }, (_, i) => i);
  return (
    <div className="grid grid-cols-10 gap-1 mt-3">
      {cells.map((i) => {
        let cls = 'bg-white';
        if (i < done) cls = 'bg-chip-green';
        else if (i === done && status === 'running') cls = 'bg-accent-2 animate-pulse';
        else if (i >= done && status === 'failed') cls = i === done ? 'bg-chip-pink' : 'bg-white';
        return <div key={i} className={`aspect-square border border-ink rounded-sm ${cls}`} />;
      })}
    </div>
  );
}

function StatCard({
  num,
  label,
  tone = 'plain',
}: {
  num: number;
  label: string;
  tone?: 'plain' | 'green' | 'accent';
}) {
  const bg = tone === 'green' ? 'bg-chip-green' : 'bg-white';
  const numColor = tone === 'accent' ? 'text-accent-4' : 'text-ink';
  return (
    <div className={`border border-ink rounded-thick p-2 ${bg}`}>
      <div className={`font-handBold text-2xl leading-none ${numColor}`}>{num}</div>
      <div className="text-[11px] text-ink-3 mt-1">{label}</div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-block ml-1">
      <span className="inline-block w-1 h-1 rounded-full bg-ink-2 mx-0.5 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="inline-block w-1 h-1 rounded-full bg-ink-2 mx-0.5 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="inline-block w-1 h-1 rounded-full bg-ink-2 mx-0.5 animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}
