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
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

function formatSize(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function QuestionFromPDF() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ImportJobSummary[] | null>(null);
  const [newMatch, setNewMatch] = useState<MatchInfo | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  async function refreshJobs() {
    if (!pid) return;
    try {
      const r = await api.listImportJobs(pid, ['pending', 'running', 'completed', 'failed']);
      // 按时间倒序, 只展示有意义的 (candidates>0 或仍在跑或可续传)
      const meaningful = r.jobs.filter(
        (j) =>
          j.kind === 'pdf' && // PDF 导入页只显示 PDF 任务, AI 出题任务不在这里
          (j.status === 'pending' ||
            j.status === 'running' ||
            j.candidatesCount > 0 ||
            (j.status === 'failed' && j.doneChunks < j.totalChunks)),
      );
      setJobs(meaningful);
    } catch (e) {
      console.error('list jobs failed', e);
    }
  }

  useEffect(() => {
    refreshJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) return setError('请选 PDF 文件');
    if (f.size > 20 * 1024 * 1024) return setError('PDF 超过 20MB');
    setFile(f);
    setError(null);
    setNewMatch(null);
    if (!pid) return;
    try {
      const { match } = await api.matchImportJob(pid, f.name, f.size);
      if (match) setNewMatch(match);
    } catch (e) {
      console.error('match check failed', e);
    }
  }

  async function uploadFresh() {
    if (!file || !pid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createPdfImportJob(pid, file);
      if (res.ok) {
        // 命中内容缓存: 直接跳 review (candidates 已就绪, 0 LLM 调用)
        if (res.fromCache) {
          nav(`/profiles/${pid}/import-jobs/${res.jobId}/review`, { replace: true });
        } else {
          nav(`/profiles/${pid}/import-jobs/${res.jobId}`, { replace: true });
        }
      } else if (res.conflict) {
        setError('当前已有一份 PDF 在解析中, 先去看它');
        await refreshJobs();
        setSubmitting(false);
      }
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  async function resumeJob(jid: string) {
    if (!pid) return;
    setBusyJobId(jid);
    try {
      const res = await api.resumeImportJob(pid, jid);
      nav(`/profiles/${pid}/import-jobs/${res.jobId}`, { replace: true });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyJobId(null);
    }
  }

  async function deleteJob(jid: string, filename: string) {
    if (!pid) return;
    if (!window.confirm(`确定取消并删除「${filename}」的导入记录？\n已识别的题目也会一并丢弃。`)) return;
    setBusyJobId(jid);
    try {
      await api.deleteImportJob(pid, jid);
      await refreshJobs();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyJobId(null);
    }
  }

  function gotoReview(jid: string) {
    nav(`/profiles/${pid}/import-jobs/${jid}/review`, { replace: true });
  }

  function gotoProgress(jid: string) {
    nav(`/profiles/${pid}/import-jobs/${jid}`, { replace: true });
  }

  const hasInflight = jobs?.some((j) => j.status === 'pending' || j.status === 'running');

  return (
    <Layout title="PDF 导入" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
        {/* 档案历史 PDF 任务列表 */}
        {jobs && jobs.length > 0 && (
          <div className="space-y-2">
            <p className="font-cn font-bold text-sm">📋 这个档案的 PDF 任务</p>
            {jobs.map((j) => {
              const inflight = j.status === 'pending' || j.status === 'running';
              const notQuiz = j.error === 'not_a_quiz_pdf';
              const canResume = j.status === 'failed' && j.doneChunks < j.totalChunks && !notQuiz;
              const bg = inflight
                ? 'bg-chip-blue'
                : notQuiz
                  ? 'bg-chip-pink'
                  : j.status === 'completed'
                    ? 'bg-chip-green'
                    : 'bg-chip-cream';
              return (
                <Box key={j.id} variant="thick" className={`p-3 ${bg}`}>
                  <p className="font-cn font-bold text-sm truncate">{j.filename}</p>
                  <p className="font-cn text-xs text-ink-2 mt-0.5">
                    {formatRelative(j.createdAt)}
                    {' · '}
                    {inflight
                      ? `解析中 · ${j.doneChunks}/${j.totalChunks} 批`
                      : notQuiz
                        ? '❌ 识别失败：可能不是题目 PDF'
                        : j.status === 'completed'
                          ? `已完成 · 共 ${j.candidatesCount} 道`
                          : `中断 · 已识别 ${j.doneChunks}/${j.totalChunks} 批 · ${j.candidatesCount} 道`}
                  </p>

                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {inflight && (
                      <Button variant="primary" onClick={() => gotoProgress(j.id)} className="text-xs">
                        查看进度 →
                      </Button>
                    )}
                    {!inflight && j.candidatesCount > 0 && (
                      <Button variant="primary" onClick={() => gotoReview(j.id)} className="text-xs">
                        ✓ 用现有 {j.candidatesCount} 道
                      </Button>
                    )}
                    {canResume && (
                      <Button
                        variant="primary"
                        onClick={() => resumeJob(j.id)}
                        disabled={busyJobId === j.id || hasInflight}
                        className="text-xs"
                      >
                        ▶ 续传剩下 {j.totalChunks - j.doneChunks} 批
                      </Button>
                    )}
                    {!inflight && (
                      <Button
                        variant="ghost"
                        onClick={() => deleteJob(j.id, j.filename)}
                        disabled={busyJobId === j.id}
                        className="text-xs"
                      >
                        🗑 删除
                      </Button>
                    )}
                  </div>
                </Box>
              );
            })}
          </div>
        )}

        {/* 上传新 PDF */}
        <div className="space-y-2 pt-2 border-t border-dashed border-ink-3">
          <p className="font-cn font-bold text-sm">⬆️ 上传新 PDF</p>
          <p className="font-cn text-xs text-ink-2">
            真题 PDF（≤20MB），AI 解析后让你逐题确认。
            {hasInflight && <span className="text-accent"> · 当前有任务在解析，先等它完。</span>}
          </p>
          <label className="block">
            <Box variant="dashed" className="p-5 text-center cursor-pointer hover:bg-chip-cream">
              <p className="font-cn text-sm">
                {file ? `${file.name} · ${formatSize(file.size)}` : '点这里选 PDF'}
              </p>
              <input type="file" accept="application/pdf,.pdf" onChange={pick} className="hidden" />
            </Box>
          </label>

          {newMatch && (
            <Box variant="dashed" className="p-2 bg-chip-cream">
              <p className="font-cn text-xs text-ink-2">
                💡 这份 PDF 在上方任务列表里能找到记录（{formatRelative(newMatch.createdAt)}）。
                选个动作直接接着用，不用重传。
              </p>
            </Box>
          )}

          {error && (
            <Box variant="dashed" className="p-2">
              <p className="font-cn text-xs text-accent">{error}</p>
            </Box>
          )}

          {file && !newMatch && (
            <Button
              variant="primary"
              onClick={uploadFresh}
              disabled={!file || submitting || hasInflight}
              className="w-full justify-center"
            >
              {submitting ? '提交中...' : hasInflight ? '当前有任务解析中' : '开始解析'}
            </Button>
          )}
          {file && newMatch && (
            <Button
              variant="ghost"
              onClick={uploadFresh}
              disabled={!file || submitting || hasInflight}
              className="w-full justify-center"
            >
              {submitting ? '提交中...' : '🔁 仍然重新跑一份新的'}
            </Button>
          )}
        </div>

        <Box variant="dashed" className="p-2">
          <p className="font-cn text-xs text-ink-3">
            提示：识别开始 3 批后还是 0 道题, 系统会自动停掉并标"可能不是题目 PDF", 不再浪费 token。
          </p>
        </Box>
      </div>
    </Layout>
  );
}
