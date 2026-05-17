import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Input, Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

const dailyMinChips: { label: string; minutes: number }[] = [
  { label: '<30 min', minutes: 20 },
  { label: '1 小时', minutes: 60 },
  { label: '2 小时', minutes: 120 },
  { label: '>3 小时', minutes: 180 },
];

const dailyQuestionChips: { label: string; n: number }[] = [
  { label: '5 道', n: 5 },
  { label: '10 道', n: 10 },
  { label: '20 道', n: 20 },
  { label: '50 道', n: 50 },
];

// Same component handles both create (no :pid in URL) and edit (/profiles/:pid/edit).
export function ProfileCreate() {
  const nav = useNavigate();
  const { pid } = useParams<{ pid?: string }>();
  const isEdit = !!pid;

  const [examName, setExamName] = useState('NPDP');
  const [target, setTarget] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [dailyQuestions, setDailyQuestions] = useState(20);
  const [goalType, setGoalType] = useState<'minutes' | 'questions'>('minutes');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !pid) return;
    api
      .getProfile(pid)
      .then((p) => {
        setExamName(p.examName);
        setTarget(p.target ?? '');
        setExamDate(p.examDate ? p.examDate.slice(0, 10) : '');
        setDailyMinutes(p.dailyMinutes);
        setDailyQuestions(p.dailyQuestions);
        setGoalType(p.goalType);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [pid, isEdit]);

  async function submit() {
    if (!examName.trim()) {
      setError('考试名称必填');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && pid) {
        await api.patchProfile(pid, {
          examName: examName.trim(),
          target: target.trim() || null,
          examDate: examDate ? new Date(examDate).toISOString() : null,
          dailyMinutes,
          dailyQuestions,
          goalType,
        });
        nav(`/profiles/${pid}`, { replace: true });
      } else {
        const created = await api.createProfile({
          examName: examName.trim(),
          target: target.trim() || undefined,
          examDate: examDate ? new Date(examDate).toISOString() : undefined,
          dailyMinutes,
          dailyQuestions,
          goalType,
        });
        nav(`/profiles/${created.id}`, { replace: true });
      }
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout title="加载中" back={() => nav(-1)}>
        <p className="font-cn text-sm text-ink-2">加载档案...</p>
      </Layout>
    );
  }

  return (
    <Layout title={isEdit ? '编辑档案' : '新建档案'} back={() => nav(-1)}>
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
          <label className="font-cn font-bold text-sm block mb-1">每日目标</label>
          <div className="flex gap-1 mb-2">
            <Chip active={goalType === 'minutes'} onClick={() => setGoalType('minutes')}>
              ⏱ 按时长
            </Chip>
            <Chip active={goalType === 'questions'} onClick={() => setGoalType('questions')}>
              📝 按题数
            </Chip>
          </div>
          {goalType === 'minutes' ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={720}
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Math.max(5, Math.min(720, Number(e.target.value) || 0)))}
                />
                <span className="font-cn text-sm text-ink-2 shrink-0">分钟 / 天</span>
              </div>
              <div className="flex gap-1 flex-wrap mt-2">
                {dailyMinChips.map((c) => (
                  <Chip
                    key={c.minutes}
                    active={dailyMinutes === c.minutes}
                    onClick={() => setDailyMinutes(c.minutes)}
                  >
                    {c.label}
                  </Chip>
                ))}
                <span className="font-cn text-[11px] text-ink-3 self-center ml-1">← 快捷点选</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={dailyQuestions}
                  onChange={(e) => setDailyQuestions(Math.max(1, Math.min(500, Number(e.target.value) || 0)))}
                />
                <span className="font-cn text-sm text-ink-2 shrink-0">题 / 天</span>
              </div>
              <div className="flex gap-1 flex-wrap mt-2">
                {dailyQuestionChips.map((c) => (
                  <Chip
                    key={c.n}
                    active={dailyQuestions === c.n}
                    onClick={() => setDailyQuestions(c.n)}
                  >
                    {c.label}
                  </Chip>
                ))}
                <span className="font-cn text-[11px] text-ink-3 self-center ml-1">← 快捷点选</span>
              </div>
            </>
          )}
          <p className="font-cn text-[11px] text-ink-3 mt-1">
            可手填或点 chip 快捷填入。主页只显示这个维度的进度条
          </p>
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
            {submitting ? (isEdit ? '保存中...' : '建档中...') : isEdit ? '保存 ✓' : '建档 ✓'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
