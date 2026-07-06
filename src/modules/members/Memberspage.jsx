import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  PageHeader,
  Button,
  Loader,
  ErrorState,
  EmptyState,
  Modal,
} from "../../components";

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-indigo-500","bg-pink-500",
];
function avatarColor(id) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

function RoleBadge({ role }) {
  const styles = {
    lead:      "bg-purple-100 text-purple-700 border border-purple-200",
    core:      "bg-blue-100   text-blue-700   border border-blue-200",
    moderator: "bg-amber-100  text-amber-700  border border-amber-200",
    member:    "bg-slate-100  text-slate-600  border border-slate-200",
  };
  const cls = styles[role?.toLowerCase()] ?? styles.member;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {role}
    </span>
  );
}

function AttendancePct({ pct, attended, total }) {
  const num = parseFloat(pct ?? 0);
  const color = num >= 90 ? "text-emerald-600" : num >= 75 ? "text-amber-500" : "text-red-500";
  return (
    <div>
      <span className={`font-semibold ${color}`}>{num}%</span>
      {total > 0 && (
        <p className="text-xs text-slate-400 mt-0.5">{attended}/{total} meetings</p>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "moderator";
  const navigate = useNavigate();

  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [search, setSearch]         = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [yearFilter, setYearFilter] = useState("All Years");
  const [actFilter, setActFilter]   = useState("Activity Level");

  const [showModal, setShowModal]   = useState(false);
  const [creating, setCreating]     = useState(false);
  const [newMember, setNewMember]   = useState({
    name: "", email: "", roll_number: "", phone: "",
    department: "", year: "", role: "member",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // holds member obj
  const [deleting, setDeleting]     = useState(false);

  const [editMember, setEditMember] = useState(null); // holds member obj for edit
  const [saving, setSaving]         = useState(false);

  const [importing, setImporting]   = useState(false);

  // ── derived lists ─────────────────────────────────────────────────────────

  const departments = ["All Departments", ...new Set(members.map((m) => m.department).filter(Boolean))];
  const years       = ["All Years",        ...new Set(members.map((m) => m.year).filter(Boolean))];

  // ── fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchMembers(); }, []);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    try {
    // 1️⃣ Total ALL meetings — correct denominator
const { count: totalMeetings, error: mtgErr } = await supabase
  .from("meetings")
  .select("*", { count: "exact", head: true });

if (mtgErr) throw mtgErr;
      // 2️⃣ Members with their attendance rows (only "present" status needed)
      //    Tasks and volunteer event counts fetched separately for clarity
      const { data, error: memErr } = await supabase
  .from("members")
  .select(`
    id, name, email, department, year, role,
    attendance!left ( id, status, meeting_id ),
    tasks:tasks ( id ),
    volunteers ( event_id )
  `)
        .is("deleted_at", null)
        .order("name");
      if (memErr) throw memErr;

      const shaped = (data || []).map((m) => {
        // Deduplicate by meeting_id in case of duplicate rows
        const seen = new Set();
        const uniqueAttendance = (m.attendance || []).filter((a) => {
          if (seen.has(a.meeting_id)) return false;
          seen.add(a.meeting_id);
          return true;
        });

        const attended = uniqueAttendance.filter((a) => a.status === "present").length;

        // totalMeetings is the full count of all past meetings —
        // members with NO record for a meeting are implicitly absent
        const pct = totalMeetings > 0
          ? Math.round((attended / totalMeetings) * 100)
          : 0;

        // Debug — remove after confirming numbers look right
        if (process.env.NODE_ENV === "development") {
          console.log(`[${m.name}] attended=${attended} totalMeetings=${totalMeetings} pct=${pct}%`);
        }

        return {
          ...m,
          events_count:     m.volunteers?.length ?? 0,
          tasks_count:      m.tasks?.length ?? 0,
          attendance_count: attended,
          total_meetings:   totalMeetings ?? 0,
          attendance_pct:   pct,
        };
      });

      setMembers(shaped);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── create ────────────────────────────────────────────────────────────────

  async function handleCreateMember() {
    if (!newMember.name || !newMember.email) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("members").insert({ ...newMember });
      if (error) throw error;
      setShowModal(false);
      setNewMember({ name: "", email: "", roll_number: "", phone: "", department: "", year: "", role: "member" });
      fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ── edit ──────────────────────────────────────────────────────────────────

  async function handleSaveEdit() {
    if (!editMember) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("members")
        .update({
          name: editMember.name,
          email: editMember.email,
          department: editMember.department,
          year: editMember.year,
          phone: editMember.phone,
          role: editMember.role,
        })
        .eq("id", editMember.id);
      if (error) throw error;
      setEditMember(null);
      fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── soft delete ───────────────────────────────────────────────────────────

  async function handleDelete(member) {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("members")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", member.id);
      if (error) throw error;
      setShowDeleteConfirm(null);
      fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  // ── CSV import ────────────────────────────────────────────────────────────

  async function handleImportCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text    = await file.text();
      const lines   = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows    = lines.slice(1).map((line) => {
        const vals = line.split(",");
        return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim()]));
      });
      const { error } = await supabase.from("members").insert(rows);
      if (error) throw error;
      fetchMembers();
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  // ── filter ────────────────────────────────────────────────────────────────

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    const matchDept   = deptFilter === "All Departments" || m.department === deptFilter;
    const matchYear   = yearFilter === "All Years"       || m.year === yearFilter;
    let   matchAct    = true;
    if (actFilter === "High (≥90%)")      matchAct = m.attendance_pct >= 90;
    if (actFilter === "Medium (75–89%)") matchAct = m.attendance_pct >= 75 && m.attendance_pct < 90;
    if (actFilter === "Low (<75%)")      matchAct = m.attendance_pct < 75;
    return matchSearch && matchDept && matchYear && matchAct;
  });

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* HEADER */}
        <PageHeader
          title="Members"
          subtitle="Manage your club members and track their participation"
          actions={
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  {importing ? "Importing…" : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 12l8-8m0 0l8 8M12 4v12" />
                      </svg>
                      Import CSV
                    </>
                  )}
                </span>
              </label>
              {isAdmin && (
                <Button onClick={() => setShowModal(true)}>+ Add Member</Button>
              )}
            </div>
          }
        />

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 mt-6 mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[170px]">
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[130px]">
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
          <select value={actFilter} onChange={(e) => setActFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[160px]">
            {["Activity Level","High (≥90%)","Medium (75–89%)","Low (<75%)"].map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>

        {/* STATS ROW */}
        {!loading && !error && (
          <div className="flex gap-4 mb-5 text-sm text-slate-500">
            <span><strong className="text-slate-800">{filtered.length}</strong> members shown</span>
            {filtered.length !== members.length && (
              <button onClick={() => { setSearch(""); setDeptFilter("All Departments"); setYearFilter("All Years"); setActFilter("Activity Level"); }}
                className="text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>
        )}

        {/* TABLE */}
        {loading ? (
          <Loader text="Fetching members..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchMembers} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No members found"
            description={search ? "Try adjusting your search or filters" : "Add your first member"}
            action={isAdmin && !search && <Button onClick={() => setShowModal(true)}>Add Member</Button>}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Member","Department","Year","Role","Events","Tasks","Attendance","Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">

                    {/* Member */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(member.id)}`}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 leading-tight">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-600">{member.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{member.year || "—"}</td>
                    <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{member.events_count}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{member.tasks_count}</td>

                    {/* Attendance */}
                    <td className="px-4 py-3">
                      <AttendancePct
                        pct={member.attendance_pct}
                        attended={member.attendance_count}
                        total={member.total_meetings}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/members/${member.id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          View
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setEditMember({ ...member })}
                              className="text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(member)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD MEMBER MODAL ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Member">
        <div className="space-y-4">
          <input type="text" placeholder="Full Name *" value={newMember.name}
            onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
            className="w-full border px-3 py-2 rounded-lg text-sm" />
          <input type="email" placeholder="Email *" value={newMember.email}
            onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
            className="w-full border px-3 py-2 rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Roll Number" value={newMember.roll_number}
              onChange={(e) => setNewMember((p) => ({ ...p, roll_number: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
            <input type="text" placeholder="Phone" value={newMember.phone}
              onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Department" value={newMember.department}
              onChange={(e) => setNewMember((p) => ({ ...p, department: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
            <input type="text" placeholder="Year (e.g. 2nd)" value={newMember.year}
              onChange={(e) => setNewMember((p) => ({ ...p, year: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
          </div>
          <select value={newMember.role}
            onChange={(e) => setNewMember((p) => ({ ...p, role: e.target.value }))}
            className="w-full border px-3 py-2 rounded-lg text-sm text-slate-700">
            <option value="member">Member</option>
            <option value="lead">Lead</option>
            <option value="core">Core</option>
            <option value="moderator">Moderator</option>
          </select>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreateMember} disabled={creating || !newMember.name || !newMember.email}>
              {creating ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── EDIT MEMBER MODAL ── */}
      <Modal isOpen={!!editMember} onClose={() => setEditMember(null)} title="Edit Member">
        {editMember && (
          <div className="space-y-4">
            <input type="text" placeholder="Full Name *" value={editMember.name}
              onChange={(e) => setEditMember((p) => ({ ...p, name: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
            <input type="email" placeholder="Email *" value={editMember.email}
              onChange={(e) => setEditMember((p) => ({ ...p, email: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Department" value={editMember.department || ""}
                onChange={(e) => setEditMember((p) => ({ ...p, department: e.target.value }))}
                className="w-full border px-3 py-2 rounded-lg text-sm" />
              <input type="text" placeholder="Year" value={editMember.year || ""}
                onChange={(e) => setEditMember((p) => ({ ...p, year: e.target.value }))}
                className="w-full border px-3 py-2 rounded-lg text-sm" />
            </div>
            <input type="text" placeholder="Phone" value={editMember.phone || ""}
              onChange={(e) => setEditMember((p) => ({ ...p, phone: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
            <select value={editMember.role}
              onChange={(e) => setEditMember((p) => ({ ...p, role: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm text-slate-700">
              <option value="member">Member</option>
              <option value="lead">Lead</option>
              <option value="core">Core</option>
              <option value="moderator">Moderator</option>
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditMember(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Remove Member">
        {showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              Are you sure you want to remove{" "}
              <strong className="text-slate-800">{showDeleteConfirm.name}</strong>? This action can be undone by an admin.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? "Removing..." : "Remove Member"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}