import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type CandidateQuestion, type ImportJob } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function ReviewQueue() {
  const { pid, jid } = useParams<{ pid: string; jid: string }>();
  const nav = useNavigate();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [solving, setSolving] = useState<{ done: number; total: number } | null>(null);

  async function load() {
    if (!pid || !jid) return;
    try {
      const j = await api.getImportJob(pid, jid);
      setJob(j);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, jid]);

  async function discard(idx: number) {
    if (!job || !pid || !jid) return;
    if (!window.confirm('确定丢弃这条候选？不入题库。')) return;
    setBusy(true);
    const next = job.candidates.filter((_, i) => i !== idx);
    try {
      await api.patchImportJob(pid, jid, next);
      if (next.length === 0) {
        nav(`/profiles/${pid}`, { replace: true });
      } else {
        // refresh from server to stay in sync
        await load();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function batchSolve() {
    if (!job || !pid || !jid) return;
    const missingIndices = job.candidates
      .map((c, i) => ({ c, i }))
      .filter((x) => !x.c.answer);
    if (missingIndices.length === 0) return;

    setSolving({ done: 0, total: missingIndices.length });
    setBusy(true);
    let working = [...job.candidates];
    let doneCount = 0;
    try {
      for (const { c, i } of missingIndices) {
        const opts = c.options.filter((o) => o.text);
        if (opts.length < 2) {
          doneCount++;
          setSolving({ done: doneCount, total: missingIndices.length });
          continue;
        }
        const r = await api.solveCandidate(c.stem, opts);
        working = working.map((cand, idx) =>
          idx === i ? { ...cand, answer: r.answer, explanation: cand.explanation || r.explanation } : cand,
        );
        const updated = await api.patchImportJob(pid, jid, working);
        setJob(updated);
        working = updated.candidates;
        doneCount++;
        setSolving({ done: doneCount, total: missingIndices.length });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSolving(null);
      setBusy(false);
    }
  }

  if (!job) {
    return (
      <Layout title="待审队列" back={() => nav(`/profiles/${pid}`)}>
        <Box variant="dashed" className="p-3">
          <p className="font-cn text-sm text-ink-2">{error ?? '加载中...'}</p>
        </Box>
      </Layout>
    );
  }

  const missingCount = job.candidates.filter((c) => !c.answer).length;
  const allDone = job.candidates.length === 0;

  return (
    <Layout title={`待审 ${job.candidates.length}`} back={() => nav(`/profiles/${pid}`)}>
      <div className="space-y-3">
        <Box variant="soft" className="p-2 bg-chip-cream flex items-center gap-2">
          <span className="border border-ink rounded px-1.5 py-0.5 text-[10px] font-handBold leading-none bg-white">
            PDF
          </span>
          <p className="font-cn text-xs flex-1 truncate">{job.filename}</p>
        </Box>

        {allDone && (
          <Box variant="thick" className="p-4 bg-chip-green text-center">
            <p className="font-handBold text-base mb-2">🎉 全部审完啦</p>
            <p className="font-cn text-xs text-ink-2 mb-3">这次导入已全部入库或丢弃。</p>
            <Button variant="primary" onClick={() => nav(`/profiles/${pid}`)} className="w-full justify-center">
              回档案
            </Button>
          </Box>
        )}

        {!allDone && missingCount > 0 && (
          <Box variant="thick" className="p-3 bg-chip-cream">
            <p className="font-handBold text-sm mb-1">⚠ 有 {missingCount} 道缺答案</p>
            <p className="font-cn text-xs text-ink-2 mb-2">
              可以一键让 AI 批量解答。已解的题会自动保存，关掉页面回来可以接着审。
            </p>
            {solving ? (
              <Box variant="dashed" className="p-2 bg-white">
                <p className="font-cn text-xs">
                  🤖 AI 批量解答中 · {solving.done} / {solving.total}
                </p>
              </Box>
            ) : (
              <Button variant="primary" onClick={batchSolve} disabled={busy} className="w-full justify-center">
                🤖 一键 AI 全部解答（{missingCount} 道）
              </Button>
            )}
          </Box>
        )}

        {!allDone && (
          <p className="font-cn text-xs text-ink-2 px-1">
            点任一条进入编辑 + 入库。审完一条会自动从列表移除。
          </p>
        )}

        <div className="space-y-2">
          {job.candidates.map((c, i) => (
            <CandidateRow
              key={i}
              idx={i}
              candidate={c}
              pid={pid!}
              jid={jid!}
              onDiscard={() => discard(i)}
              disabled={busy}
            />
          ))}
        </div>

        {error && (
          <Box variant="dashed" className="p-2 border-accent">
            <p className="font-cn text-xs text-accent break-words">{error}</p>
          </Box>
        )}
      </div>
    </Layout>
  );
}

function CandidateRow({
  idx,
  candidate,
  pid,
  jid,
  onDiscard,
  disabled,
}: {
  idx: number;
  candidate: CandidateQuestion;
  pid: string;
  jid: string;
  onDiscard: () => void;
  disabled: boolean;
}) {
  const missingAnswer = !candidate.answer;
  return (
    <Box variant="soft" className="p-3">
      <div className="flex items-start gap-2">
        <span className="font-handBold text-xs text-ink-3 mt-0.5 w-5 shrink-0">{idx + 1}.</span>
        <Link to={`/profiles/${pid}/import-jobs/${jid}/review/${idx}`} className="flex-1 min-w-0">
          <p className="font-cn text-sm leading-relaxed line-clamp-2 break-words">
            {candidate.stem}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {missingAnswer ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-accent text-accent text-[10px] font-handBold leading-none bg-white">
                缺答案
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-ink text-ink text-[10px] font-handBold leading-none bg-chip-green">
                ✓ 答案 {candidate.answer}
              </span>
            )}
            <span className="font-cn text-[11px] text-ink-3">
              难度 {'★'.repeat(candidate.difficulty)}
            </span>
          </div>
        </Link>
        <button
          onClick={onDiscard}
          disabled={disabled}
          className="font-cn text-xs text-ink-3 underline shrink-0 disabled:opacity-40"
        >
          丢弃
        </button>
      </div>
    </Box>
  );
}
