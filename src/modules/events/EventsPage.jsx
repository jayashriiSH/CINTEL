import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  PageHeader,
  SearchInput,
  Select,
  Button,
  Loader,
  ErrorState,
  EmptyState,
  Modal,
} from '../../components/index';
import EventCard from './EventCard';

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'tech', label: 'Tech' },
  { value: 'other', label: 'Other' },
];

export default function EventsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'moderator';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // New event modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: '',
    end_date: '',
    location: '',
    type: '',
    status: 'planned',
    description: '',
    max_volunteers: '',
    budget: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEvents();

    // ─── Realtime subscription ──────────────────────────────
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEvents((prev) => [{ ...payload.new, volunteer_count: 0 }, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setEvents((prev) =>
              prev.map((e) => (e.id === payload.new.id ? { ...e, ...payload.new } : e))
            );
          } else if (payload.eventType === 'DELETE') {
            setEvents((prev) => prev.filter((e) => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('id, name, date, end_date, location, type, status, description, max_volunteers, coverage_enabled, volunteers(count)')
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = (data || []).map((evt) => ({
        ...evt,
        volunteer_count: evt.volunteers?.[0]?.count ?? 0,
      }));
      setEvents(mapped);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  // Filtered events
  const filteredEvents = events.filter((evt) => {
    const matchSearch = !search || evt.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || evt.status === statusFilter;
    const matchType = !typeFilter || evt.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  async function handleCreateEvent() {
    if (!newEvent.name || !newEvent.date) return;
    setCreating(true);
    try {
      // 1. Create the event
      const { data: insertedEvents, error: insertError } = await supabase
        .from('events')
        .insert({
          name: newEvent.name,
          date: newEvent.date,
          end_date: newEvent.end_date || null,
          location: newEvent.location,
          type: newEvent.type || 'workshop',
          status: newEvent.status,
          description: newEvent.description,
          max_volunteers: newEvent.max_volunteers ? parseInt(newEvent.max_volunteers) : null,
        })
        .select('id');

      if (insertError) throw insertError;

      // 2. If budget was provided, create a budget entry
      const newEventId = insertedEvents?.[0]?.id;
      if (newEventId && newEvent.budget) {
        const { error: budgetError } = await supabase
          .from('budgets')
          .insert({
            event_id: newEventId,
            category: 'other',
            estimated_amount: parseFloat(newEvent.budget),
            total_amount: 0,
            notes: 'Initial budget set during event creation',
          });

        if (budgetError) {
          console.error('Failed to create budget entry:', budgetError);
        }
      }

      // Realtime will handle the UI update
      setShowNewModal(false);
      setNewEvent({ name: '', date: '', end_date: '', location: '', type: '', status: 'planned', description: '', max_volunteers: '', budget: '' });
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Failed to create event: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  const activeFilters = [statusFilter, typeFilter].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <PageHeader
          title="Events"
          subtitle={`${events.length} total events · Cintel Club`}
          actions={
            isAdmin && (
              <Button onClick={() => setShowNewModal(true)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Event
              </Button>
            )
          }
        />

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="w-full sm:w-72">
            <SearchInput value={search} onChange={setSearch} placeholder="Search events..." />
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="All Statuses" />
            <Select value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} placeholder="All Types" />
            {activeFilters > 0 && (
              <button
                onClick={() => { setStatusFilter(''); setTypeFilter(''); setSearch(''); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Clear filters ({activeFilters})
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <Loader text="Fetching events..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchEvents} />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No events found"
            description={search || statusFilter || typeFilter ? 'Try adjusting your filters' : 'Create your first event to get started'}
            action={
              isAdmin && !search && !statusFilter && !typeFilter && (
                <Button onClick={() => setShowNewModal(true)}>Create Event</Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} basePath={isAdmin ? '/admin/events' : '/member/events'} />
            ))}
          </div>
        )}
      </div>

      {/* New Event Modal */}
      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Create New Event" size="md">
        <div className="space-y-4">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Name *</label>
            <input
              type="text"
              value={newEvent.name}
              onChange={(e) => setNewEvent((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. TechHack 2026"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={newEvent.end_date}
                onChange={(e) => setNewEvent((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Type & Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="">Select type</option>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget (₹)</label>
              <input
                type="number"
                value={newEvent.budget}
                onChange={(e) => setNewEvent((p) => ({ ...p, budget: e.target.value }))}
                placeholder="e.g. 25000"
                min="0"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Location & Max Volunteers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Main Auditorium"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Volunteers</label>
              <input
                type="number"
                value={newEvent.max_volunteers}
                onChange={(e) => setNewEvent((p) => ({ ...p, max_volunteers: e.target.value }))}
                placeholder="e.g. 50"
                min="0"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Brief description of the event..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={creating || !newEvent.name || !newEvent.date}>
              {creating ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
