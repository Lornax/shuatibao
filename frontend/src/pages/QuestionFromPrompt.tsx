import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Input } from '../components/Input';
import { Layout } from '../components/Layout';

type Mode = 'chapter' | 'topics' | 'random';
// CHAPTER_PREFIX 现在由后端 worker 注入 tag, 前端不再用

export function QuestionFromPrompt() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();

  // 输入态
  const [mode, setMode] = useState<Mode>('topics');
  const [chapter, setChapter] = useState('');
  const [topics, setTopics] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [count, setCount] = useState(1);

  // 元数据
  const [historyTags, setHistoryTags] = useState<{ tag: string; cnt: number }[]>([]);
  const [bookChapters, setBookChapters] = useState<string[]>([]);
  const [examName, setExamName] = useState<string>('');

  // 运行态
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number }>({
    done: 0,
    total: 0,
    failed: 0,
  });
  const [doneSummary, setDoneSummary] = useState<{ ok: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setJobId] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!pid) return;
    api.listTags(pid).then(setHistoryTags).catch(() => setHistoryTags([]));
    api.listProfileChapters(pid).then((r) => setBookChapters(r.chapters)).catch(() => setBookChapters([]));
    api.getProfile(pid).then((p) => setExamName(p.examName)).catch(() => setExamName(''));
    // 进页面时检测有没有 in-flight 的 AI 出题任务, 有就接着展示进度
    api
      .listImportJobs(pid, ['pending', 'running'])
      .then((r) => {
        const aiGen = r.jobs.find((j) => j.kind === 'ai_gen');
        if (aiGen) {
          cancelRef.current = false;
          setRunning(true);
          setJobId(aiGen.id);
          setProgress({ done: aiGen.doneChunks, total: aiGen.totalChunks, failed: 0 });
          pollJob(aiGen.id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  function appendTopic(tag: string) {
    const parts = topics.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.includes(tag)) return;
    setTopics(parts.length === 0 ? tag : `${topics}${topics.trimEnd().endsWith(',') ? '' : ', '}${tag}`);
  }

  // 把当前 mode + 字段拼成后端的 {knowledge, chapter, topics}
  function buildPayload(): { knowledge: string; chapter?: string; topics?: string } | { error: string } {
    if (mode === 'chapter') {
      if (!chapter.trim()) return { error: '请填写或选择章节' };
      return {
        knowledge: topics.trim() || `${chapter.trim()} 重点考点`,
        chapter: chapter.trim(),
        topics: topics.trim() || undefined,
      };
    }
    if (mode === 'topics') {
      if (!topics.trim()) return { error: '请填写知识点关键词' };
      return {
        knowledge: topics.trim(),
        topics: topics.trim(),
      };
    }
    // random
    return {
      knowledge: `${examName || '本次考试'} 常考要点 随机出题`,
    };
  }

  // 旧的 client 串行 runOne 不再使用 (改为后端 worker), 留作历史参考被删除

  async function go() {
    // 单题：还是走 confirm 页让用户确认（沿用旧体验）
    if (count === 1) {
      const payload = buildPayload();
      if ('error' in payload) return setError(payload.error);
      setRunning(true);
      setError(null);
      try {
        const res = await api.parsePrompt(pid!, { ...payload, difficulty });
        nav(`/profiles/${pid}/questions/confirm`, {
          state: { candidate: res.candidate, source: 'ai_gen', chapter: chapter.trim() || undefined },
        });
      } catch (e) {
        setError(String(e));
        setRunning(false);
      }
      return;
    }

    // 批量: 后端 worker 跑, 前端只发任务 + 轮询. 用户走开/刷新不影响.
    const payload = buildPayload();
    if ('error' in payload) return setError(payload.error);
    setError(null);
    setDoneSummary(null);
    cancelRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: count, failed: 0 });
    setJobId(null);

    let jid: string;
    try {
      const res = await api.createAiGenJob(pid!, { ...payload, difficulty, count });
      jid = res.jobId;
      setJobId(jid);
    } catch (e) {
      setError(String(e));
      setRunning(false);
      return;
    }
    // 启动轮询
    pollJob(jid);
  }

  async function pollJob(jid: string) {
    while (true) {
      if (cancelRef.current) {
        try {
          await api.deleteImportJob(pid!, jid);
        } catch (e) {
          console.warn('cancel ai-gen job failed', e);
        }
        setRunning(false);
        return;
      }
      let job;
      try {
        job = await api.getImportJob(pid!, jid);
      } catch (e) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      const total = job.totalChunks;
      const done = job.doneChunks;
      const candidatesCount = Array.isArray(job.candidates) ? job.candidates.length : 0;
      const failed = done - candidatesCount;
      setProgress({ done, total, failed: Math.max(0, failed) });
      if (job.status === 'completed') {
        setRunning(false);
        setDoneSummary({ ok: candidatesCount, failed: Math.max(0, total - candidatesCount) });
        return;
      }
      if (job.status === 'failed') {
        setRunning(false);
        if (candidatesCount > 0) {
          setDoneSummary({ ok: candidatesCount, failed: total - candidatesCount });
        } else {
          setError(job.error || '出题任务失败');
        }
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  function cancel() {
    cancelRef.current = true;
  }

  function resetBatch() {
    setDoneSummary(null);
    setProgress({ done: 0, total: 0, failed: 0 });
  }

  const COUNT_PRESETS = [1, 3, 5, 10];

  return (
    <Layout title="AI 出题" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
        <p className="font-cn text-sm text-ink-2">
          有教材就基于教材出题，没教材就靠考试常识。AI 把题做出来，你来挑。
        </p>

        {/* 出题模式 */}
        <div>
          <label className="font-cn font-bold text-sm block mb-1">出题模式</label>
          <div className="flex gap-1 flex-wrap">
            <Chip active={mode === 'chapter'} onClick={() => setMode('chapter')}>
              📖 指定章节
            </Chip>
            <Chip active={mode === 'topics'} onClick={() => setMode('topics')}>
              🔑 按知识点
            </Chip>
            <Chip active={mode === 'random'} onClick={() => setMode('random')}>
              🎲 随机
            </Chip>
          </div>
          <p className="font-cn text-[11px] text-ink-3 mt-1">
            {mode === 'chapter' && '锁定一个章节出题（教材就绪时最准）'}
            {mode === 'topics' && '按你写的关键词出题'}
            {mode === 'random' && 'AI 自由发挥常考要点（教材就绪会偏教材内容）'}
          </p>
        </div>

        {/* 章节选择（chapter 模式必填，topics 模式可选） */}
        {(mode === 'chapter' || mode === 'topics') && (
          <div>
            <label className="font-cn font-bold text-sm block mb-1">
              教材章节
              {mode === 'chapter' && <span className="text-accent"> *</span>}
              {mode === 'topics' && <span className="text-ink-3">（选填）</span>}
            </label>
            <input
              list={`tb-chapters-${pid}`}
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder={
                bookChapters.length > 0
                  ? '输入或从已识别章节中选'
                  : '例：第 3 章（上传教材后这里会自动补全）'
              }
              className="border-[1.5px] border-ink rounded-lg bg-white px-3 py-2 font-cn text-sm text-ink w-full focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <datalist id={`tb-chapters-${pid}`}>
              {bookChapters.map((ch) => (
                <option key={ch} value={ch} />
              ))}
            </datalist>
            {bookChapters.length > 0 && (
              <p className="font-cn text-[11px] text-ink-3 mt-1">
                已从教材识别 {bookChapters.length} 个章节
              </p>
            )}
          </div>
        )}

        {/* 知识点关键词（topics 模式必填，chapter 模式可选） */}
        {(mode === 'topics' || mode === 'chapter') && (
          <div>
            <label className="font-cn font-bold text-sm block mb-1">
              知识点关键词
              {mode === 'topics' && <span className="text-accent"> *</span>}
              {mode === 'chapter' && <span className="text-ink-3">（选填，逗号分隔）</span>}
            </label>
            <Input
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder={mode === 'topics' ? '例：产品生命周期的成熟期特征' : '例：BCG 矩阵, 市场细分'}
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
        )}

        {/* 出题数量 */}
        <div>
          <label className="font-cn font-bold text-sm block mb-1">出题数量</label>
          <div className="flex gap-1">
            {COUNT_PRESETS.map((n) => (
              <Chip key={n} active={count === n} onClick={() => setCount(n)}>
                {n === 1 ? '1 道（单题确认）' : `${n} 道`}
              </Chip>
            ))}
          </div>
          {count > 1 && (
            <p className="font-cn text-[11px] text-ink-3 mt-1">
              批量出题不走单题确认页，AI 出完直接入库，事后到题库管理审/改
            </p>
          )}
        </div>

        {/* 难度 */}
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

        {/* 批量进行中 */}
        {running && count > 1 && (
          <Box variant="thick" className="p-3 bg-chip-cream">
            <p className="font-cn text-sm font-bold mb-2">
              🤖 出题中… {progress.done} / {progress.total}
              {progress.failed > 0 && (
                <span className="text-accent text-xs ml-2">（{progress.failed} 道失败）</span>
              )}
            </p>
            <div className="w-full h-3 bg-white border border-ink rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
            <Button onClick={cancel} variant="ghost" className="mt-2 w-full justify-center text-xs">
              取消（已生成的保留）
            </Button>
          </Box>
        )}

        {/* 批量完成 */}
        {doneSummary && (
          <Box variant="thick" className="p-3 bg-chip-green">
            <p className="font-cn text-sm font-bold mb-2">
              ✓ 已生成 {doneSummary.ok} 道，全部已入题库
              {doneSummary.failed > 0 && (
                <span className="text-accent text-xs ml-2">（{doneSummary.failed} 道失败已跳过）</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button onClick={resetBatch} variant="ghost" className="flex-1 justify-center">
                🔁 再来一批
              </Button>
              <Link to={`/profiles/${pid}/library`} className="flex-[1.4]">
                <Button variant="primary" className="w-full justify-center">
                  → 去题库管理
                </Button>
              </Link>
            </div>
          </Box>
        )}

        {/* 主按钮（非批量进行中时显示） */}
        {!running && !doneSummary && (
          <Button variant="primary" onClick={go} className="w-full justify-center">
            🎲 AI 帮我出 {count === 1 ? '一道' : `${count} 道`}
          </Button>
        )}

        {/* 单题进行中（沿用原 loader 体感） */}
        {running && count === 1 && (
          <Box variant="dashed" className="p-3 bg-chip-cream">
            <p className="font-cn text-sm">🤖 AI 出题中…</p>
          </Box>
        )}
      </div>
    </Layout>
  );
}
