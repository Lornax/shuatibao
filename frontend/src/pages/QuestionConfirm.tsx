import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type CandidateQuestion, type Question, type QuestionSource, type SimilarQuestion } from '../api/client';
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

type BulkMode = 'none' | 'keep_all' | 'skip_all';

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
  const [bulkMode, setBulkMode] = useState<BulkMode>('none');
  const current = queue[idx];

  function next() {
    if (idx + 1 < queue.length) setIdx(idx + 1);
    else nav(`/profiles/${pid}`);
  }

  return (
    <Layout title={`确认 ${idx + 1}/${queue.length}`} back={() => nav(`/profiles/${pid}`)}>
      {queue.length > 1 && bulkMode === 'none' && (
        <div className="flex gap-2 mb-3">
          <Button variant="ghost" onClick={() => setBulkMode('keep_all')} className="flex-1 justify-center text-xs">
            全部都保留
          </Button>
          <Button variant="ghost" onClick={() => setBulkMode('skip_all')} className="flex-1 justify-center text-xs">
            遇到相似全跳过
          </Button>
        </div>
      )}
      {bulkMode !== 'none' && (
        <Box variant="dashed" className="p-2 mb-3 flex items-center gap-2">
          <span className="font-cn text-xs flex-1">
            批量模式：{bulkMode === 'keep_all' ? '相似题全保留' : '相似题全跳过（删新建）'}
          </span>
          <Button variant="ghost" onClick={() => setBulkMode('none')} className="text-xs">取消</Button>
        </Box>
      )}
      <ConfirmOne
        key={idx}
        pid={pid!}
        candidate={current}
        source={state.source}
        bulkMode={bulkMode}
        onSavedNext={next}
        onSkip={next}
      />
    </Layout>
  );
}

