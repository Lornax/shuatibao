import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Input } from '../components/Input';
import { Layout } from '../components/Layout';

export function QuestionFromPrompt() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [knowledge, setKnowledge] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!knowledge.trim()) return setError('知识点必填');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.parsePrompt(pid!, knowledge.trim(), difficulty);
      nav(`/profiles/${pid}/questions/confirm`, {
        state: { candidate: res.candidate, source: 'ai_gen' },
      });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="AI 出题" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
        <p className="font-cn text-sm text-ink-2">
          给一个知识点 / 一段你想强化的内容，AI 帮你出一道选择题。
        </p>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">知识点</label>
          <Input
            value={knowledge}
            onChange={(e) => setKnowledge(e.target.value)}
            placeholder="例：产品生命周期的成熟期特征"
          />
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
        <Button variant="primary" onClick={go} disabled={submitting} className="w-full justify-center">
          {submitting ? 'AI 出题中...（10-20s）' : 'AI 帮我出一道'}
        </Button>
      </div>
    </Layout>
  );
}
