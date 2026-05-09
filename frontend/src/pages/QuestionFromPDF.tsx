import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function QuestionFromPDF() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await api.parsePdf(pid!, file);
      if (res.candidates.length === 0) {
        setError('没识别出任何题');
        setSubmitting(false);
        return;
      }
      nav(`/profiles/${pid}/questions/confirm`, {
        state: { candidates: res.candidates, source: 'pdf' },
      });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="PDF 导入" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
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
        <Button variant="primary" onClick={go} disabled={!file || submitting} className="w-full justify-center">
          {submitting ? '解析中...（30-60s）' : '开始解析'}
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