function ConfirmOne({
  pid,
  candidate,
  source,
  bulkMode,
  onSavedNext,
  onSkip,
}: {
  pid: string;
  candidate: CandidateQuestion;
  source: QuestionSource;
  bulkMode: BulkMode;
  onSavedNext: () => void;
  onSkip: () => void;
}) {
  const KEYS = ['A', 'B', 'C', 'D'] as const;
  const [stem, setStem] = useState(candidate.stem);
  const [optionTexts, setOptionTexts] = useState(() => {
    const arr = ['', '', '', ''];
    candidate.options.forEach((o, i) => {
      if (i < 4) arr[i] = o.text;
    });
    return arr;
  });
  const [answer, setAnswer] = useState<string>(candidate.answer || '');
  const [explanation, setExplanation] = useState(candidate.explanation || '');
  const [difficulty, setDifficulty] = useState(candidate.difficulty);
  const [tagInput, setTagInput] = useState(candidate.tags.join(', '));
  const [submitting, setSubmitting] = useState(false);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedQuestion, setSavedQuestion] = useState<Question | null>(null);
  const [similar, setSimilar] = useState<SimilarQuestion[] | null>(null);

  function setOption(i: number, text: string) {
    setOptionTexts((prev) => prev.map((t, idx) => (idx === i ? text : t)));
  }

  async function solveByAI() {
    const opts = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
    if (!stem.trim()) return setError('要先填好题干');
    if (opts.length < 2) return setError('要先填好至少 2 个选项');
    setSolving(true);
    setError(null);
    try {
      const r = await api.solveCandidate(stem.trim(), opts);
      setAnswer(r.answer);
      if (!explanation.trim()) setExplanation(r.explanation);
    } catch (e) {
      setError(String(e));
    } finally {
      setSolving(false);
    }
  }

  async function save() {
    if (!stem.trim()) return setError('题干必填');
    const options = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
    if (options.length < 2) return setError('至少 2 个选项');
    if (!answer) return setError('还没选答案（手动选一个或点 AI 解题）');
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
        // 应用 bulkMode
        if (bulkMode === 'keep_all') {
          onSavedNext();
          return;
        }
        if (bulkMode === 'skip_all') {
          await api.deleteQuestion(res.question.id);
          onSavedNext();
          return;
        }
        // 否则进入决策 UI
        setSavedQuestion(res.question);
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

  async function resolveSimilar(action: 'keep_new' | 'keep_old' | 'keep_both') {
    if (!savedQuestion || !similar) return;
    try {
      if (action === 'keep_new') {
        for (const s of similar) {
          await api.deleteQuestion(s.id);
        }
      } else if (action === 'keep_old') {
        await api.deleteQuestion(savedQuestion.id);
      }
      // keep_both: 啥也不删
    } catch (e) {
      setError(String(e));
      return;
    }
    setSavedQuestion(null);
    setSimilar(null);
    onSavedNext();
  }

  if (similar && savedQuestion) {
    return (
      <SimilarDecision
        newQ={savedQuestion}
        similar={similar}
        onResolve={resolveSimilar}
      />
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
      {!answer && (
        <Box variant="dashed" className="p-3 bg-chip-cream">
          <p className="font-cn text-xs mb-2 font-bold">⚠️ AI 没识别出标准答案</p>
          <p className="font-cn text-xs text-ink-2 mb-2">下方选项中手动选一个，或者让 AI 帮你解：</p>
          <Button onClick={solveByAI} disabled={solving} variant="primary" className="w-full justify-center text-xs">
            {solving ? '🤖 AI 解题中…' : '🤖 让 AI 解一下'}
          </Button>
        </Box>
      )}
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

function SimilarDecision({
  newQ,
  similar,
  onResolve,
}: {
  newQ: Question;
  similar: SimilarQuestion[];
  onResolve: (action: 'keep_new' | 'keep_old' | 'keep_both') => void;
}) {
  const [acting, setActing] = useState(false);
  const handle = async (a: 'keep_new' | 'keep_old' | 'keep_both') => {
    setActing(true);
    await onResolve(a);
    setActing(false);
  };
  return (
    <div className="space-y-3">
      <Box variant="thick" className="p-3 bg-chip-cream">
        <p className="font-cn font-bold text-sm">⚠️ 题库里有相似题，选一个动作</p>
      </Box>

      <Box variant="soft" className="p-3">
        <div className="font-cn text-xs text-ink-2 mb-1">你刚加的（新）</div>
        <p className="font-cn text-sm font-bold mb-2">{newQ.stem}</p>
        {newQ.options.map((o) => (
          <div key={o.key} className="font-cn text-xs">
            {o.key}. {o.text} {o.key === newQ.answer && <span className="text-accent-4 font-bold">✓ 答案</span>}
          </div>
        ))}
      </Box>

      {similar.map((s) => {
        const answerDiffer = s.answer && newQ.answer && s.answer !== newQ.answer;
        return (
          <Box key={s.id} variant="soft" className={`p-3 ${answerDiffer ? 'border-accent border-2' : ''}`}>
            <div className="font-cn text-xs text-ink-2 mb-1">
              已有（相似度 {(s.similarity * 100).toFixed(0)}%）
            </div>
            <p className="font-cn text-sm font-bold mb-2">{s.stem}</p>
            {s.options.map((o) => (
              <div key={o.key} className="font-cn text-xs">
                {o.key}. {o.text} {o.key === s.answer && <span className="text-accent-4 font-bold">✓ 答案</span>}
              </div>
            ))}
            {answerDiffer && (
              <p className="font-cn text-xs text-accent mt-2 font-bold">⚠️ 答案不一样！自己核对一下哪个对</p>
            )}
            {s.explanation && (
              <p className="font-cn text-xs text-ink-2 mt-2 border-t border-dashed border-ink-3 pt-2">
                解析：{s.explanation}
              </p>
            )}
          </Box>
        );
      })}

      <div className="space-y-2 pt-2">
        <Button variant="primary" onClick={() => handle('keep_new')} disabled={acting} className="w-full justify-center">
          保留新题，删旧题
        </Button>
        <Button onClick={() => handle('keep_old')} disabled={acting} className="w-full justify-center">
          丢弃新题，保留旧题
        </Button>
        <Button variant="ghost" onClick={() => handle('keep_both')} disabled={acting} className="w-full justify-center">
          都保留（不是重复）
        </Button>
      </div>
    </div>
  );
}

function sourceLabel(s: QuestionSource): string {
  return s === 'photo' ? '拍照识题' : s === 'pdf' ? 'PDF 导入' : s === 'ai_gen' ? 'AI 生成' : '手输';
}
