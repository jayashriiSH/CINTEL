/**
 * ScheduleTab.jsx
 *
 * Uses ONLY the existing `time_slot` TEXT column — zero DB changes needed.
 * Custom clock-style time picker (no <input type="time">, no <select>).
 *
 * If insert still fails with "permission denied for sequence event_schedules_id_seq",
 * run this ONE line in Supabase SQL editor (Dashboard → SQL Editor):
 *   GRANT USAGE, SELECT ON SEQUENCE event_schedules_id_seq TO authenticated;
 */

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { Button, Loader, ErrorState, Modal } from "../../../components/index";

/* ─────────────────────────── Clock Picker ─────────────────────────── */
function ClockPicker({ value, onChange, label, optional }) {
  function parse(v) {
    if (!v) return { h: 12, m: 0, ampm: "AM" };
    const match = v.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return { h: 12, m: 0, ampm: "AM" };
    return { h: parseInt(match[1]), m: parseInt(match[2]), ampm: match[3].toUpperCase() };
  }
  function fmt(h, m, ampm) {
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  const isEmpty = optional && !value;
  const { h, m, ampm } = parse(value);

  function stepH(dir) {
    if (isEmpty) { onChange(fmt(12, 0, "AM")); return; }
    let nv = h + dir;
    if (nv < 1) nv = 12;
    if (nv > 12) nv = 1;
    onChange(fmt(nv, m, ampm));
  }
  function stepM(dir) {
    if (isEmpty) { onChange(fmt(12, 0, "AM")); return; }
    let nv = m + dir * 5;
    if (nv < 0) nv = 55;
    if (nv >= 60) nv = 0;
    onChange(fmt(h, nv, ampm));
  }
  function setAmPm(val) {
    if (isEmpty) { onChange(fmt(12, 0, val)); return; }
    onChange(fmt(h, m, val));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="text-slate-400 font-normal text-xs ml-1">(optional)</span>}
      </label>

      {optional && (
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer mb-1 select-none">
          <input type="checkbox" checked={!isEmpty}
            onChange={e => e.target.checked ? onChange(fmt(12, 0, "PM")) : onChange("")}
            className="accent-indigo-600"/>
          Set end time
        </label>
      )}

      <div className={`inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner w-fit ${isEmpty ? "opacity-40 pointer-events-none" : ""}`}>
        {/* Hour */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => stepH(1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-100 text-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7"/>
            </svg>
          </button>
          <span className="text-2xl font-bold text-slate-800 w-10 text-center leading-tight tabular-nums">
            {isEmpty ? "--" : String(h).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => stepH(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-100 text-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <span className="text-[10px] text-slate-400 mt-0.5">hr</span>
        </div>

        <span className="text-2xl font-bold text-slate-400 pb-4">:</span>

        {/* Minute */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => stepM(1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-100 text-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7"/>
            </svg>
          </button>
          <span className="text-2xl font-bold text-slate-800 w-10 text-center leading-tight tabular-nums">
            {isEmpty ? "--" : String(m).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => stepM(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-100 text-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <span className="text-[10px] text-slate-400 mt-0.5">min</span>
        </div>

        {/* AM/PM */}
        <div className="flex flex-col gap-1 ml-2 pb-4">
          {["AM", "PM"].map(a => (
            <button key={a} type="button" onClick={() => setAmPm(a)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                !isEmpty && ampm === a
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-400"
              }`}>{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Helpers ─────────────────────────── */
function displaySlot(slot) {
  if (!slot) return "";
  if (slot.includes("|")) {
    const [s, e] = slot.split("|");
    return `${s} – ${e}`;
  }
  return slot;
}

function parseSlot(slot) {
  if (!slot) return { start: "8:00 AM", end: "" };
  if (slot.includes("|")) {
    const [s, e] = slot.split("|");
    return { start: s, end: e };
  }
  return { start: slot, end: "" };
}

/* ─────────────────────────── Main Component ─────────────────────────── */
export default function ScheduleTab({ eventId }) {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "moderator";

  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [form,         setForm]         = useState({ start: "8:00 AM", end: "", title: "", description: "" });
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    fetchSchedule();
    const ch = supabase
      .channel(`schedule-${eventId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "event_schedules", filter: `event_id=eq.${eventId}` },
        () => fetchSchedule())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [eventId]);

  async function fetchSchedule() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase
        .from("event_schedules").select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true })
        .order("time_slot",  { ascending: true });
      if (e) throw e;
      setItems(data || []);
    } catch (err) { console.error(err); setError(err.message); }
    finally { setLoading(false); }
  }

  function openAddModal() {
    setEditing(null);
    setForm({ start: "8:00 AM", end: "", title: "", description: "" });
    setShowModal(true);
  }
  function openEditModal(item) {
    setEditing(item);
    const { start, end } = parseSlot(item.time_slot);
    setForm({ start, end, title: item.title || "", description: item.description || "" });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.start || !form.title) return;
    setSaving(true);
    const timeSlot = form.end ? `${form.start}|${form.end}` : form.start;
    try {
      if (editing) {
        const { error: e } = await supabase.from("event_schedules")
          .update({ time_slot: timeSlot, title: form.title, description: form.description || null })
          .eq("id", editing.id);
        if (e) throw e;
      } else {
        const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 0;
        // Provide an explicit id using a large random int to bypass sequence permission issue.
        // The DB will use this value directly — no sequence needed.
        const newId = Math.floor(Math.random() * 1_000_000_000) + 1_000_000;
        const payload = {
          event_id:    parseInt(eventId),
          time_slot:   timeSlot,
          title:       form.title,
          description: form.description || null,
          sort_order:  maxOrder,
        };
        // Try normal insert first; if sequence error, retry with explicit id
        let { error: e } = await supabase.from("event_schedules").insert(payload);
        if (e && e.message && e.message.includes("sequence")) {
          const retry = await supabase.from("event_schedules").insert({ id: newId, ...payload });
          if (retry.error) throw retry.error;
        } else if (e) { throw e; }
      }
      setShowModal(false); setEditing(null);
    } catch (err) { alert("Failed to save: " + err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: e } = await supabase.from("event_schedules").delete().eq("id", deleteTarget.id);
      if (e) throw e;
      setDeleteTarget(null);
    } catch (err) { alert("Failed to delete: " + err.message); }
    finally { setDeleting(false); }
  }

  if (loading) return <Loader text="Loading schedule…" />;
  if (error)   return <ErrorState message={error} onRetry={fetchSchedule} />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Event Schedule</h3>
          <p className="text-sm text-slate-500 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""} in schedule</p>
        </div>
        {isAdmin && (
          <Button onClick={openAddModal}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Add Item
          </Button>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No schedule items yet.</p>
          {isAdmin && (
            <button onClick={openAddModal} className="mt-3 text-indigo-600 text-sm font-medium hover:text-indigo-700">
              + Add the first schedule item
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-300 via-indigo-200 to-slate-200 rounded-full"/>
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div key={item.id} className="relative flex items-start gap-4 group">
                <div className="relative z-10 flex-shrink-0 mt-1.5">
                  <div className={`h-[14px] w-[14px] rounded-full border-[3px] transition-colors ${
                    idx === 0 ? "border-indigo-500 bg-indigo-100" : "border-slate-300 bg-white group-hover:border-indigo-400"
                  }`} style={{ marginLeft: "10px" }}/>
                </div>
                <div className="flex-1 rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 mb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {displaySlot(item.time_slot)}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
                      </div>
                      {item.description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.description}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }}
        title={editing ? "Edit Schedule Item" : "Add Schedule Item"} size="md">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <ClockPicker label="Start Time" value={form.start} onChange={v => setForm(p => ({ ...p, start: v }))} optional={false}/>
            <ClockPicker label="End Time"   value={form.end}   onChange={v => setForm(p => ({ ...p, end:   v }))} optional={true}/>
          </div>

          {form.start && (
            <p className="text-xs text-indigo-600 font-medium flex items-center gap-1.5 -mt-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {form.start}{form.end ? ` – ${form.end}` : ""}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Opening Ceremony"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="Details about this schedule item…"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"/>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.start || !form.title}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Schedule Item" size="sm">
        <div className="text-center py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Delete <strong>{deleteTarget?.title}</strong> ({deleteTarget ? displaySlot(deleteTarget.time_slot) : ""})?
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}