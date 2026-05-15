import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ImportJobSummary } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function QuestionFromPDF() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingJob, setExistingJob] = useState<ImportJobSummary | null>(null);

  useEffect(() => {
    if (!pid) return;
    api.listImportJobs(pid, ['pending', 'running']).then((r) => {
      setExistingJob(r.jobs[0] ?? null);
    }).catch(() => {});
  }, [pid]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) return setError('请选 PDF 文件');
    if (f.size > 20 * 1024 * 1024) return setError('PDF 超过 20MB');
    setFile(f);
    setError(null);
  }

  async function go() {
    if (!file) return setError('先选一个 PDF');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createPdfImportJob(pid!, file);
      if (res.ok) {
        nav(`/profiles/${pid}/import-jobs/${res.jobId}`, { replace: true });
      } else if (res.conflict) {
        // refresh the inflight banner with the existing job so user can see what's blocking
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
          上传一份 NPDP 真题 PDF（≤20MB），AI 解析后让你逐题确认。
        </p>
        <label className="block">
          <Box variant="dashed" className="p-6 text-center cursor-pointer hover:bg-chip-cream">
            <p className="font-cn text-sm">
              {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : '点这里选 PDF'}
            </p>
            <input type="file" accept="application/pdf,.pdf" onChange={pick} className="hidden" />
          </Box>
        </label>
        {error && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-accent">{error}</p>
          </Box>
        )}
        <Button
          variant="primary"
          onClick={go}
          disabled={!file || submitting || !!existingJob}
          className="w-full justify-center"
        >
          {submitting ? '正在提交...' : existingJob ? '等当前那份完成' : '开始解析'}
        </Button>
        <Box variant="dashed" className="p-2">
          <p className="font-cn text-xs text-ink-3">
            提示：扫描版图片型 PDF 可能识别效果差，建议用文本可选 PDF。
          </p>
        </Box>
      </div>
    </Layout>
  );
}
