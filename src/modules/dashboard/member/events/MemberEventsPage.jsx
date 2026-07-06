import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import {
  PageHeader,
  SearchInput,
  Select,
  Loader,
  ErrorState,
  EmptyState,
} from '../../../../components/index';
import MemberEventCard from './MemberEventCard';

const STATUS_OPTIONS = [
  { value: 'planned',   label: 'Planned'   },
  { value: 'ongoing',   label: 'Ongoing'   },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar',  label: 'Seminar'  },
  { value: 'tech',     label: 'Tech'     },
  { value: 'other',    label: 'Other'    },
];

export default function MemberEventsPage() {
  const { user } = useAuth();

  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Filters
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');

  useEffect(() => {
    if (user?.email) fetchMemberEvents();
  }, [user]);

  // ── Fetch only events the logged-in user is a volunteer in ────────────────
  async function fetchMemberEvents() {
    setLoading(true);
    setError(null);
    try {
      // Join volunteers → events, filter by the current user's email
      const { data, error: fetchError } = await supabase
        .from('volunteers')
        .select(`
          event_id,
          role,
          events!inner(
            id, name, date, end_date, location, type, status,
            description, max_volunteers, coverage_enabled,
            deleted_at,
            volunteers(count)
          )
        `)
        .eq('email', user.email)
        .is('events.deleted_at', null);

      if (fetchError) throw fetchError;

      // De-duplicate by event id (a user could appear twice in volunteers)
      const seen = new Set();
      const mapped = (data || [])
        .filter(v => v.events && !seen.has(v.events.id) && seen.add(v.events.id))
        .map(v => ({
          ...v.events,
          volunteer_count: v.events.volunteers?.[0]?.count ?? 0,
          myRole: v.role,
        }));

      setEvents(mapped);
    } catch (err) {
      console.error('Failed to fetch member events:', err);
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  // ── Realtime: update list when volunteer rows change ──────────────────────
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel('member-events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers' },
        () => fetchMemberEvents()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          setEvents(prev =>
            prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e)
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filteredEvents = events.filter(evt => {
    const matchSearch = !search || evt.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || evt.status === statusFilter;
    const matchType   = !typeFilter   || evt.type   === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const activeFilters = [statusFilter, typeFilter].filter(Boolean).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <PageHeader
          title="My Events"
          subtitle={`${events.length} event${events.length !== 1 ? 's' : ''} you're volunteering in`}
        />

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="w-full sm:w-72">
            <SearchInput value={search} onChange={setSearch} placeholder="Search events..." />
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              placeholder="All Statuses"
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={TYPE_OPTIONS}
              placeholder="All Types"
            />
            {activeFilters > 0 && (
              <button
                onClick={() => { setStatusFilter(''); setTypeFilter(''); setSearch(''); }}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Clear filters ({activeFilters})
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <Loader text="Fetching your events..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchMemberEvents} />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No events found"
            description={
              search || statusFilter || typeFilter
                ? 'Try adjusting your filters'
                : "You haven't been added as a volunteer to any event yet"
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredEvents.map(event => (
              <MemberEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}