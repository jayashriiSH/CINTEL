/**
 * MemberOverviewTab
 * Read-only overview of the event for a volunteer member.
 * Mirrors OverviewTab but strips any admin-only actions/sections.
 */
export default function MemberOverviewTab({ event, stats }) {
  if (!event) return null;

  const formattedStart = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'TBA';

  const formattedEnd = event.end_date
    ? new Date(event.end_date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon="👥"
          label="Volunteers"
          value={stats?.volunteers ?? 0}
          color="accent"
        />
        <StatCard
          icon="✅"
          label="Tasks"
          value={stats?.tasks ?? 0}
          color="info"
        />
        {event.max_volunteers != null && (
          <StatCard
            icon="🎯"
            label="Capacity"
            value={event.max_volunteers}
            color="success"
          />
        )}
      </div>

      {/* Event details */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Event Details
        </h3>

        <DetailRow icon="📅" label="Start Date" value={formattedStart} />
        {formattedEnd && <DetailRow icon="🏁" label="End Date"   value={formattedEnd} />}
        {event.location  && <DetailRow icon="📍" label="Location"  value={event.location} />}
        {event.type      && <DetailRow icon="🏷️" label="Type"      value={capitalize(event.type)} />}
        {event.status    && <DetailRow icon="🔖" label="Status"    value={capitalize(event.status)} />}
      </div>

      {/* Description */}
      {event.description && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            About this Event
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {event.description}
          </p>
        </div>
      )}

    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    accent:  { bg: 'var(--accent-muted)',  border: 'var(--accent)',  text: 'var(--accent)'  },
    info:    { bg: 'var(--info-muted)',    border: 'var(--info)',    text: 'var(--info)'    },
    success: { bg: 'var(--success-muted)', border: 'var(--success)', text: 'var(--success)' },
  };
  const c = colorMap[color] || colorMap.accent;

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
    >
      <p className="text-lg mb-1">{icon}</p>
      <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="flex-shrink-0 w-5 text-center">{icon}</span>
      <span className="w-24 flex-shrink-0 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}