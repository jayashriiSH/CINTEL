import { useMemo } from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function DashboardHeader({ title, subtitle, userName, roleLabel }) {
  const initials = useMemo(() => {
    if (!userName) return "CC";
    const parts = userName.split(" ").filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "CC";
  }, [userName]);

  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3 self-start rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:self-auto">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{userName || "Club User"}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export function StatGrid({ children }) {
  return <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</section>;
}

export function StatCard({ title, value, icon, tone = "blue", helper }) {
  const toneMap = {
    blue: "border-cyan-100 bg-cyan-50 text-cyan-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    purple: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700",
    orange: "border-amber-100 bg-amber-50 text-amber-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl border", toneMap[tone])}>{icon}</div>
      </div>
    </article>
  );
}

export function DashboardSection({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || "planned").toLowerCase();
  const colorMap = {
    planned: "bg-cyan-50 text-cyan-700 border-cyan-200",
    ongoing: "bg-violet-50 text-violet-700 border-violet-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delayed: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        colorMap[normalized] || "bg-slate-50 text-slate-700 border-slate-200"
      )}
    >
      {normalized}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const normalized = String(priority || "medium").toLowerCase();
  const colorMap = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        colorMap[normalized] || colorMap.medium
      )}
    >
      {normalized}
    </span>
  );
}

export function ProgressBar({ value, color = "cyan" }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const colorMap = {
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
  };

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full transition-all", colorMap[color] || colorMap.cyan)} style={{ width: `${safeValue}%` }} />
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="grid min-h-24 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
      {message}
    </div>
  );
}
