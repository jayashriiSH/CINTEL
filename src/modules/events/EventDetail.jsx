import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  TabNav,
  StatusBadge,
  Button,
  Loader,
  ErrorState,
  Modal,
} from '../../components/index';

// Tabs
import OverviewTab from './tabs/OverviewTab';
import VolunteersTab from './tabs/VolunteersTab';
import TeamsTab from './tabs/TeamsTab';
import TasksTab from './tabs/TasksTab';
import ScheduleTab from './tabs/ScheduleTab';
import FinanceTab from './tabs/FinanceTab';
import InventoryTab from './tabs/InventoryTab';
import SubmissionsTab from './tabs/SubmissionsTab';
import CoverageTab from './tabs/CoverageTab';



const TABS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'volunteers', label: 'Volunteers', icon: '👥' },
  { key: 'teams', label: 'Teams', icon: '🏷️' },
  { key: 'tasks', label: 'Tasks', icon: '✅' },
  { key: 'schedule', label: 'Event Schedule', icon: '📅' },
  { key: 'finance', label: 'Finance', icon: '💰' },
  { key: 'inventory', label: 'Inventory', icon: '📦' }, // ✅ ADD THIS
  { key: 'submissions', label: 'Submissions', icon: '📄' },
   { key: 'coverage', label: 'Coverage', icon: '🏫' },
];

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

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'moderator';

  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({ volunteers: 0, tasks: 0, budget: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEvent();

    // Realtime: listen for event updates
    const channel = supabase
      .channel(`event-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${id}` },
        (payload) => {
          setEvent((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers', filter: `event_id=eq.${id}` },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `event_id=eq.${id}` },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function fetchStats() {
    // Run each query independently — one failing table won't block the others
    const [volRes, taskRes, budgetRes] = await Promise.allSettled([
      supabase.from('volunteers').select('id', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('budgets').select('estimated_amount').eq('event_id', id),
    ]);

    const volunteers = volRes.status === 'fulfilled' ? (volRes.value.count ?? 0) : 0;
    const tasks = taskRes.status === 'fulfilled' ? (taskRes.value.count ?? 0) : 0;
    const budgetData = budgetRes.status === 'fulfilled' ? (budgetRes.value.data || []) : [];
    const budget = budgetData.reduce((sum, b) => sum + (b.estimated_amount || 0), 0);

    setStats({ volunteers, tasks, budget });
  }

  async function fetchEvent() {
    setLoading(true);
    setError(null);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, date, end_date, location, type, status, description, max_volunteers, coverage_enabled')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Run stats in background — don't block page render
      fetchStats();
    } catch (err) {
      console.error('Failed to fetch event:', err);
      setError(err.message || 'Failed to load event');
    } finally {
      // Always clear loading — stats load independently
      setLoading(false);
    }
  }

  // ─── Edit handler ────────────────────────────────────────
  function openEditModal() {
    setEditForm({
      name: event?.name || '',
      date: event?.date ? event.date.split('T')[0] : '',
      end_date: event?.end_date ? event.end_date.split('T')[0] : '',
      location: event?.location || '',
      type: event?.type || '',
      status: event?.status || 'planned',
      description: event?.description || '',
      max_volunteers: event?.max_volunteers ?? '',
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          name: editForm.name,
          date: editForm.date,
          end_date: editForm.end_date || null,
          location: editForm.location,
          type: editForm.type,
          status: editForm.status,
          description: editForm.description,
          max_volunteers: editForm.max_volunteers ? parseInt(editForm.max_volunteers) : null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state immediately
      setEvent((prev) => ({
        ...prev,
        name: editForm.name,
        date: editForm.date,
        end_date: editForm.end_date || null,
        location: editForm.location,
        type: editForm.type,
        status: editForm.status,
        description: editForm.description,
        max_volunteers: editForm.max_volunteers ? parseInt(editForm.max_volunteers) : null,
      }));
      setShowEditModal(false);
    } catch (err) {
      alert('Failed to update event: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete handler (soft delete) ─────────────────────────
  async function handleDeleteEvent() {
    setDeleting(true);
    try {
      const { error: delError } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', parseInt(id));
      if (delError) throw delError;
      setShowDeleteConfirm(false);
      navigate(isAdmin ? '/admin/events' : '/member/events');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeleting(false);
    }
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab event={event} stats={stats} />;
      case 'volunteers':
        return <VolunteersTab eventId={id} />;
      case 'teams':
        return <TeamsTab eventId={id} />;
      case 'tasks':
        return <TasksTab eventId={id} />;
      case 'schedule':
        return <ScheduleTab eventId={id} />;
      case 'finance':
        return <FinanceTab eventId={id} />;
      case 'submissions':
  return <SubmissionsTab eventId={id} />;
      case 'inventory':
        return <InventoryTab eventId={id} />;
        case 'coverage':
  return (
    <CoverageTab
      eventId={id}
      isArchived={event?.status === 'completed' || event?.status === 'cancelled'}
    />
  );
        default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Loader text="Loading event details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <ErrorState message={error} onRetry={fetchEvent} />
      </div>
    );
  }

  const formattedDate = event?.date
    ? new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'TBA';

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(isAdmin ? '/admin/events' : '/member/events')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </button>

        {/* Event Header Card */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-800">{event?.name}</h1>
                <StatusBadge status={event?.status} size="md" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formattedDate}
                </div>
                {event?.location && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </div>
                )}
                <StatusBadge status={event?.type} size="sm" />
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={openEditModal}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* ─── Edit Event Modal ──────────────────────────────── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Event" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Name *</label>
            <input
              type="text"
              value={editForm.name || ''}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={editForm.date || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={editForm.end_date || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={editForm.type || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={editForm.status || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={editForm.location || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Volunteers</label>
              <input
                type="number"
                value={editForm.max_volunteers ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, max_volunteers: e.target.value }))}
                min="0"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={editForm.description || ''}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.name || !editForm.date}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation Modal ─────────────────────── */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Event" size="sm">
        <div className="text-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Delete "{event?.name}"?
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            This action cannot be undone. The event and all its associated data will be removed.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteEvent} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Placeholder Tab for future modules ────────────────────────
function PlaceholderTab({ label, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{label}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      <div className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-medium">
        Coming Soon
      </div>
    </div>
  );
}
