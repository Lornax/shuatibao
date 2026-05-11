import { useEffect, useState } from 'react';

export type Stage = { label: string; emoji: string; minMs: number };

export function StagedLoader({ stages, active }: { stages: Stage[]; active: boolean }) {
  const [stageIdx, setStageIdx] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!active) {
      setStageIdx(0);
      return;
    }
    let cancelled = false;
    let i = 0;
    function next() {
      if (cancelled || i >= stages.length - 1) return;
      const wait = stages[i].minMs;
      setTimeout(() => {
        if (cancelled) return;
        i++;
        setStageIdx(i);
        next();
      }, wait);
    }
    next();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;
  return (
    <div className="space-y-1.5">
      {stages.map((s, i) => {
        const done = i < stageIdx;
        const cur = i === stageIdx;
        return (
          <div
            key={i}
            className={`flex items-center gap-2 font-cn text-sm ${done ? 'opacity-50' : ''} ${cur ? 'font-bold' : ''}`}
          >
            <span className="w-5 text-center">{done ? '✓' : cur ? s.emoji : '○'}</span>
            <span>
              {s.label}
              {cur ? dots : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
