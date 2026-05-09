import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type CandidateQuestion, type QuestionSource, type SimilarQuestion } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Check } from '../components/Check';
import { Input, Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

type LocationState = {
  candidate?: CandidateQuestion;
  candidates?: CandidateQuestion[];
  source: QuestionSource;
};

export function QuestionConfirm() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const loc = useLocation();
  const state = loc.state as LocationState | null;

  if (!state || (!state.candidate && !state.candidates)) {
    return (
      <Layout title="确认" back={() => nav(`/profiles/${pid}`)}>
        <Box variant="dashed" className="p-4">
          <p className="font-cn text-sm text-ink-2">没有候选题。请先从加题入口进入。</p>
        </Box>
      </Layout>
    );
  }

  const queue = state.candidates ?? (state.candidate ? [state.candidate] : []);
  const [idx, setIdx] = useState(0);
  const current = queue[idx];

  return (
    <Layout title={`确认 ${idx + 1}/${queue.length}`} back={() => nav(`/profiles/${pid}`)}>
      <ConfirmOne
        key={idx}
        pid={pid!}
        candidate={current}
        source={state.source}
        onSavedNext={() => {
          if (idx + 1 < queue.length) setIdx(idx + 1);
          else nav(`/profiles/${pid}`);
        }}
        onSkip={() => {
          if (idx + 1 < queue.length) setIdx(idx + 1);
          else nav(`/profiles/${pid}`);
        }}
      />
    </Layout>
  );
}

function ConfirmOne({
  pid,
  candidate,
  source,
  onSavedNext,
  onSkip,
}: {
  pid: string;
  candidate: CandidateQuestion;
  source: QuestionSource;
  onSavedNext: () => void;
  onSkip: () => void;
}) {
  const [stem, setStem] = useState(candidate.stem);
  const [optionTexts, setOptionTexts] = useState(() => {
    const arr = ['', '', '', ''];
    candidate.options.forEach((o, i) => {
      if (i < 4) arr[i] = o.text;
    });
    return arr;
  });
  const KEYS = ['A', 'B', 'C', 'D'] as const;
  const [answer, setAnswer] = useState<string>(candidate.answer);
  const [explanation, setExplanation] = useState(candidate.explanation || '');
  const [difficulty, setDifficulty] = useState(candidate.difficulty);
  const [tagInput, setTagInput] = useState(candidate.tags.join(', '));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<SimilarQuestion[] | null>(null);

  function setOption(i: number, text: string) {
    setOptionTexts((prev) => prev.map((t, idx) => (idx === i ? text : t)));
  }

  async function save() {
    if (!stem.trim()) return setError('题干必填');
    const options = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
    if (options.length < 2) return setError('至少 2 个选项');
    if (!options.find((o) => o.key === answer)) return setError('答案必须在选项中');

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createQuestion(pid, {
        stem: stem.trim(),
        options,
        answer,
        explanation: explanation.trim() || undefined,
        tags: tagInput.split(',').map((s) => s.trim()).filter(Boolean),
        difficulty,
        source,
      });
      if (res.similar.length > 0) {
        setSimilar(res.similar);
      } else {
        onSavedNext();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (similar) {
    return (
      <div className="space-y-3">
        <Box variant="thick" className="p-3 bg-chip-cream">
          <p className="font-cn font-bold mb-2">⚠️ 题库里有相似的题</p>
          {similar.map((s) => (
            <div key={s.id} className="font-cn text-sm mb-1">
              · {s.stem.slice(0, 50)}{s.stem.length > 50 ? '...' : ''}
              <span className="text-ink-3 text-xs ml-1">（{(s.similarity * 100).toFixed(0)}%）</span>
            </div>
          ))}
          <p className="font-cn text-xs text-ink-2 mt-2">
            题已保存。如果你确认重复，可以稍后从档案里删掉。
          </p>
        </Box>
        <Button variant="primary" onClick={onSavedNext} className="w-full justify-center">
          继续
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Box variant="dashed" className="p-2">
        <p className="font-cn text-xs text-ink-2">来源：{sourceLabel(source)} · AI 已识别 / 生成，请检查再保存</p>
      </Box>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">题干</label>
        <Textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={3} />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">选项 + 答案</label>
        <div className="space-y-2">
          {KEYS.map((k, i) => (
            <div key={k} className="flex items-center gap-2">
              <Check checked={answer === k} shape="circle" onClick={() => setAnswer(k)} />
              <span className="font-handBold font-bold w-4">{k}.</span>
              <Input value={optionTexts[i]} onChange={(e) => setOption(i, e.target.value)} placeholder={`选项 ${k}`} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">解析</label>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">标签</label>
        <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">难度</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {'★'.repeat(d)}
            </Chip>
          ))}
        </div>
      </div>
      {error && (
        <Box variant="dashed" className="p-2">
          <p className="font-cn text-xs text-accent">{error}</p>
        </Box>
      )}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onSkip} className="flex-1 justify-center">跳过这题</Button>
        <Button variant="primary" onClick={save} disabled={submitting} className="flex-[1.4] justify-center">
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}

function sourceLabel(s: QuestionSource): string {
  return s === 'photo' ? '拍照识题' : s === 'pdf' ? 'PDF 导入' : s === 'ai_gen' ? 'AI 生成' : '手输';
}
