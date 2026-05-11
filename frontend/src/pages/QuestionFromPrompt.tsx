import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Input } from '../components/Input';
import { Layout } from '../components/Layout';
import { StagedLoader } from '../components/StagedLoader';

export function QuestionFromPrompt() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [knowledge, setKnowledge] = useState('');
  const [chapter, setChapter] = useState('');
  const [topics, setTopics] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyTags, setHistoryTags] = useState<{ tag: string; cnt: number }[]>([]);

  useEffect(() => {
    if (!pid) return;
    api.listTags(pid).then(setHistoryTags).catch(() => setHistoryTags([]));
  }, [pid]);

  function appendTopic(tag: string) {
    const parts = topics.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.includes(tag)) return;
    setTopics(parts.length === 0 ? tag : `${topics}${topics.trimEnd().endsWith(',') ? '' : ', '}${tag}`);
  }

  async function go() {
    if (!knowledge.trim()) return setError('知识点必填');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.parsePrompt(pid!, {
        knowledge: knowledge.trim(),
        difficulty,
        chapter: chapter.trim() || undefined,
        topics: topics.trim() || undefined,
      });
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
          给一个知识点 + 上下文（章节、考点），AI 帮你出一道选择题。上下文越具体题越精准。
        </p>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">知识点 <span className="text-accent">*</span></label>
          <Input
            value={knowledge}
            onChange={(e) => setKnowledge(e.target.value)}
            placeholder="例：产品生命周期的成熟期特征"
          />
        </div>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">教材章节（选填）</label>
          <Input
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="例：第 3 章 / Ch.5"
          />
        </div>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">考点关键词（选填，逗号分隔）</label>
          <Input
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="例：BCG 矩阵, 市场细分"
          />
          {historyTags.length > 0 && (
            <div className="mt-2">
              <p className="font-cn text-xs text-ink-2 mb-1">历史标签（点击追加）：</p>
              <div className="flex gap-1 flex-wrap">
                {historyTags.slice(0, 8).map((t) => (
                  <Chip key={t.tag} onClick={() => appendTopic(t.tag)}>
                    {t.tag} <span className="text-ink-3">·{t.cnt}</span>
                  </Chip>
                ))}
              </div>
            </div>
          )}
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
        {submitting && (
          <Box variant="dashed" className="p-3 bg-chip-cream">
            <StagedLoader
              active={submitting}
              stages={[
                { label: '理解知识点', emoji: '🤔', minMs: 4000 },
                { label: '构造选项与迷惑项', emoji: '✏️', minMs: 6000 },
                { label: '生成解析', emoji: '📝', minMs: 5000 },
              ]}
            />
          </Box>
        )}
        <Button variant="primary" onClick={go} disabled={submitting} className="w-full justify-center">
          {submitting ? 'AI 出题中…' : 'AI 帮我出一道'}
        </Button>
      </div>
    </Layout>
  );
}
