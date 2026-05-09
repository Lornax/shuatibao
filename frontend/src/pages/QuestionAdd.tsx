import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Check } from '../components/Check';
import { Input, Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

const KEYS = ['A', 'B', 'C', 'D'] as const;

export function QuestionAdd() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [mode, setMode] = useState<'menu' | 'manual'>('menu');

  return (
    <Layout title="加题" back={() => mode === 'manual' ? setMode('menu') : nav(`/profiles/${pid}`)}>
      {mode === 'menu' && <Menu pid={pid!} onPickManual={() => setMode('manual')} />}
      {mode === 'manual' && <ManualForm pid={pid!} onDone={() => nav(`/profiles/${pid}`)} />}
    </Layout>
  );
}

function Menu({ pid, onPickManual }: { pid: string; onPickManual: () => void }) {
  const items: { icon: string; title: string; desc: string; onClick?: () => void; href?: string }[] = [
    { icon: '✍', title: '手输', desc: '一道一道敲', onClick: onPickManual },
    { icon: '📷', title: '拍照识题', desc: '拍真题书页 AI 自动识别', href: `/profiles/${pid}/questions/from-image` },
    { icon: '📁', title: 'PDF 导入', desc: '上传 PDF AI 解析批量入库', href: `/profiles/${pid}/questions/from-pdf` },
    { icon: '🎲', title: 'AI 生成', desc: '给个知识点 AI 出题', href: `/profiles/${pid}/questions/from-prompt` },
  ];
  return (
    <div className="space-y-2">
      <p className="font-cn text-sm text-ink-2 mb-3">选一个加题方式</p>
      {items.map((it, i) => {
        const inner = (
          <Box variant="soft" className="p-3 flex items-center gap-3 cursor-pointer hover:bg-chip-cream">
            <span className="text-2xl">{it.icon}</span>
            <div className="flex-1">
              <div className="font-cn font-bold">{it.title}</div>
              <div className="font-cn text-xs text-ink-2">{it.desc}</div>
            </div>
            <span className="font-cn text-xs text-ink-3">›</span>
          </Box>
        );
        return it.href ? (
          <Link key={i} to={it.href}>{inner}</Link>
        ) : (
          <div key={i} onClick={it.onClick}>{inner}</div>
        );
      })}
    </div>
  );
}

function ManualForm({ pid, onDone }: { pid: string; onDone: () => void }) {
  const [stem, setStem] = useState('');
  const [optionTexts, setOptionTexts] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState<string>('A');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [tagInput, setTagInput] = useState('NPDP');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setOption(i: number, text: string) {
    setOptionTexts((prev) => prev.map((t, idx) => (idx === i ? text : t)));
  }

  async function submit(continueAdd: boolean) {
    if (!stem.trim()) return setError('题干必填');
    const options = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
    if (options.length < 2) return setError('至少 2 个选项');
    if (!options.find((o) => o.key === answer)) return setError('答案必须在选项中');

    setSubmitting(true);
    setError(null);
    try {
      await api.createQuestion(pid, {
        stem: stem.trim(),
        options,
        answer,
        explanation: explanation.trim() || undefined,
        tags: tagInput.split(',').map((s) => s.trim()).filter(Boolean),
        difficulty,
        source: 'manual',
      });
      if (continueAdd) {
        setStem('');
        setOptionTexts(['', '', '', '']);
        setAnswer('A');
        setExplanation('');
      } else {
        onDone();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="font-cn font-bold text-sm block mb-1">题干</label>
        <Textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={3} placeholder="把题目敲进来..." />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">选项 + 标记正确答案</label>
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
        <label className="font-cn font-bold text-sm block mb-1">解析（选填）</label>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">标签（逗号分隔）</label>
        <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="NPDP, 基础" />
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
      <div className="flex gap-2 pt-2">
        <Button onClick={() => submit(true)} disabled={submitting} className="flex-1 justify-center text-xs">
          保存继续
        </Button>
        <Button variant="primary" onClick={() => submit(false)} disabled={submitting} className="flex-[1.4] justify-center">
          保存返回
        </Button>
      </div>
    </div>
  );
}
