import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { Loader, ErrorState, Button, Modal } from "../../../components/index";

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-indigo-500","bg-pink-500",
];

function avatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function RoleBadge({ role }) {
  const styles = {
    lead: "bg-purple-100 text-purple-700 border border-purple-200",
    core: "bg-blue-100 text-blue-700 border border-blue-200",
    moderator: "bg-amber-100 text-amber-700 border border-amber-200",
    admin: "bg-red-100 text-red-700 border border-red-200",
    member: "bg-slate-100 text-slate-600 border border-slate-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[role?.toLowerCase()] ?? styles.member}`}>
      {role}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatMonthYear(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export default function AdminProfile() {
  const { user, role } = useAuth();
  const [member, setMember] = useState(null);
  const [events, setEvents] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [totalMeetings, setTotalMeetings] = useState(0);

  // Admin-level stats
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalEventsManaged, setTotalEventsManaged] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAddAchievement, setShowAddAchievement] = useState(false);
  const [newAchievement, setNewAchievement] = useState({ title: "", description: "", date: "", proof_link: "", type: "certification" });
  const [addingAch, setAddingAch] = useState(false);

  useEffect(() => {
    if (user?.id) fetchProfile(user.id);
  }, [user]);

  async function fetchProfile(uid) {
    setLoading(true);
    setError(null);
    try {
      const { data: mem, error: memErr } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      if (memErr) throw memErr;
      if (!mem) { setLoading(false); return; }
      setMember(mem);
      setEditData({
        name: mem.name || "",
        phone: mem.phone || "",
        department: mem.department || "",
        year: mem.year || "",
        skills: mem.skills || "",
        bio: mem.bio || "",
        github_link: mem.github_link || "",
        linkedin_link: mem.linkedin_link || "",
      });

      // Admin-level aggregates
      const { count: memberCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true });
      setTotalMembers(memberCount ?? 0);

      const { count: eventCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);
      setTotalEventsManaged(eventCount ?? 0);

      const { count: taskCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_progress"]);
      setPendingTasks(taskCount ?? 0);

      const { count: mtgCount } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .lte("date", new Date().toISOString());
      setTotalMeetings(mtgCount ?? 0);

      // Attendance
      const { data: att } = await supabase
        .from("attendance")
        .select("id, status, meeting_id, meeting:meetings(id, title, date)")
        .eq("member_id", mem.id)
        .order("meeting(date)", { ascending: false });
      setAttendance((att || []).filter((a, i, arr) => arr.findIndex((x) => x.meeting_id === a.meeting_id) === i));

      // Events via volunteers
      const { data: vols } = await supabase
        .from("volunteers")
        .select("id, role, event:events(id, name, date, type, status)")
        .eq("member_id", mem.id);
      setEvents((vols || []).sort((a, b) => new Date(b.event?.date) - new Date(a.event?.date)));

      // Achievements
      const { data: ach } = await supabase
        .from("achievements")
        .select("*")
        .eq("member_id", mem.id)
        .order("date", { ascending: false });
      setAchievements(ach || []);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const { error } = await supabase.from("members").update(editData).eq("id", member.id);
      if (error) throw error;
      setEditMode(false);
      fetchProfile(user.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAchievement() {
    if (!newAchievement.title || !newAchievement.date) return;
    setAddingAch(true);
    try {
      const { error } = await supabase.from("achievements").insert({
        ...newAchievement,
        member_id: member.id,
      });
      if (error) throw error;
      setShowAddAchievement(false);
      setNewAchievement({ title: "", description: "", date: "", proof_link: "", type: "certification" });
      fetchProfile(user.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingAch(false);
    }
  }

  if (loading) return <Loader text="Loading your profile..." />;
  if (error) return <ErrorState message={error} onRetry={() => fetchProfile(user.id)} />;
  if (!member) return null;

  const skills = member.skills ? member.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const attendedCount = attendance.filter((a) => a.status === "present").length;
  const attendancePct = totalMeetings ? Math.round((attendedCount / totalMeetings) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm shadow-red-200/50">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Profile</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Your admin account details and platform overview</p>
        </div>

        {/* Stat Row — Admin Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "My Events", value: events.length },
            { label: "My Achievements", value: achievements.length },
            { label: "Total Members", value: totalMembers },
            { label: "Platform Events", value: totalEventsManaged },
            { label: "Pending Tasks", value: pendingTasks },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Stat Row — Personal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Meetings Attended", value: attendedCount, color: "text-slate-800" },
            { label: "Attendance", value: `${attendancePct}%`, color: attendancePct >= 90 ? "text-emerald-500" : attendancePct >= 75 ? "text-amber-500" : "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

          {/* LEFT — Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col items-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 ${avatarColor(member.id)}`}>
                {getInitials(member.name)}
              </div>
              <h2 className="text-xl font-bold text-slate-800">{member.name || "—"}</h2>
              <p className="text-sm text-slate-500">{member.department || "No department"} {member.year ? `· ${member.year} Year` : ""}</p>
              <div className="mt-2"><RoleBadge role={role} /></div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {member.phone}
                </div>
              )}
              {member.github_link && (
                <a href={member.github_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span className="truncate">{member.github_link.replace("https://", "")}</span>
                </a>
              )}
              {member.linkedin_link && (
                <a href={member.linkedin_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span className="truncate">{member.linkedin_link.replace("https://www.", "").replace("https://", "")}</span>
                </a>
              )}
            </div>

            {skills.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {member.bio && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Bio</p>
                <p className="text-sm text-slate-600 leading-relaxed">{member.bio}</p>
              </div>
            )}

            <button
              onClick={() => setEditMode(true)}
              className="mt-6 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Edit Profile
            </button>
          </div>

          {/* RIGHT — Activity */}
          <div className="space-y-5">

            {/* Events */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">My Events</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {events.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-slate-400 text-center">No events registered yet</p>
                ) : events.map((v) => (
                  <div key={v.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{v.event?.name || "—"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {v.role ? `Role: ${v.role}` : "Volunteer"}&nbsp;·&nbsp;
                        <span className={`capitalize ${v.event?.status === "completed" ? "text-emerald-500" : "text-slate-500"}`}>{v.event?.status?.replace("_", " ")}</span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 flex-shrink-0 ml-4">{formatMonthYear(v.event?.date)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Achievements</h3>
                <button
                  onClick={() => setShowAddAchievement(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {achievements.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-slate-400 text-center">No achievements yet. Add your first one!</p>
                ) : achievements.map((ach) => (
                  <div key={ach.id} className="px-5 py-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-base">🏆</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{ach.title}</p>
                          {ach.description && <p className="text-xs text-slate-500 mt-0.5">{ach.description}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDate(ach.date)}</span>
                      </div>
                      {ach.proof_link && (
                        <a href={ach.proof_link} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                          {ach.proof_link.includes("linkedin") ? "LinkedIn" : ach.proof_link.includes("drive") ? "Drive" : "Certificate"}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Meetings */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Recent Meetings</h3>
                <span className="text-xs text-slate-400">{attendedCount} / {totalMeetings} attended</span>
              </div>
              <div className="divide-y divide-slate-100">
                {attendance.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-slate-400 text-center">No meeting records found</p>
                ) : attendance.slice(0, 5).map((a) => (
                  <div key={a.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{a.meeting?.title || "—"}</p>
                      <p className="text-xs text-slate-400">{formatDate(a.meeting?.date)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      a.status === "present" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                    }`}>
                      {a.status === "present" ? "Present" : "Absent"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={editMode} onClose={() => setEditMode(false)} title="Edit Profile">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" value={editData.name}
              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <input type="text" value={editData.department}
                onChange={(e) => setEditData((p) => ({ ...p, department: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <input type="text" value={editData.year}
                onChange={(e) => setEditData((p) => ({ ...p, year: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input type="text" value={editData.phone}
              onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Skills <span className="text-slate-400 font-normal">(comma separated)</span></label>
            <input type="text" value={editData.skills}
              onChange={(e) => setEditData((p) => ({ ...p, skills: e.target.value }))}
              placeholder="e.g. React, Python, Figma"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">GitHub URL</label>
            <input type="text" value={editData.github_link}
              onChange={(e) => setEditData((p) => ({ ...p, github_link: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
            <input type="text" value={editData.linkedin_link}
              onChange={(e) => setEditData((p) => ({ ...p, linkedin_link: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
            <textarea value={editData.bio}
              onChange={(e) => setEditData((p) => ({ ...p, bio: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Achievement Modal */}
      <Modal isOpen={showAddAchievement} onClose={() => setShowAddAchievement(false)} title="Add Achievement">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input type="text" placeholder="e.g. AWS Certified Developer" value={newAchievement.title}
              onChange={(e) => setNewAchievement((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea placeholder="Brief description of the achievement..." value={newAchievement.description}
              onChange={(e) => setNewAchievement((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Earned *</label>
              <input type="date" value={newAchievement.date}
                onChange={(e) => setNewAchievement((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={newAchievement.type}
                onChange={(e) => setNewAchievement((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                <option value="certification">Certification</option>
                <option value="award">Award</option>
                <option value="hackathon">Hackathon</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proof Link <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="text" placeholder="https://..." value={newAchievement.proof_link}
              onChange={(e) => setNewAchievement((p) => ({ ...p, proof_link: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddAchievement(false)}>Cancel</Button>
            <Button onClick={handleAddAchievement} disabled={addingAch || !newAchievement.title || !newAchievement.date}>
              {addingAch ? "Adding..." : "Add Achievement"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}