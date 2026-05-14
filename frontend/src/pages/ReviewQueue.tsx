import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type CandidateQuestion, type ImportJob } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

type BatchProgress = { mode: 'solve' | 'approve'; done: number; total: number };

export function ReviewQueue() {
  const { pid, jid } = useParams<{ pid: string; jid: string }>();
  const nav = useNavigate();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<BatchProgress | null>(null);

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
        await load();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function approveOne(idx: number) {
    if (!job || !pid || !jid) return;
    const c = job.candidates[idx];
    if (!c.answer) return;
    setBusy(true);
    try {
      await api.createQuestion(pid, {
        stem: c.stem,
        options: c.options,
        answer: c.answer,
        explanation: c.explanation || undefined,
        tags: c.tags,
        difficulty: c.difficulty,
        source: 'pdf',
      });
      const next = job.candidates.filter((_, i) => i !== idx);
      await api.patchImportJob(pid, jid, next);
      if (next.length === 0) {
        nav(`/profiles/${pid}`, { replace: true });
      } else {
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

    setBatch({ mode: 'solve', done: 0, total: missingIndices.length });
    setBusy(true);
    let working = [...job.candidates];
    let doneCount = 0;
    try {
      for (const { c, i } of missingIndices) {
        const opts = c.options.filter((o) => o.text);
        if (opts.length < 2) {
          doneCount++;
          setBatch({ mode: 'solve', done: doneCount, total: missingIndices.length });
          continue;
        }
        const r = await api.solveCandidate(c.stem, opts);
        working = working.map((cand, idx) =>
          idx === i
            ? { ...cand, answer: r.answer, explanation: cand.explanation || r.explanation }
            : cand,
        );
        const updated = await api.patchImportJob(pid, jid, working);
        setJob(updated);
        working = updated.candidates;
        doneCount++;
        setBatch({ mode: 'solve', done: doneCount, total: missingIndices.length });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBatch(null);
      setBusy(false);
    }
  }

  async function approveAll() {
    if (!job || !pid || !jid) return;
    const withAnswer = job.candidates.map((c, i) => ({ c, i })).filter((x) => x.c.answer);
    const withoutCount = job.candidates.length - withAnswer.length;
    if (withAnswer.length === 0) {
      window.alert('没有可一键入库的题——所有题都缺答案，请先「一键 AI 全部解答」或单独点开补答案。');
      return;
    }
    const msg = withoutCount > 0
      ? `将一键入库 ${withAnswer.length} 道有答案的题（相似题都保留，可在题库管理里清理）。\n\n缺答案的 ${withoutCount} 道会留在队列里，不入库。`
      : `将一键入库全部 ${withAnswer.length} 道题（相似题都保留，可在题库管理里清理）。`;
    if (!window.confirm(msg)) return;

    setBatch({ mode: 'approve', done: 0, total: withAnswer.length });
    setBusy(true);
    const succeededIdxs = new Set<number>();
    try {
      for (const { c, i } of withAnswer) {
        try {
          await api.createQuestion(pid, {
            stem: c.stem,
            options: c.options,
            answer: c.answer,
            explanation: c.explanation || undefined,
            tags: c.tags,
            difficulty: c.difficulty,
            source: 'pdf',
          });
          succeededIdxs.add(i);
        } catch {
          // skip failures, continue rest
        }
        setBatch((b) => (b ? { ...b, done: b.done + 1 } : null));
      }
      const next = job.candidates.filter((_, i) => !succeededIdxs.has(i));
      await api.patchImportJob(pid, jid, next);
      if (next.length === 0) {
        nav(`/profiles/${pid}`, { replace: true });
      } else {
        await load();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBatch(null);
      setBusy(false);
    }
  }

  async function discardAll() {
    if (!job || !pid || !jid) return;
    if (!window.confirm(`确认丢弃全部 ${job.candidates.length} 道？不可撤销。`)) return;
    setBusy(true);
    try {
      await api.patchImportJob(pid, jid, []);
      nav(`/profiles/${pid}`, { replace: true });
    } catch (e) {
      setError(String(e));
    } finally {
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
  const withAnswerCount = job.candidates.length - missingCount;
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
              一键让 AI 批量解答。已解的题会自动保存，关掉页面回来可以接着审。
            </p>
            {batch?.mode === 'solve' ? (
              <Box variant="dashed" className="p-2 bg-white">
                <p className="font-cn text-xs">
                  🤖 AI 批量解答中 · {batch.done} / {batch.total}
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
          <Box variant="thick" className="p-3">
            <p className="font-handBold text-sm mb-2">批量动作</p>
            {batch?.mode === 'approve' ? (
              <Box variant="dashed" className="p-2 bg-white">
                <p className="font-cn text-xs">
                  ✓ 批量入库中 · {batch.done} / {batch.total}
                </p>
              </Box>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="primary"
                  onClick={approveAll}
                  disabled={busy || withAnswerCount === 0}
                  className="w-full justify-center"
                >
                  ✓ 一键全部通过（{withAnswerCount} 道有答案的）
                </Button>
                <Button
                  variant="ghost"
                  onClick={discardAll}
                  disabled={busy}
                  className="w-full justify-center"
                >
                  <span className="text-accent">🗑 一键全部丢弃（{job.candidates.length} 道）</span>
                </Button>
                {withAnswerCount === 0 && missingCount > 0 && (
                  <p className="font-cn text-[11px] text-ink-3">
                    全都缺答案，先点上面「一键 AI 解答」才能批量通过。
                  </p>
                )}
              </div>
            )}
          </Box>
        )}

        {!allDone && (
          <p className="font-cn text-xs text-ink-2 px-1">
            点任一条题干进入详情编辑；行内 ✓ / 丢弃 走快速通道。审完会自动从列表移除。
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
              onApprove={() => approveOne(i)}
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
  onApprove,
  onDiscard,
  disabled,
}: {
  idx: number;
  candidate: CandidateQuestion;
  pid: string;
  jid: string;
  onApprove: () => void;
  onDiscard: () => void;
  disabled: boolean;
}) {
  const missingAnswer = !candidate.answer;
  const answerText = missingAnswer
    ? ''
    : (candidate.options.find((o) => o.key === candidate.answer)?.text ?? '');
  return (
    <Box variant="soft" className="p-3">
      <div className="flex items-start gap-2">
        <span className="font-handBold text-xs text-ink-3 mt-0.5 w-5 shrink-0">{idx + 1}.</span>
        <Link to={`/profiles/${pid}/import-jobs/${jid}/review/${idx}`} className="flex-1 min-w-0">
          <p className="font-cn text-sm leading-relaxed line-clamp-2 break-words">
            {candidate.stem}
          </p>
          <div className="flex items-center gap-1.5 mt-1 min-w-0">
            {missingAnswer ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-accent text-accent text-[10px] font-handBold leading-none bg-white shrink-0">
                缺答案
              </span>
            ) : (
              <>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-ink text-ink text-[10px] font-handBold leading-none bg-chip-green shrink-0">
                  ✓ {candidate.answer}
                </span>
                <span className="font-cn text-[11px] text-ink-2 truncate flex-1 min-w-0">
                  {answerText}
                </span>
              </>
            )}
            <span className="font-cn text-[11px] text-ink-3 shrink-0">
              {'★'.repeat(candidate.difficulty)}
            </span>
          </div>
        </Link>
        <div className="flex flex-col gap-1 shrink-0">
          {!missingAnswer && (
            <button
              onClick={onApprove}
              disabled={disabled}
              className="font-cn text-[11px] px-2 py-0.5 rounded-full border border-ink bg-chip-green hover:bg-chip-cream disabled:opacity-40 font-handBold leading-none"
              title="直接入库（不打开详情）"
            >
              ✓ 通过
            </button>
          )}
          <button
            onClick={onDiscard}
            disabled={disabled}
            className="font-cn text-[11px] px-2 py-0.5 rounded-full border border-ink-3 text-ink-3 hover:bg-chip-pink disabled:opacity-40 leading-none"
          >
            丢弃
          </button>
        </div>
      </div>
    </Box>
  );
}
