import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ImportJobSummary, type Profile, type Question, type Textbook } from '../api/client';
import { Box } from '../components/Box';
import { Layout } from '../components/Layout';
import { useLanguage } from '../i18n';

type StudyStats = {
  totalQuestions: number;
  wrongbookCount: number;
  attemptsLast7Days: number;
  daysSinceLastAttempt: number | null;
  daysUntilExam: number | null;
  todayMinutesDone: number;
  todayQuestionsDone: number;
};

type Nudge = { tone: 'red' | 'yellow' | 'cream'; text: string } | null;

function computeNudge(stats: StudyStats | null): Nudge {
  if (!stats) return null;
  const { totalQuestions, wrongbookCount, daysSinceLastAttempt, daysUntilExam } = stats;
  // 优先级从高到低，只显示一条
  if (daysUntilExam != null && daysUntilExam >= 0 && daysUntilExam <= 7 && wrongbookCount >= 10) {
    return {
      tone: 'red',
      text: `⏰ 距考试还剩 ${daysUntilExam} 天，错题本还堆着 ${wrongbookCount} 道，去陪学聊聊冲刺策略 →`,
    };
  }
  if (daysSinceLastAttempt != null && daysSinceLastAttempt >= 2) {
    return {
      tone: 'red',
      text: `🚨 已经 ${daysSinceLastAttempt} 天没刷题了，AI 陪你聊聊 →`,
    };
  }
  if (wrongbookCount >= 20) {
    return {
      tone: 'yellow',
      text: `📚 错题本积压 ${wrongbookCount} 道，建议先清这个再加新题 →`,
    };
  }
  if (daysSinceLastAttempt != null && daysSinceLastAttempt >= 1) {
    return { tone: 'yellow', text: '💪 今天还没开张，要不要先从错题本来 10 道 →' };
  }
  // 兜底：常态下也要让"今天日期 + 距考天数"有处可挂
  const examLine =
    daysUntilExam == null
      ? '考试日期未设'
      : daysUntilExam >= 0
        ? `距考还剩 ${daysUntilExam} 天`
        : `考期已过 ${-daysUntilExam} 天`;
  const tail =
    totalQuestions === 0
      ? '题库还空着，找 AI 教练聊聊从哪开始 →'
      : daysSinceLastAttempt == null
        ? `题库 ${totalQuestions} 道，跟 AI 教练定个今日计划 →`
        : '跟 AI 教练唠两句保持节奏 →';
  return { tone: 'cream', text: `${examLine} · ${tail}` };
}

