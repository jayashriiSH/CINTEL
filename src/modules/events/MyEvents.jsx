import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  Loader,
  ErrorState,
} from '../../components/index';

// ─── Filter options ─────────────────────────────────────────────
const BUILDINGS = ['Tech Park 1', 'Tech Park 2', 'Main Block'];
const FLOORS_MAP = {
  'Tech Park 1': [1, 2, 3],
  'Tech Park 2': [1, 2],
  'Main Block': [0, 1, 2],
};

export default function MyEvents() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // C2C state
  const [classrooms, setClassrooms] = useState([]);
  const [classroomsLoading, setClassroomsLoading] = useState(true);
  const [building, setBuilding] = useState('Tech Park 1');
  const [floor, setFloor] = useState(1);

  useEffect(() => {
    fetchMyEvents();
    fetchClassrooms();

    // Realtime: listen for classroom changes
    const channel = supabase
      .channel('classrooms-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classrooms' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setClassrooms((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setClassrooms((prev) =>
              prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setClassrooms((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers' },
        () => fetchMyEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function fetchMyEvents() {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Filter by email since member_id is an integer FK, not a UUID
      const { data: volData, error: volError } = await supabase
        .from('volunteers')
        .select('event_id, team_id, role, events(id, name, date, location, type, status, description)')
        .eq('email', user.email);

      if (volError) throw volError;

      const mapped = (volData || [])
        .filter((v) => v.events)
        .map((v) => ({
          ...v.events,
          team: v.team_id,
          volunteerRole: v.role,
        }));
      setEvents(mapped);
    } catch (err) {
      console.error('Failed to fetch my events:', err);
      // Fallback: show recent public events
      try {
        const { data } = await supabase
          .from('events')
          .select('id, name, date, location, type, status')
          .order('date', { ascending: false })
          .limit(4);
        setEvents((data || []).map((e) => ({ ...e, volunteerRole: 'Volunteer', team: 'General' })));
      } catch {
        setError('Failed to load events');
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchClassrooms() {
    setClassroomsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('classrooms')
        .select('id, room_number, label, building, floor, capacity')
        .order('room_number');

      if (fetchError) throw fetchError;
      setClassrooms(data || []);
    } catch (err) {
      console.error('Failed to fetch classrooms:', err);
    } finally {
      setClassroomsLoading(false);
    }
  }

  // Filter classrooms by selected building & floor
  const filteredClassrooms = classrooms.filter(
    (c) =>
      (!building || c.building === building) &&
      (floor === '' || c.floor === floor)
  );

  // C2C computed stats
  const totalFiltered = filteredClassrooms.length;
  const totalCapacity = filteredClassrooms.reduce((sum, c) => sum + (c.capacity || 0), 0);



  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader text="Loading your events..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <ErrorState message={error} onRetry={fetchMyEvents} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-slate-800">My Events</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Events you're participating in</p>

        {/* Event Cards — dashed border style */}
        {events.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center mb-8">
            <p className="text-slate-400 text-sm">You haven't joined any events yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/member/events/${event.id}`)}
                className="cursor-pointer rounded-xl border-2 border-dashed border-indigo-300 bg-white p-5 hover:border-indigo-400 hover:shadow-md transition-all duration-200"
              >
                <h3 className="text-base font-semibold text-slate-800 mb-2">{event.name}</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {event.date
                      ? new Date(event.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'TBA'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location || 'TBA'}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {event.volunteerRole && (
                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-indigo-500 text-white">
                      {event.volunteerRole}
                    </span>
                  )}
                  {event.team && (
                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-emerald-500 text-white">
                      {event.team}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Classroom Coverage (C2C) ────────────────────────────── */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-bold text-slate-800">Classroom Coverage (C2C)</h2>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 px-6 pb-5">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-sm text-slate-600">Classrooms</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totalFiltered}</p>
              <p className="text-xs text-slate-400">in current filter</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-sm text-slate-600">Total Capacity</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{totalCapacity}</p>
              <p className="text-xs text-slate-400">seats available</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 px-6 pb-4">
            <select
              value={building}
              onChange={(e) => {
                setBuilding(e.target.value);
                setFloor(FLOORS_MAP[e.target.value]?.[0] ?? 1);
              }}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              {BUILDINGS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={floor}
              onChange={(e) => setFloor(parseInt(e.target.value))}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              {(FLOORS_MAP[building] || []).map((f) => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 px-6 pb-4">
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-3 w-3 rounded-sm bg-indigo-500" /> Classroom
            </span>
          </div>

          {/* Classroom Grid */}
          {classroomsLoading ? (
            <div className="px-6 pb-6">
              <Loader text="Loading classrooms..." />
            </div>
          ) : filteredClassrooms.length === 0 ? (
            <div className="px-6 pb-6 text-center py-10">
              <p className="text-slate-400 text-sm">No classrooms found for this filter combination.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 px-6 pb-6">
              {filteredClassrooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-left transition-all duration-200 hover:shadow-md"
                >
                  <p className="text-sm text-indigo-800 font-semibold">{room.room_number}</p>
                  {room.label && <p className="text-xs mt-0.5 text-indigo-500">{room.label}</p>}
                  <p className="text-xs mt-1.5 text-slate-500">
                    {room.capacity ? `${room.capacity} seats` : 'Capacity N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Footer note */}
          <div className="mx-6 mb-6 rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm text-slate-600">
              <span className="text-indigo-500 font-medium mr-1">ℹ️ Info:</span>
              Showing {totalFiltered} classrooms in {building}, Floor {floor}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
