import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { StatusBadge, Button } from '../../../components/index';

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function normalize(value) {
  return String(value || '').toLowerCase();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDateLong(value) {
  if (!value) return 'TBA';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(value) {
  if (!value) return 'TBA';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function toISODate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function isSameDay(a, b) {
  return toISODate(a) === toISODate(b);
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const clampedEnd = endAngle <= startAngle ? startAngle + 0.001 : endAngle;
  const start = polarToCartesian(cx, cy, r, clampedEnd);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

/* ─────────────────────────────────────────────────────────────
   Small presentational pieces
───────────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-8 w-32 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

function CompletionBadge({ percent, isCompleted, statusLabel }) {
  if (isCompleted) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2">
        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-semibold text-emerald-700">Event Completed · 100% Complete</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-4 py-2">
      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
      <span className="text-sm font-semibold text-indigo-700 capitalize">{statusLabel} · {percent}% Complete</span>
    </div>
  );
}

function MiniBudgetBar({ percent }) {
  const color = percent > 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

function CircularTaskProgress({ percent }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (circumference * percent) / 100;

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0 -rotate-90">
      <circle cx="50" cy="50" r={r} stroke="#e2e8f0" strokeWidth="10" fill="none" />
      <circle
        cx="50" cy="50" r={r}
        stroke="#6366f1" strokeWidth="10" fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}

function ProgressDonut({ metrics, overallProgress }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg viewBox="0 0 200 200" className="w-56 h-56">
          {metrics.map((m, i) => {
            const start = i * 90 + 4;
            const end = (i + 1) * 90 - 4;
            const filledEnd = start + (end - start) * (Math.min(m.value, 100) / 100);
            return (
              <g key={m.key}>
                <path d={describeArc(100, 100, 82, start, end)} stroke="#eef2f7" strokeWidth="16" fill="none" strokeLinecap="round" />
                <path
                  d={describeArc(100, 100, 82, start, filledEnd)}
                  stroke={m.color}
                  strokeWidth="16"
                  fill="none"
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900">{overallProgress}%</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mt-1">Overall Progress</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 w-full max-w-xs">
        {metrics.map((m) => (
          <div key={m.key} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
            <span className="flex-1 truncate">{m.label}</span>
            <span className="font-semibold text-slate-800">{Math.round(m.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Sidebar: mini month calendar */
function MiniCalendar({ eventDates, deadlineDates, onSelectDate, selectedDate }) {
  const [viewDate, setViewDate] = useState(() => {
    const base = eventDates[0] ? new Date(eventDates[0]) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventSet = useMemo(() => new Set(eventDates.map(toISODate)), [eventDates]);
  const deadlineSet = useMemo(() => new Set(deadlineDates.map(toISODate)), [deadlineDates]);

  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-slate-800">
          {viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="text-[10px] font-semibold uppercase text-slate-400">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const iso = toISODate(date);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const hasEvent = eventSet.has(iso);
          const hasDeadline = deadlineSet.has(iso);

          return (
            <button
              key={i}
              onClick={() => onSelectDate(date)}
              className={`relative aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-colors
                ${isSelected ? 'bg-indigo-500 text-white font-semibold' : isToday ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {date.getDate()}
              {(hasEvent || hasDeadline) && (
                <span className="flex gap-0.5 mt-0.5">
                  {hasEvent && <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-500'}`} />}
                  {hasDeadline && <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Event date</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Task deadline</span>
      </div>
    </div>
  );
}

/* Sidebar: upcoming timeline built from real task deadlines */
function UpcomingTimeline({ items }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">No upcoming deadlines.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{item.title}</p>
            <p className="text-xs text-slate-400">{item.dayLabel} · {formatDateShort(item.deadline)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

export default function OverviewTab({ event, stats }) {
  const eventId = event?.id;

  const [tasks, setTasks] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;

    async function load() {
      setDataLoading(true);
      const [tasksRes, budgetsRes, coverageRes, volunteersRes, scheduleRes] = await Promise.allSettled([
        supabase.from('tasks').select('id, title, status, priority, deadline').eq('event_id', eventId),
        supabase.from('budgets').select('estimated_amount, total_amount, category').eq('event_id', eventId),
        supabase.from('coverage').select('id, status, classroom_id, batch').eq('event_id', eventId),
        supabase.from('volunteers').select('id, status').eq('event_id', eventId),
        supabase.from('event_schedules').select('id, time_slot, title, sort_order').eq('event_id', eventId).order('sort_order', { ascending: true }),
      ]);

      if (!mounted) return;
      setTasks(tasksRes.status === 'fulfilled' ? (tasksRes.value.data || []) : []);
      setBudgets(budgetsRes.status === 'fulfilled' ? (budgetsRes.value.data || []) : []);
      setCoverage(coverageRes.status === 'fulfilled' ? (coverageRes.value.data || []) : []);
      setVolunteers(volunteersRes.status === 'fulfilled' ? (volunteersRes.value.data || []) : []);
      setSchedule(scheduleRes.status === 'fulfilled' ? (scheduleRes.value.data || []) : []);
      setDataLoading(false);
    }

    load();

    const channel = supabase
      .channel(`event-overview-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `event_id=eq.${eventId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `event_id=eq.${eventId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coverage', filter: `event_id=eq.${eventId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers', filter: `event_id=eq.${eventId}` }, load)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  /* ── Derived analytics (all computed from real rows, nothing hardcoded) ── */

  const taskCounts = useMemo(() => {
    return tasks.reduce(
      (acc, t) => {
        const s = normalize(t.status);
        if (s === 'completed') acc.completed++;
        else if (s === 'cancelled') acc.cancelled++;
        else acc.pending++; // pending + in_progress
        return acc;
      },
      { completed: 0, pending: 0, cancelled: 0 }
    );
  }, [tasks]);

  const activeTaskTotal = taskCounts.completed + taskCounts.pending;
  const taskCompletionPct = activeTaskTotal ? Math.round((taskCounts.completed / activeTaskTotal) * 100) : 0;
  const taskPendingPct = activeTaskTotal ? Math.round((taskCounts.pending / activeTaskTotal) * 100) : 0;

  const coverageCounts = useMemo(() => {
    return coverage.reduce(
      (acc, c) => {
        const s = normalize(c.status);
        if (s === 'covered') acc.covered++;
        else if (s === 'missed') acc.missed++;
        else acc.pending++;
        return acc;
      },
      { covered: 0, pending: 0, missed: 0 }
    );
  }, [coverage]);

  const coverageTotal = coverageCounts.covered + coverageCounts.pending + coverageCounts.missed;
  const coveragePct = coverageTotal ? Math.round((coverageCounts.covered / coverageTotal) * 100) : 0;

  const activeVolunteers = volunteers.filter((v) => normalize(v.status) === 'active').length;
  const requiredVolunteers = event?.max_volunteers || 0;
  const availableSlots = Math.max(requiredVolunteers - activeVolunteers, 0);

  const allocatedBudget = Number(event?.total_budget) > 0
    ? Number(event.total_budget)
    : budgets.reduce((sum, b) => sum + Number(b.estimated_amount || 0), 0);
  const spentBudget = budgets.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const remainingBudget = allocatedBudget - spentBudget;
  const budgetUsagePct = allocatedBudget ? Math.round((spentBudget / allocatedBudget) * 100) : 0;

  const isCompleted =
    normalize(event?.status) === 'completed' ||
    (event?.end_date && new Date(event.end_date) < new Date());

  const overallProgress = isCompleted
    ? 100
    : Math.round(event?.coverage_enabled ? (taskCompletionPct + coveragePct) / 2 : taskCompletionPct);

  const donutMetrics = [
    { key: 'tasksCompleted', label: 'Completed Tasks', value: taskCompletionPct, color: '#10b981' },
    { key: 'tasksPending', label: 'Pending Tasks', value: taskPendingPct, color: '#f59e0b' },
    { key: 'coverage', label: 'Coverage Completed', value: event?.coverage_enabled ? coveragePct : 0, color: '#6366f1' },
    { key: 'budget', label: 'Budget Used', value: Math.min(budgetUsagePct, 100), color: '#8b5cf6' },
  ];

  /* Calendar dates — only real date fields are used (event dates + task deadlines).
     event_schedules has no date column (only a free-text time_slot), so it can't be
     placed on the calendar; it's surfaced separately below instead of guessed at. */
  const eventDates = [event?.date, event?.end_date].filter(Boolean);
  const deadlineDates = tasks.map((t) => t.deadline).filter(Boolean);

  const upcomingTimeline = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) => t.deadline && normalize(t.status) !== 'completed' && normalize(t.status) !== 'cancelled')
      .map((t) => ({ ...t, deadlineDate: new Date(t.deadline) }))
      .filter((t) => t.deadlineDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => a.deadlineDate - b.deadlineDate)
      .slice(0, 5)
      .map((t) => {
        let dayLabel = t.deadlineDate.toLocaleDateString('en-IN', { weekday: 'long' });
        if (isSameDay(t.deadlineDate, now)) dayLabel = 'Today';
        else if (isSameDay(t.deadlineDate, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))) dayLabel = 'Tomorrow';
        return { id: t.id, title: t.title, deadline: t.deadline, dayLabel };
      });
  }, [tasks]);

  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return null;
    const items = [];
    if (event?.date && isSameDay(event.date, selectedDate)) items.push({ label: 'Event start date', tone: 'violet' });
    if (event?.end_date && isSameDay(event.end_date, selectedDate)) items.push({ label: 'Event end date', tone: 'violet' });
    tasks
      .filter((t) => t.deadline && isSameDay(t.deadline, selectedDate))
      .forEach((t) => items.push({ label: `Deadline: ${t.title}`, tone: 'amber' }));
    return items;
  }, [selectedDate, event, tasks]);

  const insights = useMemo(() => {
    const list = [];
    list.push(
      budgetUsagePct > 90
        ? { ok: false, text: 'Budget usage is over 90% of allocation' }
        : { ok: true, text: 'Budget within limit' }
    );
    list.push(
      taskCounts.pending > 0
        ? { ok: false, text: `${taskCounts.pending} pending task${taskCounts.pending === 1 ? '' : 's'}` }
        : { ok: true, text: 'All tasks completed' }
    );
    if (event?.coverage_enabled) {
      list.push(
        coverageTotal > 0 && coveragePct === 100
          ? { ok: true, text: 'Room allocation completed' }
          : { ok: false, text: `${coverageCounts.pending + coverageCounts.missed} room(s) not yet covered` }
      );
    }
    if (requiredVolunteers > 0) {
      list.push(
        activeVolunteers < requiredVolunteers
          ? { ok: false, text: 'Volunteer count below target' }
          : { ok: true, text: 'Volunteer target met' }
      );
    }
    return list;
  }, [budgetUsagePct, taskCounts, event, coverageTotal, coveragePct, coverageCounts, requiredVolunteers, activeVolunteers]);

  return (
    <div className="space-y-6 py-2">
      {/* ── Event Health Summary ── */}
      <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-slate-800">{event?.name}</h2>
              <StatusBadge status={event?.status} size="sm" />
              <StatusBadge status={event?.type} size="xs" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span>{formatDateLong(event?.date)}</span>
              {event?.location && <span>· {event.location}</span>}
            </div>
          </div>
          <CompletionBadge percent={overallProgress} isCompleted={isCompleted} statusLabel={event?.status} />
        </div>
      </div>

      {/* ── Completed event banner ── */}
      {isCompleted && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-base font-bold text-emerald-800">Event Successfully Completed</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-600/70">Budget Used</p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">{formatCurrency(spentBudget)} / {formatCurrency(allocatedBudget)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-600/70">Tasks Completed</p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">{taskCounts.completed} / {activeTaskTotal}</p>
            </div>
            {event?.coverage_enabled && (
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600/70">Coverage</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">{coveragePct}%</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-600/70">Volunteers</p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">{activeVolunteers} / {requiredVolunteers || '—'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health cards */}
          {dataLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Budget card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-sm font-medium text-slate-500 mb-3">Budget</p>
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Allocated</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(allocatedBudget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Spent</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(spentBudget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Remaining</span>
                    <span className={`font-semibold ${remainingBudget < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(remainingBudget)}</span>
                  </div>
                </div>
                <MiniBudgetBar percent={budgetUsagePct} />
                <p className="mt-1.5 text-right text-xs text-slate-400">{budgetUsagePct}% utilized</p>
              </div>

              {/* Tasks card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-sm font-medium text-slate-500 mb-3">Tasks</p>
                <div className="flex items-center gap-4">
                  <CircularTaskProgress percent={taskCompletionPct} />
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-slate-800">{taskCounts.completed} / {activeTaskTotal} Completed</p>
                    <p className="text-xs text-slate-400">{taskCompletionPct}% complete</p>
                    <p className="text-xs text-amber-600">{taskCounts.pending} pending</p>
                  </div>
                </div>
              </div>

              {/* Coverage card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-sm font-medium text-slate-500 mb-3">Coverage</p>
                {!event?.coverage_enabled ? (
                  <p className="text-sm text-slate-400 py-4">Coverage tracking is not enabled for this event.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <p className="text-lg font-bold text-slate-800">{coverageTotal}</p>
                        <p className="text-xs text-slate-400">Assigned</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-600">{coverageCounts.covered}</p>
                        <p className="text-xs text-slate-400">Completed</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-amber-600">{coverageCounts.pending + coverageCounts.missed}</p>
                        <p className="text-xs text-slate-400">Pending</p>
                      </div>
                    </div>
                    <MiniBudgetBar percent={coveragePct} />
                    <p className="mt-1.5 text-right text-xs text-slate-400">{coveragePct}% covered</p>
                  </>
                )}
              </div>

              {/* Volunteers card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-sm font-medium text-slate-500 mb-3">Volunteers</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-lg font-bold text-slate-800">{requiredVolunteers || '—'}</p>
                    <p className="text-xs text-slate-400">Required</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-indigo-600">{activeVolunteers}</p>
                    <p className="text-xs text-slate-400">Assigned</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{availableSlots}</p>
                    <p className="text-xs text-slate-400">Available</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress donut */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">Event Progress</h3>
            {dataLoading ? (
              <div className="h-56 w-56 mx-auto rounded-full bg-slate-100 animate-pulse" />
            ) : (
              <ProgressDonut metrics={donutMetrics} overallProgress={overallProgress} />
            )}
          </div>

          {/* Description */}
          <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">About this Event</h3>
            <p className="text-slate-700 leading-relaxed">{event?.description || 'No description provided for this event.'}</p>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6 lg:sticky lg:top-6 self-start">
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Calendar</h3>
            <MiniCalendar
              eventDates={eventDates}
              deadlineDates={deadlineDates}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />
            {selectedDateItems && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {selectedDateItems.length === 0 ? (
                  <p className="text-xs text-slate-400">No scheduled items on this date.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {selectedDateItems.map((item, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${item.tone === 'violet' ? 'bg-violet-500' : 'bg-amber-500'}`} />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Upcoming Timeline</h3>
            <UpcomingTimeline items={upcomingTimeline} />
          </div>

          {schedule.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Agenda</h3>
              <ol className="space-y-2">
                {schedule.map((item) => (
                  <li key={item.id} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-xs font-medium text-indigo-500 shrink-0">{item.time_slot}</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Insights</h3>
            <ul className="space-y-2.5">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={insight.ok ? 'text-emerald-500' : 'text-amber-500'}>{insight.ok ? '✓' : '⚠'}</span>
                  <span className="text-slate-600">{insight.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}