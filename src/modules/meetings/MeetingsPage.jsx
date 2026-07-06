import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

import {
  PageHeader,
  Button,
  Loader,
  ErrorState,
  EmptyState,
  Modal,
} from "../../components";

import MeetingCard from "./MeetingCard";

export default function MeetingsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "moderator";

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newMeeting, setNewMeeting] = useState({
    title: "",
    date: "",
    location: "",
    mom_link: "",
    description: "",
  });

  useEffect(() => {
    fetchMeetings();
  }, []);

  async function fetchMeetings() {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      setMeetings(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMeeting() {
    if (!newMeeting.title || !newMeeting.date) return;

    setCreating(true);
    try {
      const { error } = await supabase.from("meetings").insert({
        ...newMeeting,
      });

      if (error) throw error;

      setShowModal(false);
      setNewMeeting({
        title: "",
        date: "",
        location: "",
        mom_link: "",
        description: "",
      });

      fetchMeetings();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* HEADER */}
        <PageHeader
          title="Meetings"
          subtitle="Schedule meetings and track Minutes of Meeting (MOM)"
          actions={
            isAdmin && (
              <Button onClick={() => setShowModal(true)}>
                + Schedule Meeting
              </Button>
            )
          }
        />

        {/* CONTENT */}
        {loading ? (
          <Loader text="Fetching meetings..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchMeetings} />
        ) : meetings.length === 0 ? (
          <EmptyState
            title="No meetings yet"
            description="Create your first meeting"
            action={
              isAdmin && (
                <Button onClick={() => setShowModal(true)}>
                  Create Meeting
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}

      </div>

      {/* MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Schedule Meeting"
      >
        <div className="space-y-4">

          <input
            type="text"
            placeholder="Meeting Title *"
            value={newMeeting.title}
            onChange={(e) =>
              setNewMeeting((p) => ({ ...p, title: e.target.value }))
            }
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="datetime-local"
            value={newMeeting.date}
            onChange={(e) =>
              setNewMeeting((p) => ({ ...p, date: e.target.value }))
            }
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            placeholder="Location"
            value={newMeeting.location}
            onChange={(e) =>
              setNewMeeting((p) => ({ ...p, location: e.target.value }))
            }
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            placeholder="MOM Link (Drive)"
            value={newMeeting.mom_link}
            onChange={(e) =>
              setNewMeeting((p) => ({ ...p, mom_link: e.target.value }))
            }
            className="w-full border px-3 py-2 rounded-lg"
          />

          <textarea
            placeholder="Description"
            value={newMeeting.description}
            onChange={(e) =>
              setNewMeeting((p) => ({ ...p, description: e.target.value }))
            }
            className="w-full border px-3 py-2 rounded-lg"
          />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>

            <Button
              onClick={handleCreateMeeting}
              disabled={creating}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>

        </div>
      </Modal>
    </div>
  );
}