import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Input, Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

const dailyChips: { label: string; minutes: number }[] = [
  { label: '<30 min', minutes: 20 },
  { label: '1 小时', minutes: 60 },
  { label: '2 小时', minutes: 120 },
  { label: '>3 小时', minutes: 180 },
];

export function ProfileCreate() {
  const nav = useNavigate();
  const [examName, setExamName] = useState('NPDP');
  const [target, setTarget] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!examName.trim()) {
      setError('考试名称必填');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createProfile({
        examName: examName.trim(),
        target: target.trim() || undefined,
        examDate: examDate ? new Date(examDate).toISOString() : undefined,
        dailyMinutes,
      });
      nav(`/profiles/${created.id}`, { replace: true });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="新建档案" back={() => nav(-1)}>
      <div className="space-y-3">
        <div>
          <label className="font-cn font-bold text-sm block mb-1">考试名称</label>
          <Input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="NPDP" />
        </div>

        <div>
          <label className="font-cn font-bold text-sm block mb-1">目标</label>
          <Textarea value={target} onChange={(e) => setTarget(e.target.value)} placeholder="例：60 分通过" />
        </div>

        <div>
          <label className="font-cn font-bold text-sm block mb-1">考试日期</label>
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>

        <div>
          <label className="font-cn font-bold text-sm block mb-1">每天能投入</label>
          <div className="flex gap-1 flex-wrap">
            {dailyChips.map((c) => (
              <Chip key={c.minutes} active={dailyMinutes === c.minutes} onClick={() => setDailyMinutes(c.minutes)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {error && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-accent">{error}</p>
          </Box>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={() => nav(-1)} className="flex-1 justify-center">
            取消
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting} className="flex-[1.4] justify-center">
            {submitting ? '建档中...' : '建档 ✓'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
