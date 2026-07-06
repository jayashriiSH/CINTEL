/**
 * Cintel Club — Prebuilt UI Components
 * =====================================
 * All shared UI components are exported from this barrel file.
 * Module developers should ONLY import from here.
 */

// ─── StatusBadge ───────────────────────────────────────────────
export function StatusBadge({ status, size = 'sm' }) {
  const colorMap = {
    completed: 'bg-emerald-100 text-emerald-700',
    active: 'bg-blue-100 text-blue-700',
    upcoming: 'bg-violet-100 text-violet-700',
    cancelled: 'bg-red-100 text-red-700',
    assigned: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-cyan-100 text-cyan-700',
    done: 'bg-emerald-100 text-emerald-700',
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
    draft: 'bg-gray-100 text-gray-600',
  };

  const sizeMap = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const colors = colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
  const sizeClass = sizeMap[size] || sizeMap.sm;

  return (
    <span className={`inline-flex items-center font-medium rounded-full capitalize ${colors} ${sizeClass}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ─── StatCard ──────────────────────────────────────────────────
export function StatCard({ title, value, icon, trend, color = 'primary' }) {
  const colorMap = {
    primary: 'from-indigo-500 to-indigo-600',
    success: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    info: 'from-cyan-500 to-cyan-600',
    danger: 'from-red-500 to-red-600',
    purple: 'from-violet-500 to-violet-600',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        {icon && (
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[color]} text-white shadow-lg`}>
            <span className="text-xl">{icon}</span>
          </div>
        )}
      </div>
      <div className={`absolute -bottom-2 -right-2 h-24 w-24 rounded-full bg-gradient-to-br ${colorMap[color]} opacity-5`} />
    </div>
  );
}

// ─── TabNav ────────────────────────────────────────────────────
export function TabNav({ tabs, activeTab, onTabChange }) {
  return (
    <div className="border-b border-slate-200">
      <nav className="flex gap-1 overflow-x-auto px-1 -mb-px" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`
              whitespace-nowrap px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200
              ${activeTab === tab.key
                ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────
export function Table({ columns, data, emptyMessage = 'No data available' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr key={row.id || idx} className="hover:bg-slate-50/50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SearchInput ───────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
      />
    </div>
  );
}

// ─── Select ────────────────────────────────────────────────────
export function Select({ value, onChange, options, placeholder = 'Select...' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-700 appearance-none cursor-pointer min-w-[140px]"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Button ────────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }) {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-sm shadow-indigo-200',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-sm shadow-emerald-200',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-sm shadow-red-200',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </button>
  );
}

// ─── Modal ─────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-white rounded-2xl shadow-2xl p-6 animate-in`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Loader ────────────────────────────────────────────────────
export function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-10 w-10 rounded-full border-3 border-slate-200 border-t-indigo-500 animate-spin" />
      <p className="mt-4 text-sm text-slate-400">{text}</p>
    </div>
  );
}

// ─── ErrorState ────────────────────────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-400 mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-sm text-slate-600 mb-3">{message || 'Something went wrong'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

// ─── PageHeader ────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ─── EmptyState ────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
          <span className="text-2xl">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Additional shared components (integrated from teammate's code)
// ═══════════════════════════════════════════════════════════════

// ─── Avatar ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
  "bg-indigo-500", "bg-rose-500",
];

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name = "") {
  let hash = 0;
  for (let c of name) hash += c.charCodeAt(0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Avatar({ name = "", size = "md", className = "" }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base", xl: "w-16 h-16 text-xl" };
  return (
    <div className={`${sizes[size]} ${getAvatarColor(name)} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  );
}

// ─── ProgressBar ───────────────────────────────────────────────
export function ProgressBar({ value = 0, color = "blue", showLabel = false }) {
  const colors = { blue: "bg-blue-500", green: "bg-green-500", red: "bg-red-500", indigo: "bg-indigo-500" };
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`${colors[color] || colors.blue} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>}
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────
export function Card({ children, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm ${onClick ? "cursor-pointer hover:shadow-md hover:border-blue-200 transition-all" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── InputField ────────────────────────────────────────────────
export function InputField({ label, value, onChange, type = "text", placeholder = "", required = false, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
      />
    </div>
  );
}

// ─── TextareaField ─────────────────────────────────────────────
export function TextareaField({ label, value, onChange, placeholder = "", rows = 3, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
      />
    </div>
  );
}

// ─── SkillTags ─────────────────────────────────────────────────
export function SkillTags({ skills = "" }) {
  const list = typeof skills === "string" ? skills.split(",").map(s => s.trim()).filter(Boolean) : skills;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map(skill => (
        <span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
          {skill}
        </span>
      ))}
    </div>
  );
}

// ─── AttendanceBadge ───────────────────────────────────────────
export function AttendanceBadge({ pct = 0 }) {
  const color = pct >= 90 ? "text-green-600" : pct >= 75 ? "text-yellow-600" : "text-red-500";
  return <span className={`font-semibold text-sm ${color}`}>{pct}%</span>;
}

// ─── BackLink ──────────────────────────────────────────────────
export function BackLink({ onClick, label = "Back" }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}

// ─── CoverageRoomTile ──────────────────────────────────────────
export function CoverageRoomTile({ room, status = "uncovered", assigneeName = "", onClick }) {
  const styles = {
    covered:   "bg-green-500 text-white",
    assigned:  "bg-blue-500 text-white",
    uncovered: "bg-gray-100 text-gray-700 border border-gray-200",
    others:    "bg-gray-100 text-gray-700 border border-gray-200",
  };
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all hover:opacity-90 ${styles[status]}`}
    >
      <p className="font-semibold text-sm">{room.room_number}</p>
      <p className={`text-xs mt-0.5 ${status === "covered" || status === "assigned" ? "text-white/80" : "text-gray-500"}`}>
        {room.label}
      </p>
      {assigneeName && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${status === "covered" || status === "assigned" ? "text-white/70" : "text-gray-400"}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {assigneeName}
        </p>
      )}
    </div>
  );
}

// ─── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = "md" }) {
  const s = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className="flex items-center justify-center py-12">
      <div className={`${s[size]} border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin`} />
    </div>
  );
}

// ─── ErrorMessage ──────────────────────────────────────────────
export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.924-.833-2.694 0L3.196 16.5c-.77.833.193 2.5 1.732 2.5z" />
      </svg>
      {message}
    </div>
  );
}

// ─── ConfirmDialog ─────────────────────────────────────────────
export function ConfirmDialog({ isOpen, message, onConfirm, onCancel, confirmLabel = "Confirm", confirmVariant = "danger" }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Confirm Action" size="sm">
      <p className="text-sm text-slate-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ─── PageLayout (from teammate's code) ─────────────────────────
// Wraps every page with a sidebar + main content area
// Usage: <PageLayout role="admin" activePath="/admin/members" onNavigate={fn}>...</PageLayout>
export function PageLayout({ children, sidebarContent, className = "" }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarContent}
      <main className={`flex-1 ml-[200px] p-8 ${className}`}>
        {children}
      </main>
    </div>
  );
}
