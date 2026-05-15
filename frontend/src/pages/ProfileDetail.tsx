import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ImportJobSummary, type Profile, type Question } from '../api/client';
import { Box } from '../components/Box';
import { Layout } from '../components/Layout';

export function ProfileDetail() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [questionsTotal, setQuestionsTotal] = useState<number | null>(null);
  const [inflightJobs, setInflightJobs] = useState<ImportJobSummary[] | null>(null);

  useEffect(() => {
    if (!pid) return;
    // 三条并行，谁先到先 setState（progressive rendering）— 避免整页等 Promise.all
    api.getProfile(pid).then(setProfile).catch(() => setProfile(null));
    api
      .listQuestionsPaged(pid, { limit: 4 })
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
          r.jobs.filter(
            (j) =>
              j.status === 'pending' ||
              j.status === 'running' ||
              j.candidatesCount > 0,
          ),
        ),
      )
      .catch(() => setInflightJobs([]));
  }, [pid]);

  const title = profile ? profile.examName : '加载中';

  return (
    <Layout title={title} back={() => nav('/profiles')}>
      {inflightJobs && inflightJobs.length > 0 && (
        <div className="mb-3 space-y-2">
          {inflightJobs.map((j) => {
            const isRunning = j.status === 'pending' || j.status === 'running';
            const to = isRunning
              ? `/profiles/${pid}/import-jobs/${j.id}`
              : `/profiles/${pid}/import-jobs/${j.id}/review`;
            const tagClass = isRunning ? 'bg-chip-blue' : 'bg-chip-green';
            const tagLabel = isRunning ? 'PDF 解析中' : `${j.candidatesCount} 道待审`;
            const subLine = isRunning
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

      {profile ? (
        <Box variant="thick" className="p-3 mb-3 bg-chip-cream">
          <div className="font-cn text-xs text-ink-2">
            {profile.examDate
              ? `${new Date(profile.examDate).toLocaleDateString('zh-CN')} · 每天 ${profile.dailyMinutes} 分钟`
              : `每天 ${profile.dailyMinutes} 分钟（未设考试日期）`}
          </div>
          {profile.target && <div className="font-cn text-sm mt-1">{profile.target}</div>}
        </Box>
      ) : (
        <SkeletonHeader />
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
