import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Question, type QuestionSource } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Check } from '../components/Check';
import { Input, Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

const KEYS = ['A', 'B', 'C', 'D'] as const;

type SearchScope = 'all' | 'stem' | 'tag' | 'chapter';
type DateRange = 'all' | 'today' | '7d' | '30d';
const CHAPTER_PREFIX = '章节:';

const ALL_SOURCES: QuestionSource[] = ['photo', 'manual', 'pdf', 'ai_gen'];
const SOURCE_LABEL: Record<QuestionSource, string> = {
  photo: '拍照',
  manual: '手输',
  pdf: 'PDF',
  ai_gen: 'AI 出题',
};

function sourceLabel(s: QuestionSource) {
  return SOURCE_LABEL[s] ?? s;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMs = now - t;
  const day = 24 * 3600 * 1000;
  if (diffMs < 60 * 1000) return '刚刚';
  if (diffMs < 3600 * 1000) return `${Math.floor(diffMs / 60000)} 分钟前`;
  if (diffMs < day) return `${Math.floor(diffMs / 3600000)} 小时前`;
  const days = Math.floor(diffMs / day);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function LibraryManage() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [list, setList] = useState<Question[] | null>(null);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sourceFilter, setSourceFilter] = useState<Set<QuestionSource>>(new Set(ALL_SOURCES));
  const [diffFilter, setDiffFilter] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!pid) return;
    api.listQuestions(pid).then(setList).catch((e) => setError(String(e)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  async function handleDelete(id: string) {
    if (!confirm('确认删除这道题？此操作不可撤销')) return;
    try {
      await api.deleteQuestion(id);
      reload();
    } catch (e) {
      setError(String(e));
    }
  }

  function toggleSource(s: QuestionSource) {
    setSourceFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function toggleDiff(d: number) {
    setDiffFilter((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function resetFilters() {
    setScope('all');
    setDateRange('all');
    setSourceFilter(new Set(ALL_SOURCES));
    setDiffFilter(new Set([1, 2, 3, 4, 5]));
  }

  const activeFilterCount =
    (scope !== 'all' ? 1 : 0) +
    (dateRange !== 'all' ? 1 : 0) +
    (sourceFilter.size !== ALL_SOURCES.length ? 1 : 0) +
    (diffFilter.size !== 5 ? 1 : 0);

  const sinceMs = useMemo(() => {
    const day = 24 * 3600 * 1000;
    const now = Date.now();
    if (dateRange === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (dateRange === '7d') return now - 7 * day;
    if (dateRange === '30d') return now - 30 * day;
    return 0;
  }, [dateRange]);

  const filtered = useMemo(() => {
    if (!list) return [];
    return list.filter((q) => {
      if (sinceMs > 0 && new Date(q.createdAt).getTime() < sinceMs) return false;
      if (!sourceFilter.has(q.source)) return false;
      if (!diffFilter.has(q.difficulty)) return false;
      if (search.trim()) {
        const s = search.trim();
        const inStem = q.stem.includes(s);
        const chapterTag = q.tags.find((t) => t.startsWith(CHAPTER_PREFIX));
        const chapterText = chapterTag ? chapterTag.slice(CHAPTER_PREFIX.length) : '';
        const inChapter = chapterText.includes(s);
        const inOtherTag = q.tags.some((t) => !t.startsWith(CHAPTER_PREFIX) && t.includes(s));
        if (scope === 'stem') return inStem;
        if (scope === 'tag') return inOtherTag;
        if (scope === 'chapter') return inChapter;
        return inStem || inOtherTag || inChapter;
      }
      return true;
    });
  }, [list, sinceMs, sourceFilter, diffFilter, search, scope]);

  return (
    <Layout title={`题库 (${list?.length ?? 0})`} back={() => nav(`/profiles/${pid}`)}>
      <div className="space-y-3">
        <div className="flex gap-2 items-stretch">
          <div className="flex-1 min-w-0">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                scope === 'stem' ? '搜题干...' :
                scope === 'tag' ? '搜标签...' :
                scope === 'chapter' ? '搜章节...' :
                '搜题干 / 标签 / 章节...'
              }
            />
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="relative shrink-0 border-[1.5px] border-ink rounded-lg bg-white px-3 font-cn text-sm hover:bg-chip-cream"
            aria-expanded={filtersOpen}
          >
            筛选 {filtersOpen ? '▴' : '▾'}
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-handBold leading-none border border-ink">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <Box variant="dashed" className="p-3 space-y-3">
            <FilterRow label="搜索范围">
              {(['all', 'stem', 'chapter', 'tag'] as SearchScope[]).map((s) => (
                <Chip key={s} active={scope === s} onClick={() => setScope(s)}>
                  {s === 'all' ? '全部' : s === 'stem' ? '题干' : s === 'chapter' ? '章节' : '标签'}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="按日期">
              {(['all', 'today', '7d', '30d'] as DateRange[]).map((d) => (
                <Chip key={d} active={dateRange === d} onClick={() => setDateRange(d)}>
                  {d === 'all' ? '全部时间' : d === 'today' ? '今天' : d === '7d' ? '近 7 天' : '近 30 天'}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="按来源">
              {ALL_SOURCES.map((s) => (
                <Chip key={s} active={sourceFilter.has(s)} onClick={() => toggleSource(s)}>
                  {SOURCE_LABEL[s]}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="按难度">
              {[1, 2, 3, 4, 5].map((d) => (
                <Chip key={d} active={diffFilter.has(d)} onClick={() => toggleDiff(d)}>
                  {'★'.repeat(d)}
                </Chip>
              ))}
            </FilterRow>
            {activeFilterCount > 0 && (
              <div className="pt-1">
                <button onClick={resetFilters} className="font-cn text-xs text-ink-2 underline">
                  清空全部筛选
                </button>
              </div>
            )}
          </Box>
        )}

        {error && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-accent">{error}</p>
          </Box>
        )}
        {list === null && <p className="font-cn text-sm text-ink-2">加载中...</p>}
        {list?.length === 0 && (
          <Box variant="dashed" className="p-4 text-center">
            <p className="font-cn text-sm text-ink-2">题库还空着</p>
          </Box>
        )}
        {list && list.length > 0 && filtered.length === 0 && (
          <Box variant="dashed" className="p-4 text-center">
            <p className="font-cn text-sm text-ink-2">这组筛选下没有题</p>
          </Box>
        )}
        {filtered.map((q) => (
          <Box key={q.id} variant="soft" className="p-3">
            {editingId === q.id ? (
              <EditInline
                q={q}
                onSaved={() => { setEditingId(null); reload(); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div>
                <p className="font-cn text-sm leading-relaxed mb-1">{q.stem}</p>
                <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-ink text-ink text-[10px] font-handBold leading-none bg-chip-blue">
                    {sourceLabel(q.source)}
                  </span>
                  <span className="font-cn text-ink-3 text-[11px]">{relativeTime(q.createdAt)}</span>
                  <span className="font-cn text-ink-2">{'★'.repeat(q.difficulty)}</span>
                  {q.tags.length > 0 && <span className="font-cn text-ink-2">{q.tags.join(' · ')}</span>}
                  {q.accuracy != null && q.accuracy < 1 && (
                    <span
                      className={`font-cn text-xs font-bold ${
                        q.accuracy < 0.5 ? 'text-accent' : q.accuracy < 0.9 ? 'text-accent-2' : 'text-accent-4'
                      }`}
                    >
                      准确率 {(q.accuracy * 100).toFixed(0)}% ({q.attemptCorrect}/{q.attemptTotal})
                    </span>
                  )}
                </div>
                <div className="font-cn text-xs text-ink-2 mt-1">
                  {q.answer ? (
                    <>
                      答案：<span className="font-handBold">{q.answer}</span>
                      {' · '}
                      {q.options.find((o) => o.key === q.answer)?.text ?? ''}
                    </>
                  ) : (
                    <>答案：<span className="text-accent">&lt;空&gt;</span></>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => setEditingId(q.id)} className="text-xs">编辑</Button>
                  <Button variant="ghost" onClick={() => handleDelete(q.id)} className="text-xs">
                    <span className="text-accent">删除</span>
                  </Button>
                </div>
              </div>
            )}
          </Box>
        ))}
      </div>
    </Layout>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-cn text-[11px] text-ink-3 mb-1">{label}</p>
      <div className="flex gap-1 flex-wrap">{children}</div>
    </div>
  );
}

function EditInline({
  q,
  onSaved,
  onCancel,
}: {
  q: Question;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [stem, setStem] = useState(q.stem);
  const [optionTexts, setOptionTexts] = useState(() => {
    const arr = ['', '', '', ''];
    q.options.forEach((o, i) => {
      if (i < 4) arr[i] = o.text;
    });
    return arr;
  });
  const [answer, setAnswer] = useState<string>(q.answer || '');
  const [explanation, setExplanation] = useState(q.explanation || '');
  const [difficulty, setDifficulty] = useState(q.difficulty);
  const [tagInput, setTagInput] = useState(q.tags.join(', '));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setOption(i: number, text: string) {
    setOptionTexts((prev) => prev.map((t, idx) => (idx === i ? text : t)));
  }

  async function save() {
    if (!stem.trim()) return setError('题干必填');
    const options = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
    if (options.length < 2) return setError('至少 2 个选项');
    if (answer && !options.find((o) => o.key === answer)) return setError('答案必须在选项中');
    setSubmitting(true);
    setError(null);
    try {
      await api.patchQuestion(q.id, {
        stem: stem.trim(),
        options,
        answer,
        explanation: explanation.trim() || null,
        tags: tagInput.split(',').map((s) => s.trim()).filter(Boolean),
        difficulty,
      });
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="font-cn text-xs font-bold block mb-1">题干</label>
        <Textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="font-cn text-xs font-bold block mb-1">选项 + 答案</label>
        <div className="space-y-1">
          {KEYS.map((k, i) => (
            <div key={k} className="flex items-center gap-1">
              <Check checked={answer === k} shape="circle" onClick={() => setAnswer(k)} />
              <span className="font-handBold font-bold w-4 text-xs">{k}.</span>
              <Input value={optionTexts[i]} onChange={(e) => setOption(i, e.target.value)} placeholder={`选项 ${k}`} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="font-cn text-xs font-bold block mb-1">解析</label>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="font-cn text-xs font-bold block mb-1">标签</label>
        <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
      </div>
      <div>
        <label className="font-cn text-xs font-bold block mb-1">难度</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {'★'.repeat(d)}
            </Chip>
          ))}
        </div>
      </div>
      {error && <p className="font-cn text-xs text-accent">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={submitting} className="flex-1 justify-center text-xs">取消</Button>
        <Button variant="primary" onClick={save} disabled={submitting} className="flex-1 justify-center text-xs">
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
