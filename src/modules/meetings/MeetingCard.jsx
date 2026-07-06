import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function MeetingCard({ meeting }) {
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(meeting.attendance_submitted);

  useEffect(() => {
    async function init() {
      await initializeAttendance(meeting.id);
      await fetchMembers();
      await fetchAttendance();
    }
    init();
  }, []);

  // 🔥 Initialize attendance (SAFE - NO DUPLICATES)
  async function initializeAttendance(meetingId) {
    const { data: members } = await supabase
      .from("members")
      .select("id");

    for (let m of members || []) {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("meeting_id", meetingId)
        .eq("member_id", m.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("attendance").insert({
          meeting_id: meetingId,
          member_id: m.id,
          status: "absent",
        });
      }
    }
  }

  // 🔹 Fetch members
  async function fetchMembers() {
    const { data } = await supabase
      .from("members")
      .select("id, name");

    setMembers(data || []);
  }

  // 🔹 Fetch attendance
  async function fetchAttendance() {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("meeting_id", meeting.id);

    const map = {};
    data?.forEach((a) => {
      map[a.member_id] = a.status;
    });

    setAttendance(map);
  }

  // 🔥 SAFE UPDATE (NO 409 EVER)
  async function updateAttendance(memberId, status) {
    if (submitted) return;

    setAttendance((prev) => ({
      ...prev,
      [memberId]: status,
    }));

    // Check if exists
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("meeting_id", meeting.id)
      .eq("member_id", memberId)
      .maybeSingle();

    let error;

    if (existing) {
      const res = await supabase
        .from("attendance")
        .update({ status })
        .eq("id", existing.id);
      error = res.error;
    } else {
      const res = await supabase.from("attendance").insert({
        meeting_id: meeting.id,
        member_id: memberId,
        status,
      });
      error = res.error;
    }

    if (error) {
      console.error("❌ Save failed:", error);
      alert("Failed to save attendance");
      return;
    }

    await fetchAttendance(); // 🔥 keep UI synced
  }

  // 🔥 Mark all present
  async function markAllPresent() {
    if (submitted) return;

    for (let m of members) {
      await updateAttendance(m.id, "present");
    }
  }

  // 🔥 Submit attendance
  async function submitAttendance() {
    await supabase
      .from("meetings")
      .update({ attendance_submitted: true })
      .eq("id", meeting.id);

    setSubmitted(true);
  }

  // 🔥 Enable edit
  async function enableEdit() {
    await supabase
      .from("meetings")
      .update({ attendance_submitted: false })
      .eq("id", meeting.id);

    setSubmitted(false);
  }

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const total = members.length;
  const presentCount = Object.values(attendance).filter(
    (s) => s === "present"
  ).length;

  const percentage = total
    ? Math.round((presentCount / total) * 100)
    : 0;

  return (
    <div className="p-4 bg-white border rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold">{meeting.title}</h3>

      <p className="text-sm text-gray-500 mt-1">
        {new Date(meeting.date).toLocaleString()} • {meeting.location}
      </p>

      <div className="flex gap-3 mt-3">
        {meeting.mom_link && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(meeting.mom_link, "_blank");
            }}
            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            View MOM
          </button>
        )}

        <button
          onClick={() => setOpen(!open)}
          className="border px-3 py-1 rounded-lg text-sm"
        >
          Attendance ({presentCount}/{total})
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        {percentage}% Present
      </p>

      {open && (
        <div className="mt-4 border rounded-lg p-3 bg-gray-50">
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mb-3 border px-2 py-1 rounded"
          />

          {!submitted && (
            <button
              onClick={markAllPresent}
              className="mb-3 bg-blue-500 text-white px-2 py-1 rounded"
            >
              Mark All Present
            </button>
          )}

          <div className="max-h-48 overflow-y-auto">
            {filteredMembers.map((m) => (
              <div key={m.id} className="flex justify-between mb-2">
                <span>{m.name}</span>

                <select
                  disabled={submitted}
                  value={attendance[m.id] || "absent"}
                  onChange={(e) =>
                    updateAttendance(m.id, e.target.value)
                  }
                  className="border px-2 py-1 rounded"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-3">
            {!submitted ? (
              <button
                onClick={submitAttendance}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Submit
              </button>
            ) : (
              <button
                onClick={enableEdit}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}