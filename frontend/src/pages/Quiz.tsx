import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Question } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

type AnsweredRecord = {
  q: Question;
  chosen: string;
  correct: string;
  isCorrect: boolean;
  explanation: string | null;
};

type Live =
  | { kind: 'loading' }
  | { kind: 'done' }
  | { kind: 'asking'; q: Question; startAt: number; chosen: string | null }
  | {
      kind: 'revealed';
      q: Question;
      chosen: string;
      correct: string;
      isCorrect: boolean;
      explanation: string | null;
    };

export function Quiz() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [history, setHistory] = useState<AnsweredRecord[]>([]);
  const [live, setLive] = useState<Live>({ kind: 'loading' });
  const [viewing, setViewing] = useState<number | 'live'>('live');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [libraryTotal, setLibraryTotal] = useState<number | null>(null);

  async function refreshStats() {
    if (!pid) return;
    try {
      const list = await api.listQuestions(pid);
      setLibraryTotal(list.length);
      const r = list.filter(
        (q) => (q.attemptTotal ?? 0) === 0 || (q.accuracy ?? 0) < 1,
      ).length;
      setRemaining(r);
    } catch {
      // soft-fail; counter just shows "—"
    }
  }

  async function loadNext() {
    if (!pid) return;
    setLive({ kind: 'loading' });
    setViewing('live');
    try {
      const next = await api.nextQuiz(pid);
      if ('done' in next && next.done) {
        setLive({ kind: 'done' });
      } else {
        setLive({ kind: 'asking', q: next as Question, startAt: Date.now(), chosen: null });
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadNext();
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  async function submit() {
    if (live.kind !== 'asking' || !live.chosen) return;
    const elapsed = Date.now() - live.startAt;
    const res = await api.submitAttempt(live.q.id, {
      chosen: live.chosen,
      timeSpentMs: elapsed,
    });
    setLive({
      kind: 'revealed',
      q: live.q,
      chosen: live.chosen,
      correct: res.correctAnswer,
      isCorrect: res.attempt.isCorrect,
      explanation: res.explanation,
    });
    refreshStats();
  }

  function pushAndNext() {
    if (live.kind !== 'revealed') return;
    setHistory((h) => [
      ...h,
      {
        q: live.q,
        chosen: live.chosen,
        correct: live.correct,
        isCorrect: live.isCorrect,
        explanation: live.explanation,
      },
    ]);
    loadNext();
  }

  function goPrev() {
    if (viewing === 'live') {
      if (history.length > 0) setViewing(history.length - 1);
    } else if (viewing > 0) {
      setViewing(viewing - 1);
    }
  }

  function goNext() {
    if (viewing === 'live') {
      pushAndNext();
    } else {
      const nextIdx = (viewing as number) + 1;
      if (nextIdx >= history.length) setViewing('live');
      else setViewing(nextIdx);
    }
  }

  const canPrev =
    viewing === 'live' ? history.length > 0 : (viewing as number) > 0;
  const currentSlot = viewing === 'live' ? history.length + 1 : (viewing as number) + 1;

  return (
    <Layout title="答题" back={() => nav(`/profiles/${pid}`)}>
      <Box variant="soft" className="p-2 mb-3 bg-chip-cream">
        <div className="flex items-center justify-between text-xs font-cn">
          <span>
            本次第 <span className="font-handBold text-sm">{currentSlot}</span> 道
            {viewing !== 'live' && (
              <span className="text-ink-3 ml-1">（回看 · 共 {history.length + 1} 道）</span>
            )}
          </span>
          <span className="text-ink-2">
            {remaining != null && libraryTotal != null
              ? `剩 ${remaining} 道未掌握 / 共 ${libraryTotal}`
              : '—'}
          </span>
        </div>
      </Box>

      {viewing === 'live' && live.kind === 'loading' && (
        <p className="font-cn text-sm text-ink-2">加载中...</p>
      )}

      {viewing === 'live' && live.kind === 'done' && (
        <Box variant="thick" className="p-6 text-center bg-chip-cream">
          <p className="font-display text-3xl mb-2">没题了 🎉</p>
          <p className="font-cn text-sm text-ink-2 mb-4">这个档案下所有题都答对过了。</p>
          <div className="space-y-2">
            {history.length > 0 && (
              <Button variant="ghost" onClick={goPrev} className="w-full justify-center">
                ← 回看刚才答的题
              </Button>
            )}
            <Button variant="primary" onClick={() => nav(`/profiles/${pid}`)} className="w-full justify-center">
              返回档案
            </Button>
          </div>
        </Box>
      )}

      {viewing === 'live' && live.kind === 'asking' && (
        <div className="space-y-3">
          <Stem stem={live.q.stem} />
          <div className="space-y-2">
            {live.q.options.map((o) => (
              <Box
                key={o.key}
                variant={live.chosen === o.key ? 'thick' : 'soft'}
                className={`p-3 cursor-pointer ${live.chosen === o.key ? 'bg-chip-cream' : ''}`}
                onClick={() => setLive({ ...live, chosen: o.key })}
              >
                <span className="font-handBold font-bold mr-2">{o.key}.</span>
                <span className="font-cn text-sm">{o.text}</span>
              </Box>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={!canPrev}
              className="flex-1 justify-center"
            >
              ← 上一题
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={!live.chosen}
              className="flex-[1.4] justify-center"
            >
              提交
            </Button>
          </div>
        </div>
      )}

      {viewing === 'live' && live.kind === 'revealed' && (
        <RevealedView
          record={{
            q: live.q,
            chosen: live.chosen,
            correct: live.correct,
            isCorrect: live.isCorrect,
            explanation: live.explanation,
          }}
        >
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={!canPrev}
              className="flex-1 justify-center"
            >
              ← 上一题
            </Button>
            <Button
              variant="ghost"
              onClick={() => nav(`/profiles/${pid}`)}
              className="flex-1 justify-center"
            >
              收摊
            </Button>
            <Button variant="primary" onClick={goNext} className="flex-[1.4] justify-center">
              下一题 →
            </Button>
          </div>
        </RevealedView>
      )}

      {typeof viewing === 'number' && (
        <RevealedView record={history[viewing]} readOnlyBanner>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={(viewing as number) === 0}
              className="flex-1 justify-center"
            >
              ← 上一题
            </Button>
            <Button variant="primary" onClick={goNext} className="flex-[1.4] justify-center">
              {(viewing as number) + 1 >= history.length ? '回到当前 →' : '下一题 →'}
            </Button>
          </div>
        </RevealedView>
      )}
    </Layout>
  );
}

function Stem({ stem }: { stem: string }) {
  return (
    <Box variant="thick" className="p-4 bg-chip-cream">
      <p className="font-cn text-base leading-relaxed whitespace-pre-wrap">{stem}</p>
    </Box>
  );
}

function RevealedView({
  record,
  readOnlyBanner,
  children,
}: {
  record: AnsweredRecord;
  readOnlyBanner?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {readOnlyBanner && (
        <Box variant="dashed" className="p-2 bg-chip-blue">
          <p className="font-cn text-xs text-ink-2">
            🔍 回看模式（只读）。点「下一题 →」回到当前进度。
          </p>
        </Box>
      )}
      <Stem stem={record.q.stem} />
      <div className="space-y-2">
        {record.q.options.map((o) => {
          const isUserChoice = o.key === record.chosen;
          const isCorrect = o.key === record.correct;
          const bg = isCorrect ? 'bg-chip-green' : isUserChoice ? 'bg-chip-pink' : '';
          return (
            <Box key={o.key} variant="soft" className={`p-3 ${bg}`}>
              <span className="font-handBold font-bold mr-2">{o.key}.</span>
              <span className="font-cn text-sm">{o.text}</span>
              {isCorrect && <span className="font-cn text-xs ml-2 text-accent-4">正确</span>}
              {isUserChoice && !isCorrect && (
                <span className="font-cn text-xs ml-2 text-accent">你选的</span>
              )}
            </Box>
          );
        })}
      </div>
      <Box variant="dashed" className="p-3">
        <p className="font-cn font-bold text-xs mb-1">解析</p>
        {record.explanation ? (
          <p className="font-cn text-sm whitespace-pre-wrap">{record.explanation}</p>
        ) : (
          <p className="font-cn text-sm text-ink-3">
            暂无解析。可以去题库管理里给这题手动补一条解析。
          </p>
        )}
      </Box>
      {children}
    </div>
  );
}
