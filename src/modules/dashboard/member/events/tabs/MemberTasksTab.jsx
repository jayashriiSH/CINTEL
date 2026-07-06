import { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabaseClient';
import { useAuth } from '../../../../../context/AuthContext';
import { Loader, ErrorState } from '../../../../../components/index';

const PRIORITY_STYLES = {
  high:   { bg: 'var(--danger-muted)',  text: 'var(--danger)',  label: 'High'   },
  medium: { bg: 'var(--warning-muted)', text: 'var(--warning)', label: 'Medium' },
  low:    { bg: 'var(--success-muted)', text: 'var(--success)', label: 'Low'    },
};

const STATUS_STYLES = {
  pending:     { bg: 'var(--info-muted)',    text: 'var(--info)',    label: 'Pending'     },
  in_progress: { bg: 'var(--warning-muted)', text: 'var(--warning)', label: 'In Progress' },
  completed:   { bg: 'var(--success-muted)', text: 'var(--success)', label: 'Completed'   },
  cancelled:   { bg: 'var(--bg-surface)',    text: 'var(--text-muted)', label: 'Cancelled' },
};

/**
 * MemberTasksTab
 * Read-only task list. Tasks assigned to the current member are highlighted.
 * Members cannot create, edit, or delete tasks.
 */
export default function MemberTasksTab({ eventId }) {
  const { user } = useAuth();

  const [tasks, setTasks]       = useState([]);
  const [memberId, setMemberId] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('all'); // 'all' | 'mine'

  // Resolve integer member ID from auth UID
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => { if (data) setMemberId(data.id); });
  }, [user]);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel(`member-tasks-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `event_id=eq.${eventId}` },
        () => fetchTasks()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [eventId]);

  async function fetchTasks() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_date, assigned_to, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  const displayed = filter === 'mine' && memberId
    ? tasks.filter(t => t.assigned_to === memberId)
    : tasks;

  if (loading) return <Loader text="Loading tasks..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchTasks} />;

  return (
    <div className="space-y-4">

      {/* Filter toggle */}
      <div className="flex items-center gap-2">
        {['all', 'mine'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={filter === f
              ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }
              : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }
          >
            {f === 'all' ? `All Tasks (${tasks.length})` : `My Tasks (${tasks.filter(t => t.assigned_to === memberId).length})`}
          </button>
        ))}
      </div>

      {/* Task list */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl mb-3 block">✅</span>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {filter === 'mine' ? 'No tasks assigned to you' : 'No tasks yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(task => {
            const isAssignedToMe = task.assigned_to === memberId;
            const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
            const status   = STATUS_STYLES[task.status]   || STATUS_STYLES.pending;

            return (
              <div
                key={task.id}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: isAssignedToMe ? 'var(--accent-muted)' : 'var(--bg-surface)',
                  border: `1px solid ${isAssignedToMe ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {task.title}
                      </h4>
                      {isAssignedToMe && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                        >
                          Assigned to you
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: 'var(--text-muted)' }}>
                        {task.description}
                      </p>
                    )}
                    {task.due_date && (
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Due: {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{ backgroundColor: priority.bg, color: priority.text }}
                    >
                      {priority.label}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{ backgroundColor: status.bg, color: status.text }}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}