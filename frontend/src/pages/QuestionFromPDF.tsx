import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ImportJobSummary } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

type MatchInfo = {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  filename: string;
  fileSize: number;
  totalChunks: number;
  doneChunks: number;
  error: string | null;
  createdAt: string;
  candidatesCount: number;
  canResume: boolean;
};

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function QuestionFromPDF() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingJob, setExistingJob] = useState<ImportJobSummary | null>(null);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [checkingMatch, setCheckingMatch] = useState(false);

  useEffect(() => {
    if (!pid) return;
    api.listImportJobs(pid, ['pending', 'running']).then((r) => {
      setExistingJob(r.jobs[0] ?? null);
    }).catch(() => {});
  }, [pid]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) return setError('请选 PDF 文件');
    if (f.size > 20 * 1024 * 1024) return setError('PDF 超过 20MB');
    setFile(f);
    setError(null);
    setMatch(null);
    if (!pid) return;
    setCheckingMatch(true);
    try {
      const { match } = await api.matchImportJob(pid, f.name, f.size);
      setMatch(match);
    } catch (e) {
      console.error('match check failed', e);
    } finally {
      setCheckingMatch(false);
    }
  }

  async function startFresh() {
    if (!file) return setError('先选一个 PDF');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createPdfImportJob(pid!, file);
      if (res.ok) {
        nav(`/profiles/${pid}/import-jobs/${res.jobId}`, { replace: true });
      } else if (res.conflict) {
        const j = await api.getImportJob(pid!, res.existingJobId);
        const summary: ImportJobSummary = {
          id: j.id,
          status: j.status,
          kind: j.kind,
          filename: j.filename,
          totalChunks: j.totalChunks,
          doneChunks: j.doneChunks,
          candidatesCount: j.candidates.length,
          error: j.error,
          cosDownloadUrl: j.cosDownloadUrl,
          createdAt: j.createdAt,
          startedAt: j.startedAt,
          finishedAt: j.finishedAt,
        };
        setExistingJob(summary);
        setSubmitting(false);
      }
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  async function reuseMatch() {
    if (!match) return;
    // 已 completed 的, candidates 已 PATCH 清空过则去题库; 否则去 review 页继续审
    if (match.candidatesCount > 0) {
      nav(`/profiles/${pid}/import-jobs/${match.jobId}/review`, { replace: true });
    } else {
      nav(`/profiles/${pid}/library`, { replace: true });
    }
  }

  async function resumeMatch() {
    if (!match || !pid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.resumeImportJob(pid, match.jobId);
      nav(`/profiles/${pid}/import-jobs/${res.jobId}`, { replace: true });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="PDF 导入" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
        {existingJob && (
          <Box variant="thick" className="p-3 bg-chip-pink">
            <p className="font-handBold text-sm mb-1">⚠ 当前已有一份 PDF 在解析中</p>
            <p className="font-cn text-xs text-ink-2 mb-2 truncate">
              {existingJob.filename} · {existingJob.doneChunks} / {existingJob.totalChunks} 批 · 已识别 {existingJob.candidatesCount} 题
            </p>
            <p className="font-cn text-xs text-ink-2 mb-2">
              同档案同一时间只允许 1 份导入，等它结束（或在进度页取消它）后再传新文件。
            </p>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => nav(`/profiles/${pid}/import-jobs/${existingJob.id}`, { replace: true })}
            >
              去看正在解析的那份 →
            </Button>
          </Box>
        )}

        <p className="font-cn text-sm text-ink-2">
          上传一份真题 PDF（≤20MB），AI 解析后让你逐题确认。
        </p>
        <label className="block">
          <Box variant="dashed" className="p-6 text-center cursor-pointer hover:bg-chip-cream">
            <p className="font-cn text-sm">
              {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : '点这里选 PDF'}
            </p>
            <input type="file" accept="application/pdf,.pdf" onChange={pick} className="hidden" />
          </Box>
        </label>

        {checkingMatch && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-ink-2">🔍 检查这份是不是之前传过…</p>
          </Box>
        )}

        {/* 命中之前的同名同大小 PDF: 让用户决策 */}
        {match && !existingJob && (
          <Box variant="thick" className="p-3 bg-chip-cream">
            <p className="font-handBold text-sm mb-2">💡 这份 PDF 之前导过</p>
            <p className="font-cn text-xs text-ink-2 mb-2">
              {formatRelative(match.createdAt)} ·{' '}
              {match.status === 'completed'
                ? `识别完成 · 共 ${match.candidatesCount} 道`
                : match.canResume
                  ? `识别到 ${match.doneChunks} / ${match.totalChunks} 批 · 已存 ${match.candidatesCount} 道 · 还差 ${match.totalChunks - match.doneChunks} 批没跑`
                  : `识别中断 · 已存 ${match.candidatesCount} 道`}
            </p>
            <div className="space-y-1.5">
              {match.candidatesCount > 0 && (
                <Button variant="primary" onClick={reuseMatch} className="w-full justify-center">
                  ✓ 用现有 {match.candidatesCount} 道（直接进审稿/题库）
                </Button>
              )}
              {match.canResume && (
                <Button variant="primary" onClick={resumeMatch} disabled={submitting} className="w-full justify-center">
                  ▶ 续传剩下的 {match.totalChunks - match.doneChunks} 批
                </Button>
              )}
              <Button variant="ghost" onClick={startFresh} disabled={submitting} className="w-full justify-center">
                🔁 重新识别全部（丢弃现有，从头跑）
              </Button>
            </div>
          </Box>
        )}

        {error && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-accent">{error}</p>
          </Box>
        )}

        {/* 无 match 时, 显示常规"开始解析"按钮 */}
        {!match && file && (
          <Button
            variant="primary"
            onClick={startFresh}
            disabled={submitting || !!existingJob || checkingMatch}
            className="w-full justify-center"
          >
            {submitting ? '正在提交...' : existingJob ? '等当前那份完成' : '开始解析'}
          </Button>
        )}

        <Box variant="dashed" className="p-2">
          <p className="font-cn text-xs text-ink-3">
            提示：同名同大小的 PDF 会自动检测，可直接复用之前的识别结果或续传，不用重头跑。
          </p>
        </Box>
      </div>
    </Layout>
  );
}
