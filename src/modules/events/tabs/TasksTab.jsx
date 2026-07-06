import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import {
  Table,
  StatusBadge,
  Button,
  Select,
  Loader,
  ErrorState,
  Modal,
} from '../../../components/index';

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function TasksTab({ eventId }) {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'moderator';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // People (members + volunteers)
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Add task modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: null, deadline: '', priority: 'medium' });
  const [adding, setAdding] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function extractAssigneeName(task) {
    const match = task?.description?.match(/^Assigned to:\s*(.+)$/im);
    if (match?.[1]) return match[1].trim();
    if (task?.assigned_to) return `#${task.assigned_to}`;
    return null;
  }

  useEffect(() => {
    fetchTasks();
    fetchPeople();

    const channel = supabase
      .channel(`tasks-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function fetchTasks() {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tasks')
        .select('id, title, description, assigned_to, team_id, deadline, priority, status, completed_at')
        .eq('event_id', eventId)
        .order('deadline', { ascending: true });

      if (!isAdmin && user?.id) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPeople() {
    const { data: members } = await supabase.from('members').select('id, name');
    const { data: volunteers } = await supabase.from('volunteers').select('id, name');

    const merged = [
      ...(members || []).map((m) => ({ id: m.id, name: m.name, type: 'member' })),
      ...(volunteers || []).map((v) => ({ id: v.id, name: v.name, type: 'volunteer' })),
    ];

    setPeople(merged);
  }

  async function handleAddTask() {
    if (!newTask.title) return;
    setAdding(true);
    try {
      const { error: insertError } = await supabase
        .from('tasks')
        .insert({
          event_id: eventId,
          title: newTask.title,
          description: newTask.description || null,
          assigned_to: newTask.assigned_to || null,
          deadline: newTask.deadline || null,
          priority: newTask.priority,
          status: 'pending',
        });

      if (insertError) throw insertError;
      setShowAddModal(false);
      setNewTask({ title: '', description: '', assigned_to: null, deadline: '', priority: 'medium' });
      setSearch('');
    } catch (err) {
      alert('Failed to add task: ' + err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          ...(newStatus === 'completed'
            ? { completed_at: new Date().toISOString() }
            : { completed_at: null }),
        })
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  }

  const filteredTasks = useMemo(() => {
    if (!statusFilter) return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Resolve assigned name from people list or fallback to description
  function resolveAssigneeName(task) {
    if (task.assigned_to) {
      const found = people.find((p) => p.id === task.assigned_to);
      if (found) return found.name;
    }
    return extractAssigneeName(task);
  }

  const columns = [
    {
      key: 'title',
      label: 'Task',
      render: (val) => <span className="font-medium text-slate-800">{val}</span>,
    },
    {
      key: 'assigned_to',
      label: 'Assigned To',
      render: (_val, row) => {
        const name = resolveAssigneeName(row);
        return name
          ? <span className="text-slate-700">{name}</span>
          : <span className="text-slate-400">—</span>;
      },
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (val) => {
        if (!val) return <span className="text-slate-400">—</span>;
        const d = new Date(val);
        const isPast = d < new Date();
        return (
          <span className={isPast ? 'text-red-500 font-medium' : 'text-slate-700'}>
            {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        );
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (val) => <StatusBadge status={val} size="sm" />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) =>
        isAdmin ? (
          <select
            value={val}
            onChange={(e) => handleStatusChange(row.id, e.target.value)}
            className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <StatusBadge status={val} size="sm" />
        ),
    },
  ];

  if (loading) return <Loader text="Loading tasks..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTasks} />;

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              placeholder="All Statuses"
            />
          )}
          <span className="text-sm text-slate-400">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Pending: {tasks.filter((t) => t.status === 'pending').length}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          In Progress: {tasks.filter((t) => t.status === 'in_progress').length}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Completed: {tasks.filter((t) => t.status === 'completed').length}
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredTasks}
        emptyMessage={isAdmin ? 'No tasks created yet' : 'No tasks assigned to you'}
      />

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSearch('');
          setNewTask({ title: '', description: '', assigned_to: null, deadline: '', priority: 'medium' });
        }}
        title="Add Task"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="e.g. Setup registration portal"
            />
          </div>

          {/* Searchable Assignee Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
            <input
              type="text"
              placeholder="Search member or volunteer..."
              value={search}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setNewTask((p) => ({ ...p, assigned_to: null }));
                setShowDropdown(true);
              }}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
            {showDropdown && (
              <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                {filteredPeople.length === 0 ? (
                  <p className="p-3 text-sm text-slate-400">No results found</p>
                ) : (
                  filteredPeople.map((p) => (
                    <div
                      key={p.type + '-' + p.id}
                      onMouseDown={() => {
                        setNewTask((prev) => ({ ...prev, assigned_to: p.id }));
                        setSearch(p.name);
                        setShowDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm flex items-center justify-between"
                    >
                      <span className="text-slate-700">{p.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        p.type === 'member'
                          ? 'bg-indigo-50 text-indigo-500'
                          : 'bg-emerald-50 text-emerald-500'
                      }`}>
                        {p.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
            <input
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask((p) => ({ ...p, deadline: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); setSearch(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={adding || !newTask.title}>
              {adding ? 'Adding...' : 'Add Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}