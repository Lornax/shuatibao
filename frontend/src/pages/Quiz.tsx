import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Question } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

type Phase =
  | { kind: 'loading' }
  | { kind: 'done' }
  | { kind: 'asking'; q: Question; startAt: number; chosen: string | null }
  | { kind: 'revealed'; q: Question; chosen: string; correct: string; isCorrect: boolean; explanation: string | null };

export function Quiz() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  async function loadNext() {
    setPhase({ kind: 'loading' });
    const next = await api.nextQuiz(pid!);
    if ('done' in next && next.done) {
      setPhase({ kind: 'done' });
    } else {
      setPhase({ kind: 'asking', q: next as Question, startAt: Date.now(), chosen: null });
    }
  }

  useEffect(() => {
    loadNext();
  }, [pid]);

  async function submit() {
    if (phase.kind !== 'asking' || !phase.chosen) return;
    const elapsed = Date.now() - phase.startAt;
    const res = await api.submitAttempt(phase.q.id, { chosen: phase.chosen, timeSpentMs: elapsed });
    setPhase({
      kind: 'revealed',
      q: phase.q,
      chosen: phase.chosen,
      correct: res.correctAnswer,
      isCorrect: res.attempt.isCorrect,
      explanation: res.explanation,
    });
  }

  return (
    <Layout title="答题" back={() => nav(`/profiles/${pid}`)}>
      {phase.kind === 'loading' && <p className="font-cn text-sm text-ink-2">加载中...</p>}

      {phase.kind === 'done' && (
        <Box variant="thick" className="p-6 text-center bg-chip-cream">
          <p className="font-display text-3xl mb-2">没题了 🎉</p>
          <p className="font-cn text-sm text-ink-2 mb-4">这个档案下所有题都答对过了。</p>
          <Button variant="primary" onClick={() => nav(`/profiles/${pid}`)}>
            返回档案
          </Button>
        </Box>
      )}

      {phase.kind === 'asking' && (
        <div className="space-y-3">
          <Box variant="thick" className="p-4 bg-chip-cream">
            <p className="font-cn text-base leading-relaxed whitespace-pre-wrap">{phase.q.stem}</p>
          </Box>
          <div className="space-y-2">
            {phase.q.options.map((o) => (
              <Box
                key={o.key}
                variant={phase.chosen === o.key ? 'thick' : 'soft'}
                className={`p-3 cursor-pointer ${phase.chosen === o.key ? 'bg-chip-cream' : ''}`}
                onClick={() => setPhase({ ...phase, chosen: o.key })}
              >
                <span className="font-handBold font-bold mr-2">{o.key}.</span>
                <span className="font-cn text-sm">{o.text}</span>
              </Box>
            ))}
          </div>
          <Button variant="primary" onClick={submit} disabled={!phase.chosen} className="w-full justify-center">
            提交
          </Button>
        </div>
      )}

      {phase.kind === 'revealed' && (
        <div className="space-y-3">
          <Box variant="thick" className="p-4 bg-chip-cream">
            <p className="font-cn text-base leading-relaxed whitespace-pre-wrap">{phase.q.stem}</p>
          </Box>
          <div className="space-y-2">
            {phase.q.options.map((o) => {
              const isUserChoice = o.key === phase.chosen;
              const isCorrect = o.key === phase.correct;
              const bg = isCorrect ? 'bg-chip-green' : isUserChoice ? 'bg-chip-pink' : '';
              return (
                <Box key={o.key} variant="soft" className={`p-3 ${bg}`}>
                  <span className="font-handBold font-bold mr-2">{o.key}.</span>
                  <span className="font-cn text-sm">{o.text}</span>
                  {isCorrect && <span className="font-cn text-xs ml-2 text-accent-4">正确</span>}
                  {isUserChoice && !isCorrect && <span className="font-cn text-xs ml-2 text-accent">你选的</span>}
                </Box>
              );
            })}
          </div>
          {phase.explanation && (
            <Box variant="dashed" className="p-3">
              <p className="font-cn font-bold text-xs mb-1">解析</p>
              <p className="font-cn text-sm whitespace-pre-wrap">{phase.explanation}</p>
            </Box>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => nav(`/profiles/${pid}`)} className="flex-1 justify-center">
              收摊
            </Button>
            <Button variant="primary" onClick={loadNext} className="flex-[1.4] justify-center">
              下一题 →
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
