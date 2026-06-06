import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { compressImage } from '../utils/image';

const MAX_IMAGES = 4;

/**
 * 全局反馈入口. 挂在 Layout header 右上角.
 * 用户写完文字 (可选附最多 4 张截图) 提交时自动带 url / userAgent / viewport.
 * 截图压到 1200px / jpeg q=0.8 后塞 context.imageDataUrls (string[]), 不走 COS.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  async function pickImages(files: FileList) {
    setError(null);
    const remaining = MAX_IMAGES - imageDataUrls.length;
    if (remaining <= 0) return;
    const arr = Array.from(files).slice(0, remaining);
    try {
      // bug 截图重点是看 UI 元素, 不需要清晰度. 600px / q=0.6 每张 ~40-80KB,
      // 4 张总 payload < 400KB, 手机 4G 上传 < 2s.
      const dataUrls = await Promise.all(arr.map((f) => compressImage(f, 600, 0.6)));
      setImageDataUrls((prev) => [...prev, ...dataUrls]);
    } catch (e) {
      setError(`图片读取失败: ${e}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeImage(idx: number) {
    setImageDataUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    const content = text.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError(null);
    // 20 秒超时, 避免手机弱网时用户看到"卡死无回应"
    const timer = setTimeout(() => {
      setError('提交超时，可能是网络太慢或图片太大。请重试或先不传图');
      setSubmitting(false);
    }, 20000);
    try {
      await api.postFeedback({
        kind: 'user_text',
        content,
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          referrer: document.referrer,
          imageDataUrls: imageDataUrls.length > 0 ? imageDataUrls : undefined,
        },
      });
      clearTimeout(timer);
      setDone(true);
      setText('');
      setImageDataUrls([]);
      // 2.5 秒后自动关闭, 让用户读完感谢语
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 2500);
    } catch (e) {
      clearTimeout(timer);
      setError(`提交失败: ${e}`);
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
    }
  }

  function close() {
    if (submitting) return;
    setOpen(false);
    setError(null);
  }

  const canAddMore = imageDataUrls.length < MAX_IMAGES;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border-2 border-ink rounded-thick px-2 py-1 text-xs font-cn bg-white hover:bg-chip-cream"
        aria-label="反馈"
        title="反馈 bug 或建议"
      >
        💬 反馈
      </button>

      {open && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-paper border-2 border-ink rounded-thick p-4 w-full max-w-sm"
          >
            {done ? (
              <p className="font-cn text-center py-6 text-ink">
                ✓ 已收到，会尽快处理<br />
                感谢支持 🙏
              </p>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="font-handBold text-xl">反馈 bug 或建议</h3>
                  <button
                    onClick={() => { setOpen(false); nav('/me/feedback'); }}
                    className="font-cn text-[11px] text-accent-3 underline"
                  >
                    📋 我提交过的
                  </button>
                </div>
                <p className="font-cn text-xs text-ink-3 mb-3">
                  遇到什么问题、不顺手的地方、或者想要什么功能都可以写
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="例：拍照识题后保存按钮点不动；想要导出所有错题到 PDF…"
                  className="w-full border-[1.5px] border-ink rounded-lg bg-white px-3 py-2 font-cn text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) pickImages(e.target.files);
                  }}
                />

                <div className="mt-2">
                  <p className="font-cn text-[11px] text-ink-3 mb-1.5">
                    附截图（可选，最多 {MAX_IMAGES} 张）
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {imageDataUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square">
                        <img
                          src={url}
                          alt={`截图 ${idx + 1}`}
                          className="w-full h-full object-cover border-2 border-ink rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-white text-xs font-bold border border-ink flex items-center justify-center"
                          aria-label="移除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {canAddMore && (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-ink-3 rounded-lg bg-paper hover:bg-chip-cream text-ink-3 text-2xl font-handBold flex items-center justify-center"
                        aria-label="添加截图"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <p className="font-cn text-xs text-accent mt-2 break-words">{error}</p>
                )}
                <div className="flex gap-2 justify-end mt-3">
                  <button
                    onClick={close}
                    disabled={submitting}
                    className="border-2 border-ink rounded-thick px-3 py-1.5 text-sm font-cn bg-white disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={submit}
                    disabled={!text.trim() || submitting}
                    className="border-2 border-ink rounded-thick px-3 py-1.5 text-sm font-cn bg-accent text-white disabled:opacity-50"
                  >
                    {submitting ? '⏳ 上传中（最长 20 秒）' : '提交'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