export function ProfileDetail() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [questionsTotal, setQuestionsTotal] = useState<number | null>(null);
  const [inflightJobs, setInflightJobs] = useState<ImportJobSummary[] | null>(null);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [textbooks, setTextbooks] = useState<Textbook[] | null>(null);

  useEffect(() => {
    if (!pid) return;
    // 四条并行，谁先到先 setState（progressive rendering）— 避免整页等 Promise.all
    api.getProfile(pid).then(setProfile).catch(() => setProfile(null));
    api
      .listQuestionsPaged(pid, { limit: 3 })
      .then((r) => {
        setQuestions(r.rows);
        setQuestionsTotal(r.total);
      })
      .catch(() => {
        setQuestions([]);
        setQuestionsTotal(0);
      });
    api
      .listImportJobs(pid, ['pending', 'running', 'completed', 'failed'])
      .then((r) =>
        setInflightJobs(
          r.jobs.filter((j) => {
            // 仍在跑的, 主页都要 hint
            if (j.status === 'pending' || j.status === 'running') return true;
            // PDF 已完成但还有 candidates 没审 → 主页显示"X 道待审" (要用户行动)
            if (j.kind === 'pdf' && j.candidatesCount > 0) return true;
            // AI 出题已完成 → 题已入库, 主页不再常驻提醒 (用户不需要再行动)
            return false;
          }),
        ),
      )
      .catch(() => setInflightJobs([]));
    api.getProfileStats(pid).then(setStats).catch(() => setStats(null));
    api.listTextbooks(pid).then((r) => setTextbooks(r.textbooks)).catch(() => setTextbooks([]));
  }, [pid]);

  // 汇总 ready 教材的章节数 / 段数
  const tbSummary = (() => {
    if (!textbooks) return null;
    const ready = textbooks.filter((t) => t.status === 'ready');
    if (ready.length === 0) return null;
    return {
      count: ready.length,
      chapters: ready.reduce((s, t) => s + t.chapterCount, 0),
      chunks: ready.reduce((s, t) => s + t.chunkCount, 0),
    };
  })();

  const nudge = computeNudge(stats);

  // 北京时间今天的日期，拼在 nudge 文案前面
  const todayCn = new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const todayEn = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Shanghai',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
  const todayLabel = language === 'en' ? todayEn : todayCn;

  const title = profile ? profile.examName : '加载中';

  // 今日目标进度: 维度由档案 goalType 决定, 在档案编辑页设置, 主页只展示
  const goalView = profile?.goalType ?? 'minutes';
  const goalTarget =
    goalView === 'minutes' ? profile?.dailyMinutes ?? 60 : profile?.dailyQuestions ?? 20;
  const goalDone =
    goalView === 'minutes' ? stats?.todayMinutesDone ?? 0 : stats?.todayQuestionsDone ?? 0;
  const goalPct = goalTarget > 0 ? Math.min(100, Math.round((goalDone / goalTarget) * 100)) : 0;
  const goalReached = goalDone >= goalTarget && goalTarget > 0;

  return (
    <Layout title={title} back={() => nav('/profiles')}>
      {/* 框 1: 日期 + 距考 + nudge — 入口语 */}
      {nudge && (
        <Link to={`/profiles/${pid}/study-chat`} className="block mb-3">
          <Box
            variant="thick"
            className={`p-3 ${
              nudge.tone === 'red'
                ? 'bg-chip-pink'
                : nudge.tone === 'yellow'
                  ? 'bg-chip-cream'
                  : 'bg-chip-cream'
            }`}
          >
            <p className="font-cn text-sm leading-relaxed">
              <span className="text-ink-2">{language === 'en' ? 'Today' : '今天'} {todayLabel} · </span>
              {nudge.text}
            </p>
          </Box>
        </Link>
      )}

      {/* 框 2: 档案目标 + 今日进度 — 紧接入口语之后讲今日完成情况 */}
      {profile && stats ? (
        <Box
          variant="thick"
          className={`p-3 mb-3 ${goalReached ? 'bg-chip-green' : 'bg-chip-cream'}`}
        >
          <div className="font-cn text-xs text-ink-2 mb-1">
            {profile.examDate
              ? `📅 ${new Date(profile.examDate).toLocaleDateString('zh-CN')}${
                  stats.daysUntilExam != null
                    ? stats.daysUntilExam >= 0
                      ? ` · 距考 ${stats.daysUntilExam} 天`
                      : ` · 考期已过 ${-stats.daysUntilExam} 天`
                    : ''
                }`
              : '未设考试日期'}
          </div>
          {profile.target && (
            <div className="font-cn text-sm mb-2">🎯 {profile.target}</div>
          )}
          <div className="font-cn text-xs font-bold mb-1.5">
            {goalReached && <span className="mr-1">🎉</span>}
            {goalView === 'minutes' ? '⏱ 今日时长' : '📝 今日题数'} ·{' '}
            {goalView === 'minutes'
              ? `${goalDone} / ${goalTarget} 分钟`
              : `${goalDone} / ${goalTarget} 题`}
            {goalReached && <span className="text-accent4 ml-1">已达成</span>}
          </div>
          <div className="w-full h-3 bg-paperWarm border border-ink rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${goalPct}%`,
                background: goalReached ? '#6ba368' : '#c14d2e',
              }}
            />
          </div>
        </Box>
      ) : (
        <SkeletonHeader />
      )}

      {tbSummary && (
        <Link to={`/profiles/${pid}/textbooks`} className="block mb-3">
          <Box variant="soft" className="p-2 bg-chip-blue flex items-center gap-2">
            <span className="text-base">📚</span>
            <p className="font-cn text-xs flex-1">
              教材就绪 · {tbSummary.count} 本 · {tbSummary.chapters} 章 · {tbSummary.chunks} 段
            </p>
            <span className="font-handBold text-sm">›</span>
          </Box>
        </Link>
      )}

      {inflightJobs && inflightJobs.length > 0 && (
        <div className="mb-3 space-y-2">
          {inflightJobs.map((j) => {
            const isRunning = j.status === 'pending' || j.status === 'running';
            const isAiGen = j.kind === 'ai_gen';
            // AI 出题题目实时入库, 跑中/完成都跳题库 (文案一致, 用户预期一致)
            const to = isAiGen
              ? `/profiles/${pid}/library`
              : isRunning
                ? `/profiles/${pid}/import-jobs/${j.id}`
                : `/profiles/${pid}/import-jobs/${j.id}/review`;
            const tagClass = isRunning ? 'bg-chip-blue' : 'bg-chip-green';
            const tagLabel = isAiGen
              ? isRunning
                ? 'AI 出题中'
                : `已生成 ${j.candidatesCount} 道`
              : isRunning
                ? 'PDF 解析中'
                : `${j.candidatesCount} 道待审`;
            const subLine = isAiGen
              ? isRunning
                ? `${j.doneChunks} / ${j.totalChunks} 道 · 点击去题库查看`
                : `共 ${j.candidatesCount} 道 · 点击去题库查看`
              : isRunning
                ? `${j.doneChunks} / ${j.totalChunks} 批 · 已识别 ${j.candidatesCount} 题`
                : `共 ${j.candidatesCount} 道，点击继续审`;
            return (
              <Link key={j.id} to={to}>
                <Box variant="thick" className="p-2 bg-chip-cream flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 border border-ink rounded-full ${tagClass} px-2 py-0.5`}>
                    {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                    <span className="font-handBold text-xs leading-none">{tagLabel}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-cn text-xs truncate">{j.filename}</p>
                    <p className="font-cn text-[11px] text-ink-3">{subLine}</p>
                  </div>
                  <span className="font-handBold text-base">›</span>
                </Box>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link to={`/profiles/${pid}/questions/new`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">+ 加题</div>
            <div className="font-cn text-xs text-ink-2 mt-1">
              {questionsTotal != null ? `${questionsTotal} 道` : <SkeletonInline />}
            </div>
          </Box>
        </Link>
        <Link to={`/profiles/${pid}/textbooks`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">📚 教材库</div>
            <div className="font-cn text-xs text-ink-2 mt-1">AI 引用章节</div>
          </Box>
        </Link>
        <Link to={`/profiles/${pid}/wrongbook`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">错题本</div>
            <div className="font-cn text-xs text-ink-2 mt-1">查看</div>
          </Box>
        </Link>
        <Link to={`/profiles/${pid}/study-chat`}>
          <Box variant="thick" className="p-3 text-center bg-chip-cream">
            <div className="font-cn font-bold">💬 AI 陪学</div>
            <div className="font-cn text-xs text-ink-2 mt-1">主动建议</div>
          </Box>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="font-display text-xl">最近的题</h2>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/profiles/${pid}/quiz`}
            className="font-cn text-xs px-2 py-1 rounded-full border-[1.5px] border-ink bg-chip-cream hover:bg-chip-green font-handBold"
          >
            开始刷题 →
          </Link>
          <Link to={`/profiles/${pid}/library`} className="font-cn text-xs underline">
            管理全部 →
          </Link>
        </div>
      </div>

      {questions === null ? (
        <SkeletonList rows={5} />
      ) : questions.length === 0 ? (
        <Box variant="dashed" className="p-4 text-center">
          <p className="font-cn text-sm text-ink-2">还没有题，先加几道再来</p>
        </Box>
      ) : (
        <>
          <div className="space-y-2">
            {questions.map((q) => (
              <Link
                key={q.id}
                to={`/profiles/${pid}/quiz?startWith=${q.id}`}
                className="block hover:opacity-90"
              >
                <Box variant="soft" className="p-3">
                  <p className="font-cn text-sm leading-relaxed line-clamp-2">{q.stem}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-cn text-xs text-ink-2">难度 {'★'.repeat(q.difficulty)}</span>
                    <span className="font-cn text-xs text-ink-2">{q.tags.slice(0, 3).join(' · ')}</span>
                    <span className="font-cn text-[10px] text-ink-3 ml-auto">点击答这道 →</span>
                  </div>
                </Box>
              </Link>
            ))}
          </div>
          {questionsTotal != null && questionsTotal > questions.length && (
            <p className="text-center mt-3">
              <Link
                to={`/profiles/${pid}/library`}
                className="font-cn text-xs text-ink-2 underline"
              >
                共 {questionsTotal} 道 · 进入题库管理查看全部 →
              </Link>
            </p>
          )}
        </>
      )}
    </Layout>
  );
}

function SkeletonHeader() {
  return (
    <div className="border-2 border-ink/20 rounded-thick p-3 mb-3 bg-chip-cream/40 animate-pulse">
      <div className="h-3 w-2/3 bg-ink/15 rounded mb-2" />
      <div className="h-4 w-1/2 bg-ink/15 rounded" />
    </div>
  );
}

function SkeletonInline() {
  return <span className="inline-block w-8 h-2 bg-ink/15 rounded animate-pulse align-middle" />;
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="border border-ink/20 rounded-soft p-3 bg-white animate-pulse"
        >
          <div className="h-3 w-full bg-ink/15 rounded mb-2" />
          <div className="h-3 w-3/4 bg-ink/15 rounded mb-2" />
          <div className="h-2 w-1/3 bg-ink/15 rounded" />
        </div>
      ))}
    </div>
  );
}
