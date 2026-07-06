import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { Loader, Modal } from '../../../components/index';

// ─── Room layout builder (dynamically fetched from DB) ────────────────────
// Builds grid positions for a floor's rooms, preserving corridor layout:
//   - 13 rooms across columns 1–13  (left wing)
//   - corridor at column 14
//   - right wing (if any) starts at column 15
function buildFloorLayout(rooms) {
  // Sort by room_number ascending
  const sorted = [...rooms].sort((a, b) =>
    parseInt(a.room_number) - parseInt(b.room_number)
  );

  // Floors 1 & 2: 13 rooms, floor 3: 9 rooms (matching PDF layout)
  const leftWingCount = rooms.length <= 10 ? rooms.length : 13;

  const leftWing = sorted.slice(0, leftWingCount).map((r, i) => ({
    ...r,
    col: i + 1,
    row: 0,
    wing: 'left',
  }));

  const rightWing = sorted.slice(leftWingCount).map((r, i) => ({
    ...r,
    col: 15 + i,
    row: 0,
    wing: 'right',
  }));

  return { leftWing, rightWing, hasRightWing: rightWing.length > 0 };
}

// Fetched room cache (building → floor → layout)
const roomLayoutCache = {};

// ─── Building / Floor config ────────────────────────────────────────────────
const BUILDINGS = ['Tech Park 1', 'Tech Park 2', 'University Building'];

const FLOORS_MAP = {
  'Tech Park 1':         Array.from({ length: 15 }, (_, i) => i + 1),
  'Tech Park 2':         Array.from({ length: 15 }, (_, i) => i + 1),
  'University Building': Array.from({ length: 15 }, (_, i) => i + 1),
};

const FLOOR_LABEL = Object.fromEntries(
  Array.from({ length: 15 }, (_, i) => [i + 1, `Floor ${i + 1}`])
);

const BATCHES = [
  { value: 'batch_1', label: 'Batch 1 (8:00 AM – 12:30 PM)' },
  { value: 'batch_2', label: 'Batch 2 (2:30 PM – 5:00 PM)' },
];

// ─── Member avatar helpers ───────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
  'bg-indigo-500', 'bg-rose-500',
];
function memberColor(name = '') {
  let hash = 0;
  for (const c of name) hash += c.charCodeAt(0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function memberInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────

function FallbackRoomGrid({ roomCards, availableClassrooms, isAdmin, roomsLoading, onReassign, onToggle, onOpenBulk }) {
  if (roomsLoading) return <Loader text="Loading rooms..." />;
  if (roomCards.length === 0 && availableClassrooms.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No rooms for this filter</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {isAdmin ? 'Use Bulk Assign to add coverage records for rooms on this floor.' : 'No classrooms assigned for this filter.'}
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
      {roomCards.map(card => {
        const isCompleted = card.status === 'covered';
        const isUnassigned = card.covered_by === null;
        return (
          <div
            key={card.id}
            onClick={() => isAdmin ? onReassign(card) : (!isUnassigned && onToggle(card))}
            className="relative rounded-xl p-3 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            style={{
              backgroundColor: isCompleted ? 'var(--status-success-bg)' : isUnassigned ? 'var(--bg-surface)' : 'var(--status-info-bg)',
              color: isCompleted ? 'var(--status-success-text)' : isUnassigned ? 'var(--text-secondary)' : 'var(--status-info-text)',
              border: isUnassigned ? '2px dashed var(--border)' : 'none'
            }}
          >
            {isCompleted && (
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-success-text)', border: '2px solid var(--bg-card)' }}>
                <svg className="w-2.5 h-2.5" style={{ color: 'var(--status-success-bg)' }} fill="none" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {isUnassigned && (
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)', border: '2px solid var(--bg-card)' }}>
                <span className="text-[8px] font-bold" style={{ color: 'var(--text-muted)' }}>?</span>
              </div>
            )}
            <p className="text-sm font-bold">{card.classrooms?.room_number}</p>
            <p className="text-[10px] mt-0.5 opacity-80">{card.classrooms?.label}</p>
            {!isUnassigned && card.members?.name && (
              <div className={`mt-1.5 w-full h-5 rounded-full ${memberColor(card.members.name)} flex items-center justify-center text-[9px] font-bold text-white truncate px-1`}>
                {card.members.name}
              </div>
            )}
            {isUnassigned && isAdmin && (
              <p className="text-[10px] mt-1.5 italic" style={{ color: 'var(--text-muted)' }}>Tap to assign</p>
            )}
            {isUnassigned && !isAdmin && (
              <p className="text-[10px] mt-1.5 opacity-60 italic">Unassigned</p>
            )}
          </div>
        );
      })}
      {isAdmin && availableClassrooms.map(cls => (
        <div
          key={cls.id}
          onClick={onOpenBulk}
          className="rounded-xl p-3 cursor-pointer transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', border: '2px dashed var(--border)', color: 'var(--text-muted)' }}
        >
          <p className="text-sm font-bold">{cls.room_number}</p>
          <p className="text-[10px] mt-0.5">{cls.label}</p>
          <p className="text-[10px] mt-1 italic">No record</p>
        </div>
      ))}
    </div>
  );
}

