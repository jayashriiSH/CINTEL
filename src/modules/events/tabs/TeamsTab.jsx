import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import {
  Button,
  Loader,
  ErrorState,
  EmptyState,
  Modal,
  StatusBadge,
} from '../../../components/index';

export default function TeamsTab({ eventId }) {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'moderator';

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create team modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '' });
  const [creating, setCreating] = useState(false);

  // Assign volunteer modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [assignCandidates, setAssignCandidates] = useState([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchTeams();

    // Realtime for teams
    const channel = supabase
      .channel(`teams-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `event_id=eq.${eventId}` },
        () => fetchTeams() // Re-fetch to get nested members
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers' },
        () => fetchTeams()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function fetchTeams() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('teams')
        .select('id, name, leader_id, volunteers(id, name, role)')
        .eq('event_id', eventId)
        .order('name');

      if (fetchError) throw fetchError;

      const mapped = (data || []).map((t) => ({
        ...t,
        members: t.volunteers || [],
      }));
      setTeams(mapped);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam() {
    if (!newTeam.name) return;
    setCreating(true);
    try {
      const { error: insertError } = await supabase
        .from('teams')
        .insert({ event_id: eventId, name: newTeam.name });

      if (insertError) throw insertError;
      // Realtime handles UI
      setShowCreateModal(false);
      setNewTeam({ name: '' });
    } catch (err) {
      alert('Failed to create team: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function openAssignModal(team) {
    setSelectedTeam(team);
    setSelectedVolunteerId('');
    setShowAssignModal(true);
    setAssignLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('volunteers')
        .select('id, name, email, team_id')
        .eq('event_id', eventId)
        .order('name');

      if (fetchError) throw fetchError;

      // Show volunteers not already in this team; this allows assignment and reassignment.
      const candidates = (data || []).filter((v) => String(v.team_id || '') !== String(team.id));
      setAssignCandidates(candidates);
    } catch (err) {
      alert('Failed to load volunteers: ' + err.message);
      setAssignCandidates([]);
    } finally {
      setAssignLoading(false);
    }
  }

  function closeAssignModal() {
    setShowAssignModal(false);
    setSelectedTeam(null);
    setAssignCandidates([]);
    setSelectedVolunteerId('');
    setAssignLoading(false);
  }

  async function handleAssignVolunteer() {
    if (!selectedTeam?.id || !selectedVolunteerId) return;
    setAssigning(true);

    try {
      const { error: updateError } = await supabase
        .from('volunteers')
        .update({ team_id: selectedTeam.id })
        .eq('id', Number(selectedVolunteerId))
        .eq('event_id', eventId);

      if (updateError) throw updateError;

      closeAssignModal();
      fetchTeams();
    } catch (err) {
      alert('Failed to assign volunteer: ' + err.message);
    } finally {
      setAssigning(false);
    }
  }

  const teamColors = [
    'from-indigo-500 to-violet-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-blue-500',
    'from-fuchsia-500 to-purple-500',
  ];

  if (loading) return <Loader text="Loading teams..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTeams} />;

  return (
    <div className="py-4 space-y-4">
      {isAdmin && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Team
          </Button>
        </div>
      )}

      {teams.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No teams yet"
          description="Create teams and assign volunteers to organize the event"
          action={isAdmin && <Button onClick={() => setShowCreateModal(true)}>Create Team</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team, idx) => (
            <div key={team.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <div className={`h-2 bg-gradient-to-r ${teamColors[idx % teamColors.length]}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-base font-semibold text-slate-800">{team.name}</h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500 font-medium">
                    {team.members?.length || 0} members
                  </span>
                </div>
                {team.description && <p className="text-xs text-slate-400 mb-4">{team.description}</p>}

                <div className="space-y-2">
                  {(team.members || []).map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${teamColors[idx % teamColors.length]} flex items-center justify-center text-white text-xs font-bold`}>
                          {member.name?.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-700">{member.name}</span>
                      </div>
                      {member.role === 'Lead' && <StatusBadge status="assigned" size="xs" />}
                    </div>
                  ))}
                  {(!team.members || team.members.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-3">No members assigned</p>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => openAssignModal(team)}
                    className="mt-3 w-full py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-dashed border-indigo-200"
                  >
                    + Assign Volunteer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Team">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Team Name *</label>
            <input type="text" value={newTeam.name} onChange={(e) => setNewTeam((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" placeholder="e.g. Tech Team" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={creating || !newTeam.name}>
              {creating ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAssignModal}
        onClose={closeAssignModal}
        title={selectedTeam ? `Assign Volunteer - ${selectedTeam.name}` : 'Assign Volunteer'}
      >
        <div className="space-y-4">
          {assignLoading ? (
            <p className="text-sm text-slate-500">Loading volunteers...</p>
          ) : assignCandidates.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">No volunteers available to assign for this event.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Volunteer</label>
              <select
                value={selectedVolunteerId}
                onChange={(e) => setSelectedVolunteerId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="">Choose a volunteer</option>
                {assignCandidates.map((vol) => (
                  <option key={vol.id} value={vol.id}>
                    {vol.name}{vol.email ? ` (${vol.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeAssignModal}>Cancel</Button>
            <Button
              onClick={handleAssignVolunteer}
              disabled={assigning || assignLoading || !selectedVolunteerId || assignCandidates.length === 0}
            >
              {assigning ? 'Assigning...' : 'Assign Volunteer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
