import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import {
  Table,
  StatusBadge,
  Button,
  Loader,
  ErrorState,
  Modal,
  SearchInput,
} from '../../../components/index';


export default function VolunteersTab({ eventId }) {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'moderator';
  const csvInputRef = useRef(null);

  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // All volunteers from DB (for dropdown)
  const [allVolunteers, setAllVolunteers] = useState([]);

  // Add volunteer modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVolunteer, setNewVolunteer] = useState({ name: '', email: '', phone: '', team_id: '', role: '', type: 'internal' });
  const [adding, setAdding] = useState(false);

  // CSV import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { success, failed }

  useEffect(() => {
    fetchVolunteers();
    fetchAllVolunteers();

    // Realtime subscription
    const channel = supabase
      .channel(`volunteers-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVolunteers((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setVolunteers((prev) =>
              prev.map((v) => (v.id === payload.new.id ? { ...v, ...payload.new } : v))
            );
          } else if (payload.eventType === 'DELETE') {
            setVolunteers((prev) => prev.filter((v) => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function fetchVolunteers() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('volunteers')
        .select('id, name, email, phone, type, role, team_id, status, hours_logged')
        .eq('event_id', eventId)
        .order('name');

      if (fetchError) throw fetchError;
      setVolunteers(data || []);
    } catch (err) {
      console.error('Failed to fetch volunteers:', err);
      setError(err.message || 'Failed to load volunteers');
    } finally {
      setLoading(false);
    }
  }

  // Fetch all volunteers across all events for the dropdown
  async function fetchAllVolunteers() {
    try {
      const { data, error: fetchError } = await supabase
        .from('volunteers')
        .select('id, name, email, phone, role, type')
        .order('name');

      if (fetchError) throw fetchError;

      // Deduplicate by email
      const seen = new Set();
      const unique = (data || []).filter((v) => {
        if (!v.email || seen.has(v.email)) return false;
        seen.add(v.email);
        return true;
      });
      setAllVolunteers(unique);
    } catch (err) {
      console.error('Failed to fetch all volunteers:', err);
    }
  }

  // When user picks a volunteer from dropdown, prefill the form
  function handleVolunteerSelect(e) {
    const selectedId = e.target.value;
    if (!selectedId) {
      setNewVolunteer({ name: '', email: '', phone: '', team_id: '', role: '', type: 'internal' });
      return;
    }
    const found = allVolunteers.find((v) => String(v.id) === selectedId);
    if (found) {
      setNewVolunteer((prev) => ({
        ...prev,
        name: found.name || '',
        email: found.email || '',
        phone: found.phone || '',
        role: found.role || '',
        type: found.type || 'internal',
      }));
    }
  }

  // Internal volunteers must be linked to public.members.id (DB check constraint).
  async function resolveMemberId({ name, email, phone }) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required to link internal volunteers to members.');
    }

    // First try to find an existing member by email.
    const { data: existingMembers, error: lookupError } = await supabase
      .from('members')
      .select('id')
      .ilike('email', normalizedEmail)
      .order('id', { ascending: true })
      .limit(1);

    if (lookupError) {
      const lookupMessage = String(lookupError.message || '').toLowerCase();
      if (lookupMessage.includes('infinite recursion')) {
        throw new Error('Members RLS policy recursion detected. Run database migration 006_fix_members_policy_recursion.sql and try again.');
      }
      if (lookupMessage.includes('row-level security')) {
        throw new Error('You do not have permission to read members. Ask an admin to run the members RLS migration or create this member first.');
      }
      throw lookupError;
    }
    if (existingMembers?.[0]?.id) return existingMembers[0].id;

    // If no row exists, create a basic member record so the volunteer can be linked.
    const { data: insertedMember, error: insertMemberError } = await supabase
      .from('members')
      .insert({
        name: (name || '').trim(),
        email: normalizedEmail,
        phone: (phone || '').trim() || null,
        role: 'member',
      })
      .select('id')
      .single();

    if (insertMemberError) {
      const insertMessage = String(insertMemberError.message || '').toLowerCase();
      if (insertMessage.includes('infinite recursion')) {
        throw new Error('Members RLS policy recursion detected. Run database migration 006_fix_members_policy_recursion.sql and try again.');
      }
      if (insertMessage.includes('row-level security')) {
        throw new Error('You do not have permission to create members. Ask an admin to run the members RLS migration or add this as External.');
      }
      throw insertMemberError;
    }
    return insertedMember.id;
  }

  async function handleAddVolunteer() {
    if (!newVolunteer.name || !newVolunteer.email) return;
    setAdding(true);
    try {
      const normalizedType = (newVolunteer.type || 'internal').toLowerCase();
      const payload = {
        event_id: eventId,
        name: newVolunteer.name.trim(),
        email: newVolunteer.email.trim(),
        phone: newVolunteer.phone.trim() || null,
        team_id: newVolunteer.team_id ? parseInt(newVolunteer.team_id) : null,
        type: normalizedType,
      };

      if (normalizedType === 'internal') {
        payload.member_id = await resolveMemberId({
          name: newVolunteer.name,
          email: newVolunteer.email,
          phone: newVolunteer.phone,
        });
      }

      // Only include role if it has a value
      if (newVolunteer.role) payload.role = newVolunteer.role;

      const { error: insertError } = await supabase.from('volunteers').insert(payload);
      if (insertError) throw insertError;

      // Refresh dropdown list with new volunteer
      fetchAllVolunteers();

      // Realtime handles the table update
      setShowAddModal(false);
      setNewVolunteer({ name: '', email: '', phone: '', team_id: '', role: '', type: 'internal' });
    } catch (err) {
      alert('Failed to add volunteer: ' + err.message);
    } finally {
      setAdding(false);
    }
  }

  // ── CSV IMPORT ──────────────────────────────────────────────────────────────
  // Expected CSV columns: name, email, phone (optional), role (optional), type (optional)
  function handleImportCSV() {
    setImportResult(null);
    csvInputRef.current?.click();
  }

  async function handleCSVFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        alert('CSV file is empty or has no valid rows.');
        setImporting(false);
        return;
      }

      // Map CSV rows to volunteer payloads
      const payloads = rows.map((row) => {
        const normalizedType = (row.type || row.Type || 'internal').trim().toLowerCase();
        const payload = {
          event_id: eventId,
          name: (row.name || row.Name || '').trim(),
          email: (row.email || row.Email || '').trim(),
          phone: (row.phone || row.Phone || '').trim() || null,
          type: normalizedType || 'internal',
        };
        const roleVal = (row.role || row.Role || '').trim();
        if (roleVal) payload.role = roleVal;
        return payload;
      });

      // Filter out rows with missing required fields
      const valid = payloads.filter((p) => p.name && p.email);
      const skipped = payloads.length - valid.length;

      if (valid.length === 0) {
        alert(`No valid rows found. Make sure your CSV has "name" and "email" columns.\nSkipped ${skipped} row(s) with missing data.`);
        setImporting(false);
        return;
      }

      // Resolve member_id for internal volunteers before insert.
      let enrichFailCount = 0;
      const enriched = [];
      for (const payload of valid) {
        try {
          if (payload.type === 'internal') {
            payload.member_id = await resolveMemberId({
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
            });
          }
          enriched.push(payload);
        } catch (resolveErr) {
          console.error('Failed to resolve member for CSV row:', payload.email, resolveErr);
          enrichFailCount += 1;
        }
      }

      // Insert in batches of 50
      let successCount = 0;
      let failCount = enrichFailCount;

      for (let i = 0; i < enriched.length; i += 50) {
        const batch = enriched.slice(i, i + 50);
        const { error: insertError } = await supabase.from('volunteers').insert(batch);
        if (insertError) {
          console.error('Batch insert error:', insertError);
          failCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      setImportResult({ success: successCount, failed: failCount, skipped });
      fetchAllVolunteers();
    } catch (err) {
      console.error('CSV import error:', err);
      alert('Failed to import CSV: ' + err.message);
    } finally {
      setImporting(false);
    }
  }

  // Simple CSV parser that handles quoted fields
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Parse headers
    const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = splitCSVLine(lines[i]);
      if (values.every((v) => !v.trim())) continue; // skip empty lines
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || '').trim().replace(/^"|"$/g, '');
      });
      rows.push(row);
    }
    return rows;
  }

  function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Filter volunteers
  const filtered = volunteers.filter(
    (v) => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'name', label: 'Name', render: (val) => <span className="font-medium text-slate-800">{val}</span> },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'role',
      label: 'Role',
      render: (val) => val ? <StatusBadge status={val} size="sm" /> : <span className="text-slate-400">—</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => val ? <StatusBadge status={val} size="sm" /> : <span className="text-slate-400">—</span>,
    },
    {
      key: 'hours_logged',
      label: 'Hours',
      render: (val) => <span className="text-slate-700">{val ?? 0}</span>,
    },
  ];

  if (loading) return <Loader text="Loading volunteers..." />;
  if (error) return <ErrorState message={error} onRetry={fetchVolunteers} />;

  return (
    <div className="py-4 space-y-4">
      {/* Hidden CSV file input */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleCSVFileChange}
      />

      {/* Import result banner */}
      {importResult && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
            importResult.failed > 0
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}
        >
          <span>
            ✅ {importResult.success} volunteer{importResult.success !== 1 ? 's' : ''} imported
            {importResult.failed > 0 && ` · ⚠️ ${importResult.failed} failed`}
            {importResult.skipped > 0 && ` · ⏭ ${importResult.skipped} skipped (missing name/email)`}
          </span>
          <button
            onClick={() => setImportResult(null)}
            className="ml-4 text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search volunteers..." />
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImportCSV}
              disabled={importing}
            >
              {importing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import CSV
                </>
              )}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Volunteer
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table columns={columns} data={filtered} emptyMessage="No volunteers found for this event" />

      {/* Add Volunteer Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Volunteer">
        <div className="space-y-4">

          {/* ── Dropdown: pick from existing volunteers ── */}
          {allVolunteers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select Existing Volunteer
                <span className="ml-1 text-xs font-normal text-slate-500">(or fill manually below)</span>
              </label>
              <select
                defaultValue=""
                onChange={handleVolunteerSelect}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white"
              >
                <option value="">— Choose a volunteer —</option>
                {allVolunteers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Selecting will prefill the fields below. You can still edit them.
              </p>
            </div>
          )}

          {/* Divider */}
          {allVolunteers.length > 0 && (
            <div className="flex items-center gap-2">
              <hr className="flex-1 border-slate-200" />
              <span className="text-xs text-slate-400">or enter manually</span>
              <hr className="flex-1 border-slate-200" />
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={newVolunteer.name}
              onChange={(e) => setNewVolunteer((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="Full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                value={newVolunteer.email}
                onChange={(e) => setNewVolunteer((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="email@cintel.club"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={newVolunteer.phone}
                onChange={(e) => setNewVolunteer((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={newVolunteer.type}
                onChange={(e) => setNewVolunteer((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input
                type="text"
                value={newVolunteer.role}
                onChange={(e) => setNewVolunteer((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="e.g. Lead, Coordinator, Logistics..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddVolunteer} disabled={adding || !newVolunteer.name || !newVolunteer.email}>
              {adding ? 'Adding...' : 'Add Volunteer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