export default function CoverageTab({ eventId, isArchived }) {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'moderator';

  // ── Member ─────────────────────────────────────────────────────────────────
  const [memberId, setMemberId] = useState(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [coverageRows, setCoverageRows] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [building, setBuilding] = useState('Tech Park 1');
  const [floor, setFloor] = useState(1);
  const [batch, setBatch] = useState('batch_1');

  // ── Room cards (filtered view) ─────────────────────────────────────────────
  const [roomCards, setRoomCards] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [availableClassrooms, setAvailableClassrooms] = useState([]);

  // ── Floor plan rooms (fetched from DB per building/floor) ─────────────────
  const [floorRooms, setFloorRooms] = useState([]);
  const [roomsDbLoading, setRoomsDbLoading] = useState(false);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, unassigned: 0 });

  // ── Reassign Modal ──────────────────────────────────────────────────────────
  const [reassignModal, setReassignModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Bulk Assign Modal state (fully isolated) ────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBuilding, setBulkBuilding] = useState('Tech Park 1');
  const [bulkFloor, setBulkFloor] = useState(1);
  const [bulkBatch, setBulkBatch] = useState('batch_1');
  const [bulkMember, setBulkMember] = useState(null);
  const [bulkRoomIds, setBulkRoomIds] = useState([]);       // IDs selected
  const [bulkRoomsLoading, setBulkRoomsLoading] = useState(false);
  const [bulkRoomsList, setBulkRoomsList] = useState([]);    // classroom options
  const [bulkError, setBulkError] = useState(null);

  // ── Resolve memberId from auth.uid ────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setMemberId(data.id);
      });
  }, [user]);

  // ── Load members for dropdowns ───────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('members')
      .select('id, name, email')
      .order('name')
      .then(({ data }) => setMembers(data || []));
  }, []);

  // ── Load coverage data ─────────────────────────────────────────────────────
  useEffect(() => {
    loadCoverage();
  }, [eventId]);

  // ── Re-filter room cards when filters change ───────────────────────────────
  useEffect(() => {
    filterRoomCards();
  }, [building, floor, batch, coverageRows]);

  // ── Fetch floor room layout from DB ───────────────────────────────────────
  useEffect(() => {
    loadFloorRooms(building, floor);
  }, [building, floor]);

  async function loadFloorRooms(bld, flr) {
    setRoomsDbLoading(true);
    setFloorRooms([]);
    const cacheKey = `${bld}__${flr}`;
    if (roomLayoutCache[cacheKey]) {
      setFloorRooms(roomLayoutCache[cacheKey]);
      setRoomsDbLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('classrooms')
      .select('id, room_number, label, building, floor, capacity')
      .eq('building', bld)
      .eq('floor', flr)
      .order('room_number');
    if (!error && data) {
      const rooms = data.map(r => ({ ...r, col: 0, row: 0 }));
      roomLayoutCache[cacheKey] = rooms;
      setFloorRooms(rooms);
    }
    setRoomsDbLoading(false);
  }

  async function loadCoverage() {
    setLoading(true);
    const { data, error } = await supabase
      .from('coverage')
      .select(`
        id, batch, status, covered_by,
        classrooms!inner(id, room_number, label, building, floor, capacity),
        events!inner(date),
        members!covered_by(id, name, email)
      `)
      .eq('event_id', eventId)
      .order('classrooms(building)')
      .order('classrooms(floor)')
      .order('classrooms(room_number)');
    if (error) {
      console.error('loadCoverage error:', error);
      setCoverageRows([]);
    } else {
      setCoverageRows(data || []);
      computeStats(data || []);
    }
    setLoading(false);
  }

  async function filterRoomCards() {
    setRoomsLoading(true);
    let filtered = coverageRows.filter(r => {
      if (r.classrooms.building !== building) return false;
      if (r.classrooms.floor !== floor) return false;
      if (batch && r.batch !== batch) return false;
      return true;
    });

    if (filtered.length === 0) {
      const { data } = await supabase
        .from('classrooms')
        .select('id, room_number, label, building, floor, capacity')
        .eq('building', building)
        .eq('floor', floor)
        .order('room_number');
      setAvailableClassrooms(data || []);
    } else {
      setAvailableClassrooms([]);
    }

    setRoomCards(filtered);
    setRoomsLoading(false);
  }

  function computeStats(rows) {
    const total = rows.length;
    const assigned = rows.filter(r => r.covered_by !== null).length;
    const completed = rows.filter(r => r.status === 'covered').length;
    const unassigned = rows.filter(r => r.covered_by === null).length;
    setStats({ total, assigned, completed, unassigned });
  }

  // ── Toggle completion ───────────────────────────────────────────────────────
  async function toggleStatus(card) {
    if (isPastEvent()) { alert('This event has already ended.'); return; }
    const newStatus = card.status === 'covered' ? 'pending' : 'covered';
    setCoverageRows(prev => prev.map(r => r.id === card.id ? { ...r, status: newStatus } : r));
    setRoomCards(prev => prev.map(c => c.id === card.id ? { ...c, status: newStatus } : c));
    const updated = coverageRows.map(r => r.id === card.id ? { ...r, status: newStatus } : r);
    computeStats(updated);

    const { error } = await supabase
      .from('coverage')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', card.id);

    if (error) {
      loadCoverage();
      alert('Failed to update: ' + error.message);
    }
  }

  // ── Reassign ────────────────────────────────────────────────────────────────
  async function handleReassign() {
    if (!reassignModal) return;
    if (isArchived) return;
    setSaving(true);
    const payload = reassignModal.covered_by === null
      ? { covered_by: null, status: 'pending' }
      : { covered_by: reassignModal.covered_by, status: 'pending' };
    const { error } = await supabase
      .from('coverage')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', reassignModal.id);
    if (!error) await loadCoverage();
    else alert('Failed: ' + error.message);
    setSaving(false);
    setReassignModal(null);
  }

  async function openBulkModal() {
    if (isArchived) return;
    const eventDate = coverageRows[0]?.events?.date;
    if (eventDate && new Date(eventDate) < new Date()) {
      alert('This event has already ended.');
      return;
    }
    setBulkOpen(true);
    setBulkBuilding('Tech Park 1');
    setBulkFloor(1);
    setBulkBatch('batch_1');
    setBulkMember(null);
    setBulkRoomIds([]);
    setBulkError(null);
    await loadBulkRooms('Tech Park 1', 1);
  }

  function isPastEvent() {
    const eventDate = coverageRows[0]?.events?.date;
    return eventDate && new Date(eventDate) < new Date();
  }

  async function loadBulkRooms(bld, flr) {
    setBulkRoomsLoading(true);
    setBulkRoomsList([]);
    // Always fetch directly from classrooms table — all rooms for this building + floor
    const { data, error } = await supabase
      .from('classrooms')
      .select('id, room_number, label')
      .eq('building', bld)
      .eq('floor', flr)
      .order('room_number');
    setBulkRoomsList((data && !error) ? data : []);
    setBulkRoomsLoading(false);
  }

  async function handleBulkAssign() {
    if (!bulkMember || bulkRoomIds.length === 0) return;
    if (isArchived) return;
    setSaving(true);
    setBulkError(null);

    const results = await Promise.allSettled(
      bulkRoomIds.map(roomId =>
        supabase.from('coverage').upsert(
          {
            event_id: eventId,
            classroom_id: roomId,
            batch: bulkBatch,
            covered_by: bulkMember.id,
            status: 'pending',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'event_id,classroom_id,batch' }
        )
      )
    );

    const failures = results.filter(r => r.status === 'rejected' || r.value?.error);
    if (failures.length > 0) {
      setBulkError(`Failed to assign ${failures.length} of ${bulkRoomIds.length} rooms.`);
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`Room ${i} error:`, r.reason);
        else if (r.value?.error) console.error(`Room ${i} error:`, r.value.error);
      });
      setSaving(false);
      return;
    }

    await loadCoverage();
    setBulkOpen(false);
    setBulkRoomIds([]);
    setBulkMember(null);
    setSaving(false);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function formatDate(d) {
    if (!d) return 'TBA';
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Schedule grouped view ───────────────────────────────────────────────────
  function getSchedule() {
    const grouped = {};
    coverageRows.forEach(r => {
      const dateKey = r.events?.date?.split('T')[0] || 'Unknown';
      const bld = r.classrooms?.building || 'Unknown';
      const key = `${dateKey}__${bld}`;
      if (!grouped[key]) grouped[key] = { date: dateKey, building: bld, batch_1: [], batch_2: [] };
      const slot = r.batch === 'batch_1' ? 'batch_1' : 'batch_2';
      grouped[key][slot].push(r);
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }

  if (loading) return <Loader text="Loading coverage..." />;

  const schedule = getSchedule();

  return (
    <div>
      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Rooms', value: stats.total, bg: 'var(--bg-surface)', color: 'var(--text-secondary)' },
          { label: 'Assigned',   value: stats.assigned, bg: 'var(--status-info-bg)', color: 'var(--status-info-text)' },
          { label: 'Completed',   value: stats.completed, bg: 'var(--status-success-bg)', color: 'var(--status-success-text)' },
          { label: 'Unassigned',  value: stats.unassigned, bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: s.bg, color: s.color }} className="rounded-xl px-4 py-3">
            <p className="text-xs font-medium opacity-70">{s.label}</p>
            <p className="text-2xl font-bold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Coverage Schedule Table ───────────────────────────────────────── */}
      {coverageRows.length === 0 ? (
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }} className="text-center py-10 mb-6 rounded-xl">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No coverage records for this event.</p>
          {isAdmin && (
            <button onClick={openBulkModal} className="mt-2 text-indigo-600 text-sm font-medium hover:underline">
              + Bulk assign rooms
            </button>
          )}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)' }} className="overflow-x-auto rounded-xl mb-6">
          <table className="min-w-full text-sm">
            <thead style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['Date', 'Building', 'Batch', 'Room', 'Assigned To', 'Status', ...(isAdmin ? ['Action'] : [])].map(h => (
                  <th key={h} style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'var(--bg-card)' }}>
              {coverageRows.map(r => {
                const isCompleted = r.status === 'covered';
                const isUnassigned = r.covered_by === null;
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }} className="hover:opacity-90 transition-opacity">
                    <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{formatDate(r.events?.date)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{r.classrooms?.building}</td>
                    <td className="px-4 py-3">
                      <span style={{
                        backgroundColor: r.batch === 'batch_1' ? 'var(--status-info-bg)' : 'var(--status-success-bg)',
                        color: r.batch === 'batch_1' ? 'var(--status-info-text)' : 'var(--status-success-text)'
                      }} className="px-2 py-0.5 rounded-md text-xs font-medium">
                        {r.batch === 'batch_1' ? 'Batch 1' : 'Batch 2'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.classrooms?.room_number}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.classrooms?.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isUnassigned ? (
                        <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${memberColor(r.members?.name || '')} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                            {memberInitials(r.members?.name || '?')}
                          </div>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.members?.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{
                        backgroundColor: isCompleted ? 'var(--status-success-bg)' : isUnassigned ? 'var(--bg-surface)' : 'var(--status-info-bg)',
                        color: isCompleted ? 'var(--status-success-text)' : isUnassigned ? 'var(--text-muted)' : 'var(--status-info-text)'
                      }} className="px-2 py-0.5 rounded-full text-xs font-semibold">
                        {isCompleted ? 'Completed' : isUnassigned ? 'Unassigned' : 'Pending'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleStatus(r)}
                            style={{
                              backgroundColor: isCompleted ? 'var(--bg-surface)' : 'var(--status-success-bg)',
                              color: isCompleted ? 'var(--text-secondary)' : 'var(--status-success-text)'
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg font-medium transition-colors"
                          >
                            {isCompleted ? '↩ Pending' : '✓ Done'}
                          </button>
                          <button
                            onClick={() => { if (isPastEvent()) { alert('This event has already ended.'); return; } setReassignModal({ ...r, covered_by: r.covered_by ?? null }); }}
                            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                            className="px-2.5 py-1 text-xs rounded-lg font-medium transition-colors"
                          >
                            Reassign
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {isAdmin && (
          <button
            onClick={openBulkModal}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Bulk Assign
          </button>
        )}

        <div className="flex flex-col gap-1">
          <label style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold uppercase tracking-wide">Building</label>
          <select
            value={building}
            onChange={e => { setBuilding(e.target.value); setFloor(FLOORS_MAP[e.target.value]?.[0] ?? 1); }}
            style={{ border: '1px solid var(--border)' }}
            className="px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
          >
            {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold uppercase tracking-wide">Floor</label>
          <select
            value={floor}
            onChange={e => setFloor(parseInt(e.target.value))}
            style={{ border: '1px solid var(--border)' }}
            className="px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
          >
            {(FLOORS_MAP[building] || []).map(f => <option key={f} value={f}>{FLOOR_LABEL[f]}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold uppercase tracking-wide">Batch</label>
          <select
            value={batch}
            onChange={e => setBatch(e.target.value)}
            style={{ border: '1px solid var(--border)' }}
            className="px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
          >
            {BATCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="px-2.5 py-1 rounded-lg font-medium text-xs" style={{ backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info-text)' }}>
            {roomCards.length} room{roomCards.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 mb-3">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="h-3 w-3 rounded-sm bg-blue-500" /> Assigned / Pending
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Completed
        </span>
        {isAdmin && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }} /> Unassigned
          </span>
        )}
      </div>

      {/* ── Room cards — Tech Park 1: floor plan layout ─────────────────────── */}
      {building === 'Tech Park 1' ? (
        <div>
          {roomsDbLoading ? (
            <div className="flex items-center justify-center py-12" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Loader text="Loading floor plan..." />
            </div>
          ) : floorRooms.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No rooms found for {building} — Floor {floor}.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Floor {floor} Layout</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {roomCards.length} assigned · {floorRooms.length} total rooms
                </p>
              </div>
              <div
                className="grid gap-2 p-6 rounded-xl"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  gridTemplateColumns: 'repeat(16, 1fr)',
                  gridAutoRows: 'minmax(64px, auto)',
                }}
              >
                {/* Staircase block */}
                <div className="rounded-lg flex items-center justify-center text-xs font-medium" style={{ gridColumn: '1', gridRow: '1', backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>↕</div>
                {/* Room tiles */}
                {(() => {
                  const { leftWing, rightWing, hasRightWing } = buildFloorLayout(floorRooms);
                  return (
                    <>
                      {/* Corridor stripe */}
                      <div className="rounded flex items-center justify-center text-[10px] font-medium" style={{ gridColumn: `2 / span ${hasRightWing ? 12 : 14}`, gridRow: 2, backgroundColor: 'var(--border)', color: 'var(--text-muted)', height: '20px', alignSelf: 'center' }}>corridor</div>
                      {/* Left wing rooms */}
                      {leftWing.map(layout => {
                        // Find coverage record for this room on the CURRENTLY SELECTED floor
                        const card = coverageRows.find(r =>
                          r.classrooms?.id === layout.id &&
                          r.classrooms?.building === building &&
                          r.classrooms?.floor === floor
                        );
                        const isCompleted = card?.status === 'covered';
                        const isUnassigned = !card || card.covered_by === null;
                        const hasRecord = !!card;
                        const assignee = card?.members?.name;
                        const bg = hasRecord
                          ? isCompleted ? 'var(--status-success-bg)' : 'var(--status-info-bg)'
                          : 'var(--bg-card)';
                        const fg = hasRecord
                          ? isCompleted ? 'var(--status-success-text)' : 'var(--status-info-text)'
                          : 'var(--text-secondary)';

                        return (
                          <div
                            key={layout.id}
                            onClick={() => {
                              if (isPastEvent()) { alert('This event has already ended.'); return; }
                              if (isAdmin) {
                                if (hasRecord) setReassignModal({ ...card, covered_by: card.covered_by ?? null });
                              } else if (!isUnassigned && hasRecord) {
                                toggleStatus(card);
                              }
                            }}
                            className="relative rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                            style={{
                              gridColumn: `${layout.col} / span 1`,
                              gridRow: layout.row + 1,
                              backgroundColor: bg,
                              color: fg,
                              border: `1.5px solid ${isUnassigned ? 'var(--border)' : isCompleted ? 'var(--status-success-text)' : 'var(--status-info-text)'}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                              minHeight: '64px',
                              transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
                              e.currentTarget.style.boxShadow = isUnassigned
                                ? '0 8px 20px rgba(99,102,241,0.15)'
                                : isCompleted
                                  ? '0 8px 20px rgba(34,197,94,0.2)'
                                  : '0 8px 20px rgba(59,130,246,0.2)';
                              e.currentTarget.style.borderColor = isUnassigned ? 'var(--accent)' : isCompleted ? 'var(--status-success-text)' : 'var(--status-info-text)';
                              e.currentTarget.style.zIndex = '10';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = '';
                              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                              e.currentTarget.style.borderColor = isUnassigned ? 'var(--border)' : isCompleted ? 'var(--status-success-text)' : 'var(--status-info-text)';
                              e.currentTarget.style.zIndex = '';
                            }}
                          >
                            <p className="text-xs font-bold text-center">{layout.label}</p>
                            {assignee ? (
                              <div className={`mt-1 w-full h-4 rounded-full ${memberColor(assignee)} flex items-center justify-center text-[8px] font-bold text-white truncate px-1`}>
                                {assignee}
                              </div>
                            ) : hasRecord ? (
                              <p className="text-[8px] mt-0.5 italic opacity-70">Tap to assign</p>
                            ) : (
                              <p className="text-[8px] mt-0.5 opacity-50 italic">No record</p>
                            )}
                            {isCompleted && (
                              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-success-text)', border: '2px solid var(--bg-card)' }}>
                                <svg className="w-2 h-2" style={{ color: 'var(--status-success-bg)' }} fill="none" viewBox="0 0 24 24" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Right wing rooms */}
                      {hasRightWing && rightWing.map(layout => {
                        const card = coverageRows.find(r =>
                          r.classrooms?.id === layout.id &&
                          r.classrooms?.building === building &&
                          r.classrooms?.floor === floor
                        );
                        const isCompleted = card?.status === 'covered';
                        const isUnassigned = !card || card.covered_by === null;
                        const hasRecord = !!card;
                        const assignee = card?.members?.name;
                        const bg = hasRecord
                          ? isCompleted ? 'var(--status-success-bg)' : 'var(--status-info-bg)'
                          : 'var(--bg-card)';
                        const fg = hasRecord
                          ? isCompleted ? 'var(--status-success-text)' : 'var(--status-info-text)'
                          : 'var(--text-secondary)';

                        return (
                          <div
                            key={layout.id}
                            onClick={() => {
                              if (isPastEvent()) { alert('This event has already ended.'); return; }
                              if (isAdmin) {
                                if (hasRecord) setReassignModal({ ...card, covered_by: card.covered_by ?? null });
                              } else if (!isUnassigned && hasRecord) {
                                toggleStatus(card);
                              }
                            }}
                            className="relative rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                            style={{
                              gridColumn: `${layout.col} / span 1`,
                              gridRow: layout.row + 1,
                              backgroundColor: bg,
                              color: fg,
                              border: `1.5px solid ${isUnassigned ? 'var(--border)' : isCompleted ? 'var(--status-success-text)' : 'var(--status-info-text)'}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                              minHeight: '64px',
                              transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
                              e.currentTarget.style.boxShadow = isUnassigned
                                ? '0 8px 20px rgba(99,102,241,0.15)'
                                : isCompleted
                                  ? '0 8px 20px rgba(34,197,94,0.2)'
                                  : '0 8px 20px rgba(59,130,246,0.2)';
                              e.currentTarget.style.borderColor = isUnassigned ? 'var(--accent)' : isCompleted ? 'var(--status-success-text)' : 'var(--status-info-text)';
                              e.currentTarget.style.zIndex = '10';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = '';
                              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                              e.currentTarget.style.borderColor = isUnassigned ? 'var(--border)' : isCompleted ? 'var(--status-success-text)' : 'var(--status-info-text)';
                              e.currentTarget.style.zIndex = '';
                            }}
                          >
                            <p className="text-xs font-bold text-center">{layout.label}</p>
                            {assignee ? (
                              <div className={`mt-1 w-full h-4 rounded-full ${memberColor(assignee)} flex items-center justify-center text-[8px] font-bold text-white truncate px-1`}>
                                {assignee}
                              </div>
                            ) : hasRecord ? (
                              <p className="text-[8px] mt-0.5 italic opacity-70">Tap to assign</p>
                            ) : (
                              <p className="text-[8px] mt-0.5 opacity-50 italic">No record</p>
                            )}
                            {isCompleted && (
                              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-success-text)', border: '2px solid var(--bg-card)' }}>
                                <svg className="w-2 h-2" style={{ color: 'var(--status-success-bg)' }} fill="none" viewBox="0 0 24 24" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Room cards — other buildings: grid fallback ───────────────────── */
        <FallbackRoomGrid
          roomCards={roomCards}
          availableClassrooms={availableClassrooms}
          isAdmin={isAdmin}
          roomsLoading={roomsLoading}
          onReassign={(card) => { if (isPastEvent()) { alert('This event has already ended.'); return; } setReassignModal({ ...card, covered_by: card.covered_by ?? null }); }}
          onToggle={toggleStatus}
          onOpenBulk={openBulkModal}
        />
      )}

      {/* ── Reassign Modal (admin) ─────────────────────────────────────────── */}
      <Modal
        isOpen={!!reassignModal}
        onClose={() => setReassignModal(null)}
        title={`Reassign Room ${reassignModal?.classrooms?.room_number}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-sm rounded-xl p-3 space-y-1" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
            <p><span className="font-medium" style={{ color: 'var(--text-primary)' }}>Building:</span> {reassignModal?.classrooms?.building}</p>
            <p><span className="font-medium" style={{ color: 'var(--text-primary)' }}>Floor:</span> {FLOOR_LABEL[reassignModal?.classrooms?.floor]}</p>
            <p><span className="font-medium" style={{ color: 'var(--text-primary)' }}>Room:</span> {reassignModal?.classrooms?.room_number}</p>
            <p><span className="font-medium" style={{ color: 'var(--text-primary)' }}>Batch:</span> {reassignModal?.batch === 'batch_1' ? 'Batch 1 (8AM–12:30PM)' : 'Batch 2 (2:30PM–5PM)'}</p>
          </div>

          <div>
            <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1.5">Assign to Member</label>
            <select
              value={reassignModal?.covered_by ?? ''}
              onChange={e => setReassignModal(prev => ({ ...prev, covered_by: e.target.value ? parseInt(e.target.value) : null }))}
              style={{ border: '1px solid var(--border)' }}
              className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              <option value="">— Unassigned —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setReassignModal(null)}
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              className="px-4 py-2 text-sm font-medium rounded-xl hover:opacity-80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReassign}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Bulk Assign Modal (admin) ───────────────────────────────────────── */}
      <Modal
        isOpen={bulkOpen}
        onClose={() => { setBulkOpen(false); }}
        title="Bulk Assign Rooms"
        size="md"
      >
        <div className="space-y-4" style={{ maxWidth: '40rem' }}>
          {/* Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1.5">Building</label>
              <select
                value={bulkBuilding}
                onChange={e => {
                  const b = e.target.value;
                  setBulkBuilding(b);
                  setBulkFloor(FLOORS_MAP[b]?.[0] ?? 1);
                  setBulkRoomIds([]);
                  loadBulkRooms(b, FLOORS_MAP[b]?.[0] ?? 1);
                }}
                style={{ border: '1px solid var(--border)' }}
                className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
              >
                {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1.5">Floor</label>
              <select
                value={bulkFloor}
                onChange={e => {
                  const f = parseInt(e.target.value);
                  setBulkFloor(f);
                  setBulkRoomIds([]);
                  loadBulkRooms(bulkBuilding, f);
                }}
                style={{ border: '1px solid var(--border)' }}
                className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
              >
                {(FLOORS_MAP[bulkBuilding] || []).map(f => <option key={f} value={f}>{FLOOR_LABEL[f]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1.5">Batch</label>
              <select
                value={bulkBatch}
                onChange={e => setBulkBatch(e.target.value)}
                style={{ border: '1px solid var(--border)' }}
                className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
              >
                {BATCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1.5">Assign to Member</label>
              <select
                value={bulkMember?.id ?? ''}
                onChange={e => setBulkMember(members.find(m => m.id === parseInt(e.target.value)) || null)}
                style={{ border: '1px solid var(--border)' }}
                className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
              >
                <option value="">— Select member —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* Room checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                Rooms in {bulkBuilding}, {FLOOR_LABEL[bulkFloor]}
              </label>
              <button
                type="button"
                onClick={() => setBulkRoomIds(bulkRoomsList.map(c => c.id))}
                disabled={bulkRoomsList.length === 0}
                className="text-xs text-indigo-500 hover:underline font-medium disabled:opacity-40"
              >
                Select all
              </button>
            </div>

            {bulkRoomsLoading ? (
              <div className="flex items-center justify-center py-8" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                <div className="h-5 w-5 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading rooms...</span>
              </div>
            ) : bulkRoomsList.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                No classrooms found for this building and floor. Try a different floor.
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto rounded-xl p-3" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                {bulkRoomsList.map(cls => {
                  const checked = bulkRoomIds.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      style={{
                        backgroundColor: checked ? 'var(--status-info-bg)' : 'var(--bg-card)',
                        color: checked ? 'var(--status-info-text)' : 'var(--text-secondary)'
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="accent-indigo-500"
                        checked={checked}
                        onChange={e =>
                          setBulkRoomIds(prev =>
                            e.target.checked ? [...prev, cls.id] : prev.filter(id => id !== cls.id)
                          )
                        }
                      />
                      <span className="font-medium">{cls.room_number}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {bulkRoomIds.length} room{bulkRoomIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Error message */}
          {bulkError && (
            <div style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' }} className="px-4 py-3 rounded-xl text-sm font-medium">
              {bulkError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setBulkOpen(false)}
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              className="px-4 py-2 text-sm font-medium rounded-xl hover:opacity-80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleBulkAssign()}
              disabled={saving || !bulkMember || bulkRoomIds.length === 0}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Assigning...' : `Assign ${bulkRoomIds.length} Room${bulkRoomIds.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
