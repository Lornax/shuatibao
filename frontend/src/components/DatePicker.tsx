import { useMemo, useState } from 'react';
import {
  formatDatePickerDisplay,
  formatDatePickerMonth,
  formatDatePickerTodayAction,
  getDatePickerWeekLabels,
  useLanguage,
} from '../i18n';

type Props = {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void;
  placeholder?: string;
};

/**
 * 手绘风内联月历日期选择器. 替换原生 input[type=date], 避免手机墨绿系统色 / 桌面白底原生组件
 * 跟工具整体手绘纸张风脱节. 月视图 + 周末标红 + 今日虚框 + 选中黄底.
 */
export function DatePicker({ value, onChange, placeholder = '选考试日期…' }: Props) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const initial = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState<number>(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initial.getMonth());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const selectedDate = value ? new Date(value) : null;
  if (selectedDate) selectedDate.setHours(0, 0, 0, 0);

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // 周一为 0
    const cells: { day: number; month: number; year: number; dim: boolean }[] = [];
    for (let i = startWeekday; i > 0; i--) {
      const d = new Date(viewYear, viewMonth, 1 - i);
      cells.push({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), dim: true });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ day: d, month: viewMonth, year: viewYear, dim: false });
    }
    let next = 1;
    while (cells.length < 42) {
      const d = new Date(viewYear, viewMonth + 1, next);
      cells.push({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), dim: true });
      next++;
    }
    return cells;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }
  function prevYear() { setViewYear((y) => y - 1); }
  function nextYear() { setViewYear((y) => y + 1); }
  function jumpToToday() {
    setViewYear(todayY);
    setViewMonth(todayM);
  }
  const isViewingToday = viewYear === todayY && viewMonth === todayM;
  const weekLabels = getDatePickerWeekLabels(language);
  function pick(c: { year: number; month: number; day: number }) {
    const m = String(c.month + 1).padStart(2, '0');
    const d = String(c.day).padStart(2, '0');
    onChange(`${c.year}-${m}-${d}`);
    setOpen(false);
  }
  function clear() {
    onChange('');
    setOpen(false);
  }

  const display = useMemo(() => {
    if (!selectedDate) return null;
    const daysDiff = Math.round((selectedDate.getTime() - today.getTime()) / 86400000);
    return {
      text: formatDatePickerDisplay(selectedDate, language),
      dDay: daysDiff >= 0 ? `D-${daysDiff}` : `+${-daysDiff}d`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, language]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full border-2 border-ink rounded-thick bg-white px-3 py-2 flex justify-between items-center"
      >
        {display ? (
          <>
            <span className="font-handBold text-sm">{display.text}</span>
            <span className="bg-accent text-white px-2 py-0.5 rounded-md text-xs font-handBold border border-ink">
              {display.dDay}
            </span>
          </>
        ) : (
          <span className="font-cn text-sm text-ink-3">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="mt-2 border-2 border-ink rounded-thick bg-paper p-3">
          <div className="flex items-center gap-1 mb-2">
            <button
              type="button"
              onClick={prevYear}
              className="w-8 h-8 border border-ink rounded-md bg-white font-handBold text-base leading-none"
              aria-label={language === 'en' ? 'Previous year' : '上一年'}
              title={language === 'en' ? 'Previous year' : '上一年'}
            >
              «
            </button>
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 border border-ink rounded-md bg-white font-handBold text-base leading-none"
              aria-label={language === 'en' ? 'Previous month' : '上月'}
              title={language === 'en' ? 'Previous month' : '上月'}
            >
              ‹
            </button>
            <span className="flex-1 text-center font-display text-xl font-bold leading-none">
              {formatDatePickerMonth(viewYear, viewMonth, language)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 border border-ink rounded-md bg-white font-handBold text-base leading-none"
              aria-label={language === 'en' ? 'Next month' : '下月'}
              title={language === 'en' ? 'Next month' : '下月'}
            >
              ›
            </button>
            <button
              type="button"
              onClick={nextYear}
              className="w-8 h-8 border border-ink rounded-md bg-white font-handBold text-base leading-none"
              aria-label={language === 'en' ? 'Next year' : '下一年'}
              title={language === 'en' ? 'Next year' : '下一年'}
            >
              »
            </button>
          </div>

          <div className="grid grid-cols-7 text-[10px] text-ink-3 text-center mb-1 font-cn">
            {weekLabels.map((w, i) => (
              <div key={w} className={i >= 5 ? 'text-accent' : ''}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((c, i) => {
              const isToday = c.year === todayY && c.month === todayM && c.day === todayD;
              const isSelected = !!selectedDate &&
                c.year === selectedDate.getFullYear() &&
                c.month === selectedDate.getMonth() &&
                c.day === selectedDate.getDate();
              const weekday = new Date(c.year, c.month, c.day).getDay();
              const isWeekend = weekday === 0 || weekday === 6;
              const classes = [
                'aspect-square rounded-md text-sm flex items-center justify-center font-handBold',
                c.dim ? 'text-ink-3' : (isWeekend ? 'text-accent' : ''),
                isToday && !isSelected ? 'border-[1.5px] border-dashed border-ink' : '',
                isSelected ? 'bg-accent-2 border-2 border-ink font-bold' : '',
                !isToday && !isSelected ? 'border-[1.5px] border-transparent' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(c)}
                  className={classes}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-dashed border-ink-3 flex justify-between items-center text-[11px] font-cn">
            <button
              type="button"
              onClick={jumpToToday}
              disabled={isViewingToday}
              className="text-accent-3 underline text-[11px] disabled:no-underline disabled:text-ink-3"
            >
              {formatDatePickerTodayAction(today, isViewingToday, language)}
            </button>
            {value && (
              <button
                type="button"
                onClick={clear}
                className="text-accent underline text-[11px]"
              >
                {language === 'en' ? '× Clear date' : '× 清空日期'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
