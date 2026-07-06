/**
 * SubmissionsTab.jsx
 * - Awards (Winner / Runner Up) are stored in LOCAL React state only — never written to DB
 * - drive_link must start with https://
 * - Export CSV + Import from CSV
 * - Edit per row (team_name, members, drive_link only — NOT status/award)
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { Button, Loader, ErrorState, Modal } from "../../../components/index";

/* ── Award badge (display only, no DB) ─────────────────────────── */
function AwardBadge({ award }) {
  if (award === "winner")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">🏆 Winner</span>;
  if (award === "runner_up")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">🥈 Runner Up</span>;
  return null;
}

/* ── CSV helpers ─────────────────────────────────────────────────── */
function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function membersToString(members_json) {
  if (!members_json) return "";
  try {
    const arr = typeof members_json === "string" ? JSON.parse(members_json) : members_json;
    if (Array.isArray(arr)) return arr.map(m => (typeof m === "object" ? m.name || JSON.stringify(m) : m)).join(", ");
    return String(arr);
  } catch { return String(members_json); }
}

function stringToMembersJson(str) {
  return str.split(",").map(s => s.trim()).filter(Boolean);
}

export default function SubmissionsTab({ eventId }) {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "moderator";

  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /* ── LOCAL award state — never touches DB ── */
  const [awards, setAwards] = useState({});   // { [sub.id]: 'winner' | 'runner_up' | '' }

  /* ── Add modal ── */
  const [showAdd,  setShowAdd]  = useState(false);
  const [addForm,  setAddForm]  = useState({ team_name: "", members: "", drive_link: "" });
  const [addErr,   setAddErr]   = useState("");
  const [saving,   setSaving]   = useState(false);

  /* ── Edit modal ── */
  const [editTarget, setEditTarget] = useState(null);
  const [editForm,   setEditForm]   = useState({ team_name: "", members: "", drive_link: "" });
  const [editErr,    setEditErr]    = useState("");
  const [editSaving, setEditSaving] = useState(false);

  /* ── Delete modal ── */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  /* ── CSV import ── */
  const csvRef = useRef();

  useEffect(() => {
    fetchSubs();
    const ch = supabase
      .channel(`submissions-${eventId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `event_id=eq.${eventId}` },
        () => fetchSubs())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [eventId]);

  async function fetchSubs() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase
        .from("submissions").select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (e) throw e;
      setSubs(data || []);
    } catch (err) { console.error(err); setError(err.message); }
    finally { setLoading(false); }
  }

  /* ── Award (local state only — zero DB writes) ── */
  function handleSetAward(subId, value) {
    setAwards(prev => ({ ...prev, [subId]: value }));
  }

  /* ── Add submission ── */
  async function handleAdd() {
    setAddErr("");
    if (!addForm.team_name.trim()) return setAddErr("Team name is required.");
    if (!addForm.drive_link.trim()) return setAddErr("Drive link is required.");
    if (!addForm.drive_link.trim().startsWith("https://"))
      return setAddErr("Drive link must start with https://");

    setSaving(true);
    try {
      const { error: e } = await supabase.from("submissions").insert({
        event_id:     parseInt(eventId),
        team_name:    addForm.team_name.trim(),
        members_json: stringToMembersJson(addForm.members),
        drive_link:   addForm.drive_link.trim(),
      });
      if (e) throw e;
      setShowAdd(false);
      setAddForm({ team_name: "", members: "", drive_link: "" });
    } catch (err) { setAddErr("Failed: " + err.message); }
    finally { setSaving(false); }
  }

  /* ── Edit submission ── */
  function openEdit(sub) {
    setEditTarget(sub);
    setEditForm({
      team_name:  sub.team_name  || "",
      members:    membersToString(sub.members_json),
      drive_link: sub.drive_link || "",
    });
    setEditErr("");
  }

  async function handleEdit() {
    setEditErr("");
    if (!editForm.team_name.trim()) return setEditErr("Team name is required.");
    if (!editForm.drive_link.trim()) return setEditErr("Drive link is required.");
    if (!editForm.drive_link.trim().startsWith("https://"))
      return setEditErr("Drive link must start with https://");

    setEditSaving(true);
    try {
      const { error: e } = await supabase.from("submissions").update({
        team_name:    editForm.team_name.trim(),
        members_json: stringToMembersJson(editForm.members),
        drive_link:   editForm.drive_link.trim(),
        // ✅ NOT updating status — avoids enum error entirely
      }).eq("id", editTarget.id);
      if (e) throw e;
      setEditTarget(null);
    } catch (err) { setEditErr("Failed: " + err.message); }
    finally { setEditSaving(false); }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: e } = await supabase.from("submissions").delete().eq("id", deleteTarget.id);
      if (e) throw e;
      setDeleteTarget(null);
    } catch (err) { alert("Failed: " + err.message); }
    finally { setDeleting(false); }
  }

  /* ── Export CSV ── */
  function handleExport() {
    const header = ["Team Name", "Members", "Drive Link", "Submitted At"];
    const rows = subs.map(s => [
      `"${(s.team_name || "").replace(/"/g, '""')}"`,
      `"${membersToString(s.members_json).replace(/"/g, '""')}"`,
      `"${(s.drive_link || "").replace(/"/g, '""')}"`,
      `"${s.created_at ? new Date(s.created_at).toLocaleString() : ""}"`,
    ]);
    const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `submissions-${eventId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Import CSV ── */
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { alert("CSV appears empty (needs header + at least one row)."); return; }

    const rows = lines.slice(1); // skip header
    let imported = 0, skipped = 0;

    for (const line of rows) {
      const cols = parseCSVLine(line);
      const team_name  = cols[0] || "";
      const members    = cols[1] || "";
      const drive_link = cols[2] || "";

      if (!team_name) { skipped++; continue; }
      if (!drive_link.startsWith("https://")) { skipped++; continue; }

      const { error: e } = await supabase.from("submissions").insert({
        event_id:     parseInt(eventId),
        team_name:    team_name.trim(),
        members_json: stringToMembersJson(members),
        drive_link:   drive_link.trim(),
      });
      if (e) { console.error("Import row error:", e.message); skipped++; }
      else imported++;
    }

    alert(`Import complete: ${imported} added, ${skipped} skipped.`);
  }

  if (loading) return <Loader text="Loading submissions…" />;
  if (error)   return <ErrorState message={error} onRetry={fetchSubs} />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Submissions</h3>
          <p className="text-sm text-slate-500 mt-0.5">{subs.length} team{subs.length !== 1 ? "s" : ""} submitted</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={handleExport}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Export CSV
              </Button>
              <Button variant="secondary" onClick={() => csvRef.current?.click()}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"/>
                </svg>
                Import from CSV
              </Button>
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile}/>
            </>
          )}
          <Button onClick={() => { setAddForm({ team_name: "", members: "", drive_link: "" }); setAddErr(""); setShowAdd(true); }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Add Submission
          </Button>
        </div>
      </div>

      {/* Table */}
      {subs.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No submissions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {["Team Name", "Members", "Drive Link", "Award", "Submitted", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {subs.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  {/* Team Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{sub.team_name}</span>
                      <AwardBadge award={awards[sub.id] || ""} />
                    </div>
                  </td>

                  {/* Members */}
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px]">
                    {membersToString(sub.members_json) || <span className="text-slate-400 italic">—</span>}
                  </td>

                  {/* Drive Link */}
                  <td className="px-4 py-3">
                    {sub.drive_link ? (
                      <a href={sub.drive_link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                        View
                      </a>
                    ) : <span className="text-slate-400 italic text-xs">—</span>}
                  </td>

                  {/* Award — LOCAL only, no DB write */}
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        value={awards[sub.id] || ""}
                        onChange={e => handleSetAward(sub.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="">— None —</option>
                        <option value="winner">🏆 Winner</option>
                        <option value="runner_up">🥈 Runner Up</option>
                      </select>
                    ) : (
                      <AwardBadge award={awards[sub.id] || ""} />
                    )}
                  </td>

                  {/* Submitted At */}
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {sub.created_at ? new Date(sub.created_at).toLocaleString() : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(sub)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button onClick={() => setDeleteTarget(sub)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Submission" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Team Name <span className="text-red-500">*</span></label>
            <input type="text" value={addForm.team_name}
              onChange={e => setAddForm(p => ({ ...p, team_name: e.target.value }))}
              placeholder="e.g. Team Alpha"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Members <span className="text-slate-400 font-normal text-xs">(comma separated)</span></label>
            <input type="text" value={addForm.members}
              onChange={e => setAddForm(p => ({ ...p, members: e.target.value }))}
              placeholder="Alice, Bob, Carol"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Drive Link <span className="text-red-500">*</span></label>
            <input type="text" value={addForm.drive_link}
              onChange={e => setAddForm(p => ({ ...p, drive_link: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
            {addForm.drive_link && !addForm.drive_link.startsWith("https://") && (
              <p className="text-xs text-red-500 mt-1">Link must start with https://</p>
            )}
          </div>
          {addErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addErr}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !addForm.team_name || !addForm.drive_link || !addForm.drive_link.startsWith("https://")}>
              {saving ? "Saving…" : "Add Submission"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Submission" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Team Name <span className="text-red-500">*</span></label>
            <input type="text" value={editForm.team_name}
              onChange={e => setEditForm(p => ({ ...p, team_name: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Members <span className="text-slate-400 font-normal text-xs">(comma separated)</span></label>
            <input type="text" value={editForm.members}
              onChange={e => setEditForm(p => ({ ...p, members: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Drive Link <span className="text-red-500">*</span></label>
            <input type="text" value={editForm.drive_link}
              onChange={e => setEditForm(p => ({ ...p, drive_link: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
            {editForm.drive_link && !editForm.drive_link.startsWith("https://") && (
              <p className="text-xs text-red-500 mt-1">Link must start with https://</p>
            )}
          </div>
          {editErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editErr}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editSaving || !editForm.team_name || !editForm.drive_link || !editForm.drive_link.startsWith("https://")}>
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Submission" size="sm">
        <div className="text-center py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Delete submission by <strong>{deleteTarget?.team_name}</strong>? This cannot be undone.
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