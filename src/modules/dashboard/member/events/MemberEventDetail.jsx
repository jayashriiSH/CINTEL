import { useState, useEffect } from 'react';
import { useParams, useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import { StatusBadge, Loader, ErrorState } from '../../../../components/index';

import MemberOverviewTab   from './tabs/MemberOverviewTab';
import MemberVolunteersTab from './tabs/MemberVolunteersTab';
import MemberTeamsTab      from './tabs/MemberTeamsTab';
import MemberTasksTab      from './tabs/MemberTasksTab';

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: '📊', path: 'overview'   },
  { key: 'volunteers', label: 'Volunteers', icon: '👥', path: 'volunteers' },
  { key: 'teams',      label: 'Teams',      icon: '🏷️', path: 'teams'      },
  { key: 'tasks',      label: 'Tasks',      icon: '✅', path: 'tasks'      },
];

export default function MemberEventDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [event, setEvent]   = useState(null);
  const [stats, setStats]   = useState({ volunteers: 0, tasks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // Verify the logged-in user is actually a volunteer for this event
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (user?.email) {
      fetchEvent();
      checkAccess();
    }
    // Realtime: event updates
    const channel = supabase
      .channel(`member-event-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${id}` },
        payload => setEvent(prev => prev ? { ...prev, ...payload.new } : payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `event_id=eq.${id}` },
        () => fetchStats()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id, user]);

  // ── Access guard: confirm user is a volunteer for this event ──────────────
  async function checkAccess() {
    const { data } = await supabase
      .from('volunteers')
      .select('id')
      .eq('event_id', id)
      .eq('email', user.email)
      .maybeSingle();
    setHasAccess(!!data);
  }

  async function fetchStats() {
    const [taskRes, volRes] = await Promise.allSettled([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('volunteers').select('id', { count: 'exact', head: true }).eq('event_id', id),
    ]);
    setStats({
      tasks:      taskRes.status === 'fulfilled' ? (taskRes.value.count ?? 0) : 0,
      volunteers: volRes.status  === 'fulfilled' ? (volRes.value.count  ?? 0) : 0,
    });
  }

  async function fetchEvent() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: evtErr } = await supabase
        .from('events')
        .select('id, name, date, end_date, location, type, status, description, max_volunteers, coverage_enabled')
        .eq('id', id)
        .single();

      if (evtErr) throw evtErr;
      setEvent(data);
      fetchStats();
    } catch (err) {
      console.error('Failed to fetch event:', err);
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <Loader text="Loading event details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <ErrorState message={error} onRetry={fetchEvent} />
      </div>
    );
  }

  // Show access-denied if the user isn't a volunteer for this event
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="text-center p-8">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Access Denied</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            You are not registered as a volunteer for this event.
          </p>
          <button
            onClick={() => navigate('/member/events')}
            className="text-sm font-medium"
            style={{ color: 'var(--accent)' }}
          >
            ← Back to My Events
          </button>
        </div>
      </div>
    );
  }

  const isArchived      = event?.status === 'completed' || event?.status === 'cancelled';
  const formattedDate   = event?.date
    ? new Date(event.date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'TBA';

  // Shared props passed down to every tab
  const tabProps = { eventId: id, event, stats, isArchived };

  return (
    <div className={`min-h-screen ${isArchived ? 'opacity-90' : ''}`} style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back button */}
        <button
          onClick={() => navigate('/member/events')}
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Events
        </button>

        {/* Archived notice */}
        {isArchived && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            This event is archived — details are read-only
          </div>
        )}

        {/* Event Header Card */}
        <div
          className={`rounded-2xl shadow-sm p-6 mb-6 ${isArchived ? 'opacity-75' : ''}`}
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1
                  className="text-2xl font-bold truncate"
                  style={{ color: isArchived ? 'var(--text-muted)' : 'var(--text-primary)' }}
                >
                  {event?.name}
                </h1>
                <StatusBadge status={event?.status} size="md" isArchived={isArchived} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formattedDate}
                </div>
                {event?.location && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </div>
                )}
                <StatusBadge status={event?.type} size="sm" />
              </div>
            </div>
            {/* No edit/delete buttons — read-only for members */}
          </div>
        </div>

        {/* Tabs + nested routes */}
        <div
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Tab nav */}
          <div
            className="flex overflow-x-auto"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {TABS.map(tab => (
              <NavLink
                key={tab.key}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`
                }
              >
                <span>{tab.icon}</span>
                {tab.label}
              </NavLink>
            ))}
          </div>

          {/* Nested tab content */}
          <div className="p-6">
            <Routes>
              <Route index element={<MemberOverviewTab   {...tabProps} />} />
              <Route path="overview"   element={<MemberOverviewTab   {...tabProps} />} />
              <Route path="volunteers" element={<MemberVolunteersTab {...tabProps} />} />
              <Route path="teams"      element={<MemberTeamsTab      {...tabProps} />} />
              <Route path="tasks"      element={<MemberTasksTab      {...tabProps} />} />
            </Routes>
          </div>
        </div>

      </div>
    </div>
  );
}