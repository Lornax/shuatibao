import { useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Layout } from '../components/Layout';
import { StagedLoader } from '../components/StagedLoader';
import { cropImageToBlob } from '../lib/cropImage';

type Stage =
  | { kind: 'pick' }
  | { kind: 'cropping'; src: string; originalName: string; originalType: string }
  | { kind: 'ready'; file: File; previewUrl: string };

// 比例预设: undefined = 自由拖拽 (无约束)
const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: '🤚 自由', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

export function QuestionFromImage() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [stage, setStage] = useState<Stage>({ kind: 'pick' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // crop state - 用 react-image-crop, 默认自由模式
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('请选图片文件');
    if (f.size > 12 * 1024 * 1024) return setError('图片超过 12MB');
    setError(null);
    const url = URL.createObjectURL(f);
    setStage({ kind: 'cropping', src: url, originalName: f.name, originalType: f.type });
    setCrop(undefined);
    setCompletedCrop(undefined);
  }

  function switchAspect(v: number | undefined) {
    setAspect(v);
    // 切换比例时清空当前 crop, 让用户从头框
    setCrop(undefined);
    setCompletedCrop(undefined);
  }

  async function confirmCrop() {
    if (stage.kind !== 'cropping' || !completedCrop || !imgRef.current) return;
    setError(null);
    try {
      // react-image-crop 给的是显示尺寸下的像素坐标, 换算到原图自然尺寸
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const pixelCrop = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
      };
      if (pixelCrop.width < 20 || pixelCrop.height < 20) {
        setError('裁剪区域太小, 再框大一点');
        return;
      }
      const blob = await cropImageToBlob(stage.src, pixelCrop, 'image/jpeg', 0.92);
      const file = new File([blob], stage.originalName.replace(/\.[^.]+$/, '') + '-crop.jpg', {
        type: 'image/jpeg',
      });
      if (file.size > 8 * 1024 * 1024) {
        setError(`裁剪后仍 ${(file.size / 1024 / 1024).toFixed(1)}MB · 后端限 8MB · 请缩小一些再试`);
        return;
      }
      const previewUrl = URL.createObjectURL(blob);
      setStage({ kind: 'ready', file, previewUrl });
    } catch (e) {
      setError(String(e));
    }
  }

  function skipCrop() {
    if (stage.kind !== 'cropping') return;
    fetch(stage.src)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], stage.originalName, { type: stage.originalType });
        if (file.size > 8 * 1024 * 1024) {
          setError(`原图 ${(file.size / 1024 / 1024).toFixed(1)}MB · 后端限 8MB · 请裁剪一下再传`);
          return;
        }
        setStage({ kind: 'ready', file, previewUrl: stage.src });
      })
      .catch((e) => setError(String(e)));
  }

  function reset() {
    if (stage.kind === 'cropping') URL.revokeObjectURL(stage.src);
    if (stage.kind === 'ready') URL.revokeObjectURL(stage.previewUrl);
    setStage({ kind: 'pick' });
    setError(null);
  }

  async function go() {
    if (stage.kind !== 'ready') return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.parseImage(pid!, stage.file);
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
        {stage.kind === 'pick' && (
          <>
            <p className="font-cn text-sm text-ink-2">
              拍一张或从相册选一张题目图，下一步可以裁剪出单道题。
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <Box variant="dashed" className="p-4 text-center cursor-pointer hover:bg-chip-cream">
                  <p className="font-cn text-sm">📸 拍照</p>
                  <p className="font-cn text-[11px] text-ink-3 mt-0.5">手机直接开相机</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={pick}
                    className="hidden"
                  />
                </Box>
              </label>
              <label className="block">
                <Box variant="dashed" className="p-4 text-center cursor-pointer hover:bg-chip-cream">
                  <p className="font-cn text-sm">🖼 从相册选</p>
                  <p className="font-cn text-[11px] text-ink-3 mt-0.5">已有的图片</p>
                  <input type="file" accept="image/*" onChange={pick} className="hidden" />
                </Box>
              </label>
            </div>
          </>
        )}

        {stage.kind === 'cropping' && (
          <>
            <p className="font-cn text-sm text-ink-2">
              直接拖框四角调大小，或长按框内移动位置。
              {aspect === undefined && <b className="text-accent"> 自由模式：长宽随便拉。</b>}
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-cn text-xs text-ink-2 shrink-0">比例</span>
              {ASPECT_PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  active={aspect === p.value}
                  onClick={() => switchAspect(p.value)}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
            <div className="border-2 border-ink rounded-thick bg-black p-1 flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                minWidth={30}
                minHeight={30}
              >
                <img
                  ref={imgRef}
                  src={stage.src}
                  alt="待裁剪"
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset} className="flex-1 justify-center">
                重选
              </Button>
              <Button variant="ghost" onClick={skipCrop} className="flex-1 justify-center">
                用原图
              </Button>
              <Button
                variant="primary"
                onClick={confirmCrop}
                disabled={!completedCrop}
                className="flex-[1.4] justify-center"
              >
                确认裁剪 →
              </Button>
            </div>
          </>
        )}

        {stage.kind === 'ready' && (
          <>
            <p className="font-cn text-sm text-ink-2">
              准备好了。确认上传给 AI 识别题干、选项、答案。
            </p>
            <Box variant="soft" className="p-2">
              <img src={stage.previewUrl} alt="cropped" className="w-full max-h-80 object-contain" />
              <p className="font-cn text-[11px] text-ink-3 text-center mt-1">
                {stage.file.name} · {(stage.file.size / 1024).toFixed(0)}KB
              </p>
            </Box>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset} className="flex-1 justify-center">
                重选 / 重裁
              </Button>
              <Button
                variant="primary"
                onClick={go}
                disabled={submitting}
                className="flex-[1.4] justify-center"
              >
                {submitting ? '识别中…' : '开始识别'}
              </Button>
            </div>
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
          </>
        )}

        {error && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-accent">{error}</p>
          </Box>
        )}
      </div>
    </Layout>
  );
}
