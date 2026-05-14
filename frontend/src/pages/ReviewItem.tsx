import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ImportJob } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { ConfirmOne } from './QuestionConfirm';

export function ReviewItem() {
  const { pid, jid, idx: idxStr } = useParams<{ pid: string; jid: string; idx: string }>();
  const nav = useNavigate();
  const idx = Number.parseInt(idxStr ?? '', 10);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pid || !jid) return;
    api.getImportJob(pid, jid).then(setJob).catch((e) => setError(String(e)));
  }, [pid, jid]);

  async function removeAndBack() {
    if (!job || !pid || !jid) return;
    const next = job.candidates.filter((_, i) => i !== idx);
    try {
      await api.patchImportJob(pid, jid, next);
    } catch (e) {
      setError(String(e));
      return;
    }
    // empty queue → backend auto-dropped the row; go straight to profile
    if (next.length === 0) {
      nav(`/profiles/${pid}`, { replace: true });
    } else {
      nav(`/profiles/${pid}/import-jobs/${jid}/review`, { replace: true });
    }
  }

  if (!job) {
    return (
      <Layout title="加载中" back={() => nav(`/profiles/${pid}/import-jobs/${jid}/review`)}>
        <Box variant="dashed" className="p-3">
          <p className="font-cn text-sm text-ink-2">{error ?? '加载中...'}</p>
        </Box>
      </Layout>
    );
  }

  if (Number.isNaN(idx) || idx < 0 || idx >= job.candidates.length) {
    return (
      <Layout title="审核" back={() => nav(`/profiles/${pid}/import-jobs/${jid}/review`)}>
        <Box variant="dashed" className="p-3">
          <p className="font-cn text-sm text-ink-2">这一条已经处理过了。</p>
          <Button
            variant="primary"
            onClick={() => nav(`/profiles/${pid}/import-jobs/${jid}/review`, { replace: true })}
            className="w-full justify-center mt-2"
          >
            回待审队列
          </Button>
        </Box>
      </Layout>
    );
  }

  const candidate = job.candidates[idx];

  return (
    <Layout
      title={`审核 ${idx + 1}/${job.candidates.length}`}
      back={() => nav(`/profiles/${pid}/import-jobs/${jid}/review`)}
    >
      <ConfirmOne
        pid={pid!}
        candidate={candidate}
        source="pdf"
        bulkMode="none"
        onSavedNext={removeAndBack}
        onSkip={removeAndBack}
      />
      {error && (
        <Box variant="dashed" className="p-2 border-accent mt-2">
          <p className="font-cn text-xs text-accent break-words">{error}</p>
        </Box>
      )}
    </Layout>
  );
}
