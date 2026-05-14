import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ImportJob, type Profile, type Question } from '../api/client';
import { Box } from '../components/Box';
import { Layout } from '../components/Layout';

export function ProfileDetail() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [inflightJobs, setInflightJobs] = useState<ImportJob[]>([]);

  useEffect(() => {
    if (!pid) return;
    Promise.all([api.getProfile(pid), api.listQuestions(pid)]).then(([p, qs]) => {
      setProfile(p);
      setQuestions(qs);
    });
    api
      .listImportJobs(pid, ['pending', 'running'])
      .then((r) => setInflightJobs(r.jobs))
      .catch(() => setInflightJobs([]));
  }, [pid]);

  if (!profile || !questions) return <Layout title="加载中" back={() => nav('/profiles')}>...</Layout>;

  return (
    <Layout title={profile.examName} back={() => nav('/profiles')}>
      {inflightJobs.length > 0 && (
        <div className="mb-3 space-y-2">
          {inflightJobs.map((j) => (
            <Link key={j.id} to={`/profiles/${pid}/import-jobs/${j.id}`}>
              <Box variant="thick" className="p-2 bg-chip-cream flex items-center gap-2">
                <span className="inline-flex items-center gap-1 border border-ink rounded-full bg-chip-blue px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="font-handBold text-xs leading-none">PDF 导入中</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-cn text-xs truncate">{j.filename}</p>
                  <p className="font-cn text-[11px] text-ink-3">
                    {j.doneChunks} / {j.totalChunks} 段 · 已识别 {j.candidates.length} 题
                  </p>
                </div>
                <span className="font-handBold text-base">›</span>
              </Box>
            </Link>
          ))}
        </div>
      )}

      <Box variant="thick" className="p-3 mb-3 bg-chip-cream">
        <div className="font-cn text-xs text-ink-2">
          {profile.examDate
            ? `${new Date(profile.examDate).toLocaleDateString('zh-CN')} · 每天 ${profile.dailyMinutes} 分钟`
            : `每天 ${profile.dailyMinutes} 分钟（未设考试日期）`}
        </div>
        {profile.target && <div className="font-cn text-sm mt-1">{profile.target}</div>}
      </Box>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Link to={`/profiles/${pid}/questions/new`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">+ 加题</div>
            <div className="font-cn text-xs text-ink-2 mt-1">{questions.length} 道</div>
          </Box>
        </Link>
        <Link to={`/profiles/${pid}/quiz`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">刷题</div>
            <div className="font-cn text-xs text-ink-2 mt-1">开始</div>
          </Box>
        </Link>
        <Link to={`/profiles/${pid}/wrongbook`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">错题本</div>
            <div className="font-cn text-xs text-ink-2 mt-1">查看</div>
          </Box>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl">最近的题</h2>
        <Link to={`/profiles/${pid}/library`} className="font-cn text-xs underline">
          管理全部 →
        </Link>
      </div>
      {questions.length === 0 && (
        <Box variant="dashed" className="p-4 text-center">
          <p className="font-cn text-sm text-ink-2">还没有题，先加几道再来</p>
        </Box>
      )}
      <div className="space-y-2">
        {questions.slice(0, 8).map((q) => (
          <Box key={q.id} variant="soft" className="p-3">
            <p className="font-cn text-sm leading-relaxed line-clamp-2">{q.stem}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-cn text-xs text-ink-2">难度 {'★'.repeat(q.difficulty)}</span>
              <span className="font-cn text-xs text-ink-2">{q.tags.slice(0, 3).join(' · ')}</span>
            </div>
          </Box>
        ))}
      </div>
    </Layout>
  );
}
