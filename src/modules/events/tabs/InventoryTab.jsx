import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { PageHeader, Button, Loader, ErrorState, EmptyState, Modal } from "../../../components";
// ── status config ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  available: { label: "Available", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  borrowed:  { label: "Borrowed",  cls: "bg-amber-50  text-amber-600  border-amber-200"  },
  returned:  { label: "Returned",  cls: "bg-blue-50   text-blue-600   border-blue-200"   },
  damaged:   { label: "Damaged",   cls: "bg-red-50    text-red-600    border-red-200"    },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.available;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── category icon ─────────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  electronics:  "💻",
  furniture:    "🪑",
  stationery:   "✏️",
  av:           "🎤",
  tools:        "🔧",
  sports:       "⚽",
  clothing:     "👕",
};
function categoryIcon(cat) {
  return CATEGORY_ICONS[cat?.toLowerCase()] ?? "📦";
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "moderator";

  // data
  const [items,      setItems]      = useState([]);
  const [events,     setEvents]     = useState([]);
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // filters
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("All Categories");
  const [statFilter, setStatFilter] = useState("All Statuses");

  // selected item (detail panel)
  const [selected,   setSelected]   = useState(null);   // item with allocations

  // modals
  const [showAddItem,   setShowAddItem]   = useState(false);
  const [showAllocate,  setShowAllocate]  = useState(null);  // item to allocate
  const [showBorrow,    setShowBorrow]    = useState(null);  // allocation to borrow
  const [creating,      setCreating]      = useState(false);
  const [saving,        setSaving]        = useState(false);

  // forms
  const [newItem, setNewItem] = useState({
    item_code: "", name: "", category: "", description: "",
  });
  const [allocForm, setAllocForm] = useState({
    event_id: "", status: "available",
  });
  const [borrowForm, setBorrowForm] = useState({
    borrowed_by: "", due_date: "",
  });

  // ── fetch ───────────────────────────────────────────────────────────────

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, eventsRes, membersRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select(`
            id, item_code, name, category, description, created_at,
            inventory_allocations (
              id, status, due_date, checked_out_at, returned_at,
              borrowed_by,
              event:events ( id, name ),
              borrower:members ( id, name )
            )
          `)
          .order("name"),
        supabase.from("events").select("id, name").order("name"),
        supabase.from("members").select("id, name").is("deleted_at", null).order("name"),
      ]);

      if (itemsRes.error)   throw itemsRes.error;
      if (eventsRes.error)  throw eventsRes.error;
      if (membersRes.error) throw membersRes.error;

      setItems(itemsRes.data   || []);
      setEvents(eventsRes.data  || []);
      setMembers(membersRes.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // refresh selected panel after mutations
  async function refreshSelected(itemId) {
    const { data } = await supabase
      .from("inventory_items")
      .select(`
        id, item_code, name, category, description, created_at,
        inventory_allocations (
          id, status, due_date, checked_out_at, returned_at,
          borrowed_by,
          event:events ( id, name ),
          borrower:members ( id, name )
        )
      `)
      .eq("id", itemId)
      .single();
    if (data) setSelected(data);
  }

  // ── create item ─────────────────────────────────────────────────────────

  async function handleCreateItem() {
    if (!newItem.item_code || !newItem.name || !newItem.category) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("inventory_items").insert({ ...newItem });
      if (error) throw error;
      setShowAddItem(false);
      setNewItem({ item_code: "", name: "", category: "", description: "" });
      fetchAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ── allocate item to event ───────────────────────────────────────────────

  async function handleAllocate() {
    if (!allocForm.event_id || !showAllocate) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("inventory_allocations").insert({
        item_id:  showAllocate.id,
        event_id: parseInt(allocForm.event_id),
        status:   allocForm.status,
      });
      if (error) throw error;
      setShowAllocate(null);
      setAllocForm({ event_id: "", status: "available" });
      fetchAll();
      if (selected?.id === showAllocate.id) refreshSelected(showAllocate.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── mark as borrowed ────────────────────────────────────────────────────

  async function handleBorrow() {
    if (!borrowForm.borrowed_by || !borrowForm.due_date || !showBorrow) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("inventory_allocations")
        .update({
          status:         "borrowed",
          borrowed_by:    parseInt(borrowForm.borrowed_by),
          due_date:       borrowForm.due_date,
          checked_out_at: new Date().toISOString(),
          returned_at:    null,
        })
        .eq("id", showBorrow.id);
      if (error) throw error;
      setShowBorrow(null);
      setBorrowForm({ borrowed_by: "", due_date: "" });
      fetchAll();
      if (selected) refreshSelected(selected.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── mark returned ───────────────────────────────────────────────────────

  async function handleReturn(allocId, itemId) {
    try {
      const { error } = await supabase
        .from("inventory_allocations")
        .update({
          status:      "returned",
          returned_at: new Date().toISOString(),
          borrowed_by: null,
          due_date:    null,
        })
        .eq("id", allocId);
      if (error) throw error;
      fetchAll();
      if (selected) refreshSelected(itemId);
    } catch (err) {
      alert(err.message);
    }
  }

  // ── update allocation status ─────────────────────────────────────────────

  async function handleStatusChange(allocId, itemId, newStatus) {
    try {
      const { error } = await supabase
        .from("inventory_allocations")
        .update({ status: newStatus })
        .eq("id", allocId);
      if (error) throw error;
      fetchAll();
      if (selected) refreshSelected(itemId);
    } catch (err) {
      alert(err.message);
    }
  }

  // ── derived ──────────────────────────────────────────────────────────────

  const categories = ["All Categories", ...new Set(items.map((i) => i.category).filter(Boolean))];
  const statuses   = ["All Statuses", "available", "borrowed", "returned", "damaged"];

  // Overall status of an item = worst allocation status (or "available" if none)
  function itemStatus(item) {
    const allocs = item.inventory_allocations || [];
    if (allocs.some((a) => a.status === "borrowed"))  return "borrowed";
    if (allocs.some((a) => a.status === "damaged"))   return "damaged";
    if (allocs.some((a) => a.status === "available")) return "available";
    return "available";
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.name?.toLowerCase().includes(q) || item.item_code?.toLowerCase().includes(q);
    const matchCat    = catFilter  === "All Categories" || item.category === catFilter;
    const matchStat   = statFilter === "All Statuses"   || itemStatus(item) === statFilter;
    return matchSearch && matchCat && matchStat;
  });

  // stats cards
  const totalItems    = items.length;
  const borrowedCount = items.filter((i) => itemStatus(i) === "borrowed").length;
  const availCount    = items.filter((i) => itemStatus(i) === "available").length;
  const damagedCount  = items.filter((i) => itemStatus(i) === "damaged").length;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* HEADER */}
        <PageHeader
          title="Inventory"
          subtitle="Track club equipment, tools, and borrowed items"
          actions={
            isAdmin && (
              <Button onClick={() => setShowAddItem(true)}>+ Add Item</Button>
            )
          }
        />

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 mb-6">
          {[
            { label: "Total Items",  value: totalItems,    color: "text-slate-800" },
            { label: "Available",    value: availCount,    color: "text-emerald-600" },
            { label: "Borrowed",     value: borrowedCount, color: "text-amber-600" },
            { label: "Damaged",      value: damagedCount,  color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[160px]">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={statFilter} onChange={(e) => setStatFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[150px]">
            {statuses.map((s) => (
              <option key={s} value={s}>{s === "All Statuses" ? s : STATUS_STYLES[s]?.label ?? s}</option>
            ))}
          </select>
        </div>

        {/* CONTENT */}
        {loading ? (
          <Loader text="Fetching inventory..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAll} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No items found"
            description={search ? "Try adjusting your search or filters" : "Add your first inventory item"}
            action={isAdmin && !search && <Button onClick={() => setShowAddItem(true)}>Add Item</Button>}
          />
        ) : (
          <div className={`grid gap-4 ${selected ? "grid-cols-1 lg:grid-cols-[1fr_400px]" : "grid-cols-1"}`}>

            {/* ITEMS TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Item", "Code", "Category", "Allocations", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const allocs = item.inventory_allocations || [];
                    const st     = itemStatus(item);
                    const isOpen = selected?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${isOpen ? "bg-indigo-50/40" : ""}`}
                        onClick={() => setSelected(isOpen ? null : item)}
                      >
                        {/* Item */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{categoryIcon(item.category)}</span>
                            <div>
                              <p className="font-medium text-slate-800 leading-tight">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-slate-400 line-clamp-1 max-w-[200px]">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Code */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {item.item_code}
                          </span>
                        </td>
                        {/* Category */}
                        <td className="px-4 py-3 text-slate-600 capitalize">{item.category}</td>
                        {/* Allocations count */}
                        <td className="px-4 py-3 text-slate-700 font-medium">{allocs.length}</td>
                        {/* Status */}
                        <td className="px-4 py-3"><StatusBadge status={st} /></td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelected(isOpen ? null : item)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs transition-colors"
                            >
                              {isOpen ? "Close" : "View"}
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => { setShowAllocate(item); setAllocForm({ event_id: "", status: "available" }); }}
                                className="text-slate-500 hover:text-slate-700 font-medium text-xs transition-colors"
                              >
                                Allocate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* DETAIL PANEL */}
            {selected && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Panel header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryIcon(selected.category)}</span>
                      <h3 className="font-semibold text-slate-800">{selected.name}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{selected.item_code}</p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Description */}
                {selected.description && (
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40">
                    <p className="text-xs text-slate-500">{selected.description}</p>
                  </div>
                )}

                {/* Allocations list */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Allocations ({(selected.inventory_allocations || []).length})
                    </p>
                    {isAdmin && (
                      <button
                        onClick={() => { setShowAllocate(selected); setAllocForm({ event_id: "", status: "available" }); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        + Allocate to Event
                      </button>
                    )}
                  </div>

                  {(selected.inventory_allocations || []).length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      Not allocated to any event yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(selected.inventory_allocations || []).map((alloc) => (
                        <div key={alloc.id} className="rounded-lg border border-slate-200 p-3 text-xs">
                          {/* Event name */}
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-slate-800">{alloc.event?.name ?? "Unknown Event"}</p>
                            <StatusBadge status={alloc.status} />
                          </div>

                          {/* Borrower info */}
                          {alloc.status === "borrowed" && alloc.borrower && (
                            <div className="text-slate-500 mb-1.5 space-y-0.5">
                              <p>👤 Borrowed by <span className="font-medium text-slate-700">{alloc.borrower.name}</span></p>
                              <p>📅 Due: <span className="font-medium text-slate-700">{formatDate(alloc.due_date)}</span></p>
                              {alloc.checked_out_at && (
                                <p>🕐 Checked out: {formatDate(alloc.checked_out_at)}</p>
                              )}
                            </div>
                          )}

                          {alloc.status === "returned" && alloc.returned_at && (
                            <p className="text-slate-500 mb-1.5">
                              ✅ Returned: {formatDate(alloc.returned_at)}
                            </p>
                          )}

                          {/* Actions */}
                          {isAdmin && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                              {alloc.status === "available" && (
                                <button
                                  onClick={() => { setShowBorrow(alloc); setBorrowForm({ borrowed_by: "", due_date: "" }); }}
                                  className="text-amber-600 hover:text-amber-800 font-medium transition-colors"
                                >
                                  Mark Borrowed
                                </button>
                              )}
                              {alloc.status === "borrowed" && (
                                <button
                                  onClick={() => handleReturn(alloc.id, selected.id)}
                                  className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                                >
                                  Mark Returned
                                </button>
                              )}
                              {alloc.status !== "damaged" && (
                                <button
                                  onClick={() => handleStatusChange(alloc.id, selected.id, "damaged")}
                                  className="text-red-500 hover:text-red-700 font-medium transition-colors"
                                >
                                  Mark Damaged
                                </button>
                              )}
                              {alloc.status === "damaged" && (
                                <button
                                  onClick={() => handleStatusChange(alloc.id, selected.id, "available")}
                                  className="text-slate-500 hover:text-slate-700 font-medium transition-colors"
                                >
                                  Mark Available
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item meta */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40">
                  <p className="text-[10px] text-slate-400">
                    Added {formatDate(selected.created_at)} · Category: <span className="capitalize">{selected.category}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ADD ITEM MODAL ── */}
      <Modal isOpen={showAddItem} onClose={() => setShowAddItem(false)} title="Add Inventory Item">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Item Code * (e.g. MIC-001)" value={newItem.item_code}
              onChange={(e) => setNewItem((p) => ({ ...p, item_code: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm font-mono" />
            <input type="text" placeholder="Category *" value={newItem.category}
              onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
          </div>
          <input type="text" placeholder="Item Name *" value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            className="w-full border px-3 py-2 rounded-lg text-sm" />
          <textarea placeholder="Description (optional)" value={newItem.description}
            onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full border px-3 py-2 rounded-lg text-sm resize-none" />
          <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            💡 Category examples: electronics, furniture, av, stationery, tools, sports, clothing
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button
              onClick={handleCreateItem}
              disabled={creating || !newItem.item_code || !newItem.name || !newItem.category}
            >
              {creating ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── ALLOCATE TO EVENT MODAL ── */}
      <Modal
        isOpen={!!showAllocate}
        onClose={() => setShowAllocate(null)}
        title={`Allocate "${showAllocate?.name}" to Event`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Event *</label>
            <select value={allocForm.event_id}
              onChange={(e) => setAllocForm((p) => ({ ...p, event_id: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm text-slate-700">
              <option value="">Select event...</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Initial Status</label>
            <select value={allocForm.status}
              onChange={(e) => setAllocForm((p) => ({ ...p, status: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm text-slate-700">
              <option value="available">Available</option>
              <option value="borrowed">Borrowed</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowAllocate(null)}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={saving || !allocForm.event_id}>
              {saving ? "Allocating..." : "Allocate"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MARK BORROWED MODAL ── */}
      <Modal
        isOpen={!!showBorrow}
        onClose={() => setShowBorrow(null)}
        title="Mark as Borrowed"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Borrowed By *</label>
            <select value={borrowForm.borrowed_by}
              onChange={(e) => setBorrowForm((p) => ({ ...p, borrowed_by: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm text-slate-700">
              <option value="">Select member...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Due Date *</label>
            <input type="date" value={borrowForm.due_date}
              onChange={(e) => setBorrowForm((p) => ({ ...p, due_date: e.target.value }))}
              className="w-full border px-3 py-2 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowBorrow(null)}>Cancel</Button>
            <Button
              onClick={handleBorrow}
              disabled={saving || !borrowForm.borrowed_by || !borrowForm.due_date}
            >
              {saving ? "Saving..." : "Confirm Borrow"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}