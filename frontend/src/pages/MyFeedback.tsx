import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type FeedbackRow } from '../api/client';
import { Box } from '../components/Box';
import { Layout } from '../components/Layout';

export function MyFeedback() {
  const nav = useNavigate();
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    api.listFeedback()
      .then((r) => setRows(r.feedbacks))
      .catch((e) => {
        setError(String(e));
        setRows([]);
      });
  }, []);

  return (
    <Layout title="我的反馈" back={() => nav('/me')}>
      <div className="space-y-3">
        {error && <p className="font-cn text-xs text-accent break-words">{error}</p>}

        {rows === null && <p className="font-cn text-sm text-ink-3">加载中…</p>}

        {rows && rows.length === 0 && (
          <Box variant="dashed" className="p-4 text-center">
            <p className="font-cn text-sm text-ink-2">还没提交过反馈</p>
            <p className="font-cn text-xs text-ink-3 mt-1">遇到 bug 或想要新功能, 随时点右上角 💬 反馈</p>
          </Box>
        )}

        {rows && rows.length > 0 && (
          <>
            <p className="font-cn text-xs text-ink-3">最近 {rows.length} 条</p>
            {rows.map((r) => (
              <Box key={r.id} variant="thick" className="p-3 bg-paper">
                <p className="font-cn text-[11px] text-ink-3 mb-1">{formatTime(r.createdAt)}</p>
                <p className="font-cn text-sm whitespace-pre-wrap leading-relaxed">{r.content}</p>
                {r.context?.imageDataUrls && r.context.imageDataUrls.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {r.context.imageDataUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`截图 ${idx + 1}`}
                        onClick={() => setLightbox(url)}
                        className="w-full aspect-square object-cover border border-ink rounded cursor-zoom-in"
                      />
                    ))}
                  </div>
                )}
              </Box>
            ))}
          </>
        )}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50"
        >
          <img src={lightbox} alt="放大" className="max-w-full max-h-full border-2 border-white rounded-thick" />
        </div>
      )}
    </Layout>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} 小时前`;
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
