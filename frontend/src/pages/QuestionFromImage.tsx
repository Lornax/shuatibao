import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { StagedLoader } from '../components/StagedLoader';

export function QuestionFromImage() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('请选图片文件');
    if (f.size > 8 * 1024 * 1024) return setError('图片超过 8MB');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function go() {
    if (!file) return setError('先选一张图');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.parseImage(pid!, file);
      nav(`/profiles/${pid}/questions/confirm`, {
        state: { candidate: res.candidate, source: 'photo' },
      });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="拍照识题" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
        <p className="font-cn text-sm text-ink-2">
          从相册选一张题目截图 / 拍照，AI 自动识别题干、选项、答案。
        </p>
        <label className="block">
          <Box variant="dashed" className="p-6 text-center cursor-pointer hover:bg-chip-cream">
            <p className="font-cn text-sm">{file ? file.name : '点这里选图（或拍照）'}</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={pick}
              className="hidden"
            />
          </Box>
        </label>
        {preview && (
          <Box variant="soft" className="p-2">
            <img src={preview} alt="preview" className="w-full max-h-80 object-contain" />
          </Box>
        )}
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
                { label: '上传图片', emoji: '📤', minMs: 1500 },
                { label: 'AI 看图思考', emoji: '👁', minMs: 8000 },
                { label: '整理结构化结果', emoji: '🧩', minMs: 3000 },
              ]}
            />
          </Box>
        )}
        <Button variant="primary" onClick={go} disabled={!file || submitting} className="w-full justify-center">
          {submitting ? '识别中…' : '开始识别'}
        </Button>
      </div>
    </Layout>
  );
}
