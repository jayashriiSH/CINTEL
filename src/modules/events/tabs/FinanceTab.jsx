import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "catering", "prizes", "marketing", "equipment",
  "decorations", "travel", "printing", "venue", "other",
];

const CAT_COLORS = {
  catering:    "#6366f1",
  prizes:      "#f59e0b",
  marketing:   "#10b981",
  equipment:   "#3b82f6",
  decorations: "#ec4899",
  travel:      "#8b5cf6",
  printing:    "#06b6d4",
  venue:       "#f97316",
  other:       "#94a3b8",
};

const TICKET_STATUS = {
  approved: "status-success",
  pending:  "status-warning",
  rejected: "status-danger",
};

const fmt  = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtK = (n) => { const v = Number(n || 0); return v >= 1000 ? "₹" + (v / 1000).toFixed(0) + "k" : "₹" + v; };
const cap  = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ── sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color, height = "h-2" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const barColor = color ?? (pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#6366f1");
  return (
    <div className={`w-full rounded-full overflow-hidden ${height}`}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: barColor }} />
    </div>
  );
}

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RAD)} y={cy + r * Math.sin(-midAngle * RAD)}
      fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── NEW: CategorySelect — locked to ENUM values ───────────────────────────────

function CategorySelect({ value, onChange, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`}
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
    >
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>{cap(c)}</option>
      ))}
    </select>
  );
}

// ── NEW: EditableBudget — view → edit → save/cancel ───────────────────────────

function EditableBudget({ totalBudget, onSave }) {
  const [editing,   setEditing]   = useState(false);
  const [inputVal,  setInputVal]  = useState(String(totalBudget ?? 0));
  const [saving,    setSaving]    = useState(false);

  // Sync if parent updates budget
  useEffect(() => {
    if (!editing) setInputVal(String(totalBudget ?? 0));
  }, [totalBudget, editing]);

  async function handleSave() {
    setSaving(true);
    await onSave(parseFloat(inputVal) || 0);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setInputVal(String(totalBudget ?? 0));
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
            Event Total Budget
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(totalBudget)}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', boxShadow: 'var(--card-shadow)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.829 2.829L11.829 15.83
                 a4 4 0 01-1.897 1.054l-2.796.699.699-2.796A4 4 0 019 13z" />
          </svg>
          Edit
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
        Event Total Budget
      </p>
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>₹</span>
          <input
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            autoFocus
            className="pl-7 pr-3 py-2 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            style={{ border: '1px solid var(--accent)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 border text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── NEW: exportPDF ─────────────────────────────────────────────────────────────

function exportPDF(eventName, totalBudget, totalSpent, remaining, budgets, expenses, tickets) {
  const fmt2 = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

  const budgetRows = budgets.map((b) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-transform:capitalize">${b.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${fmt2(b.estimated_amount)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:${Number(b.total_amount) > Number(b.estimated_amount) ? "#ef4444" : "#0f172a"}">${fmt2(b.total_amount)}</td>
    </tr>`).join("");

  const expenseRows = expenses.slice(0, 50).map((e) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${e.volunteer_name || "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${e.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-transform:capitalize">${e.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${fmt2(e.amount)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">${e.expense_date || "—"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Finance Report – ${eventName || "Event"}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', sans-serif; color: #0f172a; background: white; padding: 40px; }
    h1 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 32px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; }
    .stat-val { font-size: 20px; font-weight: 700; }
    h2 { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    section { margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #f1f5f9; }
    th { padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Finance Report</h1>
  <p class="subtitle">Event: ${eventName || "—"} &nbsp;·&nbsp; Generated: ${new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}</p>

  <div class="stats">
    <div class="stat">
      <div class="stat-label">Total Budget</div>
      <div class="stat-val" style="color:#3b82f6">${fmt2(totalBudget)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Spent</div>
      <div class="stat-val" style="color:#f97316">${fmt2(totalSpent)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Remaining</div>
      <div class="stat-val" style="color:${remaining < 0 ? "#ef4444" : "#10b981"}">${fmt2(remaining)}</div>
    </div>
  </div>

  <section>
    <h2>Budget by Category</h2>
    <table>
      <thead><tr><th>Category</th><th>Allocated</th><th>Spent</th></tr></thead>
      <tbody>${budgetRows || '<tr><td colspan="3" style="padding:16px;color:#94a3b8;text-align:center">No category data</td></tr>'}</tbody>
    </table>
  </section>

  <section>
    <h2>Expense Records ${expenses.length > 50 ? "(showing first 50)" : ""}</h2>
    <table>
      <thead><tr><th>Name</th><th>Description</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
      <tbody>${expenseRows || '<tr><td colspan="5" style="padding:16px;color:#94a3b8;text-align:center">No expenses recorded</td></tr>'}</tbody>
    </table>
  </section>

  <div class="footer">Generated by Event Management System</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Allow pop-ups to export PDF"); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function FinanceTab({ eventId }) {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "moderator";

  // ── data state ─────────────────────────────────────────────────────────────
  const [event,      setEvent]      = useState(null);
  const [budgets,    setBudgets]    = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [tickets,    setTickets]    = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading,    setLoading]    = useState(true);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [allocForm,     setAllocForm]     = useState({ category: "catering", estimated_amount: "" });
  const [savingAlloc,   setSavingAlloc]   = useState(false);
  const [showExpForm,   setShowExpForm]   = useState(false);
  const [expForm,       setExpForm]       = useState({
    volunteer_id: "", volunteer_name: "", description: "",
    amount: "", category: "other",
    expense_date: new Date().toISOString().split("T")[0],
  });
  const [savingExp, setSavingExp] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => { fetchAll(); }, [eventId]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [evtRes, budRes, expRes, tickRes, volRes] = await Promise.all([
        supabase.from("events").select("id, name, total_budget").eq("id", eventId).single(),
        supabase.from("budgets").select("*").eq("event_id", eventId).order("category"),
        supabase.from("expenses").select("*").eq("event_id", eventId).order("expense_date", { ascending: false }),
        supabase.from("tickets").select("id, amount, category, reason, status, created_at, raised_by").eq("event_id", eventId).order("created_at", { ascending: false }),
        supabase.from("volunteers").select("id, name").eq("event_id", eventId).order("name"),
      ]);

      if (evtRes.data) setEvent(evtRes.data);
      setBudgets(budRes.data   || []);
      setExpenses(expRes.data  || []);
      setTickets(tickRes.data  || []);
      setVolunteers(volRes.data || []);
    } catch (err) {
      console.error("FinanceTab fetchAll:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── save total budget (called by EditableBudget) ──────────────────────────

  async function saveTotalBudget(amt) {
    const { error } = await supabase
      .from("events")
      .update({ total_budget: amt })
      .eq("id", eventId);
    if (error) { alert("Failed: " + error.message); throw error; }
    await fetchAll();
  }

  // ── upsert category allocation ────────────────────────────────────────────

  async function saveAllocation() {
    const amt = parseFloat(allocForm.estimated_amount) || 0;
    if (!allocForm.category || amt <= 0) return;

    const alreadyAllocated = budgets
      .filter((b) => b.category !== allocForm.category)
      .reduce((s, b) => s + Number(b.estimated_amount), 0);

    if (alreadyAllocated + amt > (event?.total_budget ?? 0)) {
      alert(
        `Exceeds total budget!\n` +
        `Already allocated (other categories): ${fmt(alreadyAllocated)}\n` +
        `This allocation: ${fmt(amt)}\n` +
        `Total budget: ${fmt(event?.total_budget)}`
      );
      return;
    }

    setSavingAlloc(true);
    try {
      const { error } = await supabase.from("budgets").upsert(
        { event_id: eventId, category: allocForm.category, estimated_amount: amt },
        { onConflict: "event_id,category" }
      );
      if (error) throw error;
      setShowAllocForm(false);
      setAllocForm({ category: "catering", estimated_amount: "" });
      await fetchAll();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setSavingAlloc(false);
    }
  }

  // ── add expense ────────────────────────────────────────────────────────────

  async function addExpense() {
    if (!expForm.description || !expForm.amount) return;
    setSavingExp(true);
    try {
      const amt = parseFloat(expForm.amount);

      let volName = expForm.volunteer_name.trim();
      if (expForm.volunteer_id) {
        const vol = volunteers.find((v) => String(v.id) === String(expForm.volunteer_id));
        if (vol) volName = vol.name;
      }

      const { error: expErr } = await supabase.from("expenses").insert({
        event_id:       eventId,
        volunteer_id:   expForm.volunteer_id ? parseInt(expForm.volunteer_id) : null,
        volunteer_name: volName || "Unknown",
        description:    expForm.description,
        amount:         amt,
        category:       expForm.category,
        expense_date:   expForm.expense_date,
      });
      if (expErr) throw expErr;

      const budgetRow = budgets.find((b) => b.category === expForm.category);
      if (budgetRow) {
        await supabase
          .from("budgets")
          .update({ total_amount: Number(budgetRow.total_amount || 0) + amt })
          .eq("event_id", eventId)
          .eq("category", expForm.category);
      } else {
        await supabase.from("budgets").insert({
          event_id:         eventId,
          category:         expForm.category,
          estimated_amount: 0,
          total_amount:     amt,
        });
      }

      setExpForm({
        volunteer_id: "", volunteer_name: "", description: "",
        amount: "", category: "other",
        expense_date: new Date().toISOString().split("T")[0],
      });
      setShowExpForm(false);
      await fetchAll();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setSavingExp(false);
    }
  }

  // ── ticket approve / reject ────────────────────────────────────────────────

  async function updateTicket(ticketId, status) {
    const { error } = await supabase
      .from("tickets")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (!error) fetchAll();
    else alert(error.message);
  }

  // ── volunteer change handler ───────────────────────────────────────────────

  function handleVolChange(volId) {
    const vol = volunteers.find((v) => String(v.id) === String(volId));
    setExpForm((p) => ({ ...p, volunteer_id: volId, volunteer_name: vol?.name ?? "" }));
  }

  // ── export CSV ─────────────────────────────────────────────────────────────

  function exportCSV() {
    if (!expenses.length) return;
    const rows = [
      ["Name", "Description", "Category", "Amount", "Date"],
      ...expenses.map((e) => [e.volunteer_name, e.description, e.category, e.amount, e.expense_date]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "expenses.csv" });
    a.click();
  }

  // ── derived calculations ───────────────────────────────────────────────────

  const totalBudget = event?.total_budget ?? 0;
  const allocated   = budgets.reduce((s, b) => s + Number(b.estimated_amount), 0);
  const totalSpent  = budgets.reduce((s, b) => s + Number(b.total_amount),     0);
  const remaining   = totalBudget - totalSpent;
  const unallocated = totalBudget - allocated;
  const spentPct    = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const pendingAmt  = tickets.filter((t) => t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);

  const pieData = budgets
    .filter((b) => Number(b.total_amount) > 0)
    .map((b) => ({ name: b.category, value: Number(b.total_amount) }));

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading finance data...</div>
  );

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Finance</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <button onClick={() => { setShowAllocForm((p) => !p); setShowExpForm(false); }}
                className="px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                {showAllocForm ? "Cancel" : "+ Allocate Budget"}
              </button>
              <button onClick={() => { setShowExpForm((p) => !p); setShowAllocForm(false); }}
                className="px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                {showExpForm ? "Cancel" : "+ Add Expense"}
              </button>
            </>
          )}

          {/* CSV Export */}
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--success)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 12l8 8m0 0l8-8M12 4v16" />
            </svg>
            CSV
          </button>

          {/* PDF Export — NEW */}
          <button
            onClick={() => exportPDF(event?.name, totalBudget, totalSpent, remaining, budgets, expenses, tickets)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--danger)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Budget", value: fmt(totalBudget), sub: "event total",
            bg: "var(--bg-card)", border: "var(--accent)",  borderW: 1.5,
            val: "var(--text-primary)", sub_: "var(--text-muted)",
          },
          {
            label: "Total Spent", value: fmt(totalSpent), sub: `${spentPct}% of budget`,
            bg: "var(--bg-card)", border: "var(--warning)", borderW: 1.5,
            val: "var(--warning)", sub_: "var(--text-muted)",
          },
          {
            label: "Pending", value: fmt(pendingAmt), sub: "awaiting approval",
            bg: "var(--bg-card)", border: "var(--warning)", borderW: 1.5,
            val: "var(--warning)", sub_: "var(--warning)",
          },
          {
            label: "Remaining", value: fmt(remaining), sub: "available to spend",
            bg: "var(--bg-card)",
            border: remaining < 0 ? "var(--danger)" : "var(--success)",
            borderW: 1.5,
            val: remaining < 0 ? "var(--danger)" : "var(--success)",
            sub_: remaining < 0 ? "var(--danger)" : "var(--success)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-5 py-4"
            style={{
              backgroundColor: s.bg,
              border: `${s.borderW ?? 1}px solid ${s.border}`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.03)`,
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: s.val }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.val }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: s.sub_ }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* EDITABLE TOTAL BUDGET — UPDATED */}
      {isAdmin && (
        <div className="rounded-xl border px-5 py-4 flex flex-wrap items-center gap-6"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}>
          <EditableBudget totalBudget={totalBudget} onSave={saveTotalBudget} />

          <div className="flex-1 min-w-[240px] space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Allocated <strong style={{ color: 'var(--text-secondary)' }}>{fmt(allocated)}</strong></span>
                <span>Unallocated <strong style={{ color: 'var(--text-secondary)' }}>{fmt(unallocated)}</strong></span>
              </div>
              <ProgressBar value={allocated} max={totalBudget} color="#6366f1" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Spent <strong style={{ color: '#f97316' }}>{fmt(totalSpent)}</strong></span>
                <span>{spentPct}%</span>
              </div>
              <ProgressBar value={totalSpent} max={totalBudget} />
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATE BUDGET FORM */}
      {showAllocForm && isAdmin && (
        <div className="rounded-xl border p-5"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--accent)", boxShadow: "var(--card-shadow)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Allocate Category Budget</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
              {/* UPDATED: use CategorySelect */}
              <CategorySelect
                value={allocForm.category}
                onChange={(val) => setAllocForm((p) => ({ ...p, category: val }))}
                className="min-w-[160px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>₹</span>
                <input type="number" placeholder="0" value={allocForm.estimated_amount}
                  onChange={(e) => setAllocForm((p) => ({ ...p, estimated_amount: e.target.value }))}
                  className="pl-7 pr-3 py-2 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div>
              <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Unallocated: <strong style={{ color: 'var(--text-secondary)' }}>{fmt(unallocated)}</strong></p>
              <button onClick={saveAllocation} disabled={savingAlloc || !allocForm.estimated_amount}
                className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}>
                {savingAlloc ? "Saving..." : "Allocate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXPENSE FORM */}
      {showExpForm && isAdmin && (
        <div className="rounded-xl border p-5"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--success)", boxShadow: "var(--card-shadow)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Add Expense</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Volunteer</label>
              <select value={expForm.volunteer_id} onChange={(e) => handleVolChange(e.target.value)}
                className="w-full border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
              >
                <option value="">Select volunteer (optional)</option>
                {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            {!expForm.volunteer_id && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                <input type="text" placeholder="Manual name" value={expForm.volunteer_name}
                  onChange={(e) => setExpForm((p) => ({ ...p, volunteer_name: e.target.value }))}
                  className="w-full rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }} />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Description *</label>
              <input type="text" placeholder="What was purchased?" value={expForm.description}
                onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>₹</span>
                <input type="number" placeholder="0" value={expForm.amount}
                  onChange={(e) => setExpForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full pl-7 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            {/* UPDATED: use CategorySelect */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
              <CategorySelect
                value={expForm.category}
                onChange={(val) => setExpForm((p) => ({ ...p, category: val }))}
                className="w-full focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
              <input type="date" value={expForm.expense_date}
                onChange={(e) => setExpForm((p) => ({ ...p, expense_date: e.target.value }))}
                className="w-full rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={addExpense} disabled={savingExp || !expForm.description || !expForm.amount}
              className="px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--success)' }}>
              {savingExp ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </div>
      )}

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Spending by Category</h3>
          {pieData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>No spending recorded yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={PieLabel}>
                  {pieData.map((d) => <Cell key={d.name} fill={CAT_COLORS[d.name] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip formatter={(v) => [fmt(v), "Spent"]} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", fontSize: "12px", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border p-5"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Budget by Category</h3>
          {budgets.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>No category budgets yet</div>
          ) : (
            <div className="space-y-4">
              {budgets.map((b) => {
                const est   = Number(b.estimated_amount);
                const spent = Number(b.total_amount);
                const over  = est > 0 && spent > est;
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[b.category] ?? "#94a3b8" }} />
                        <span className="text-xs font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>{b.category}</span>
                        {over && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--status-danger-bg)", color: "var(--status-danger-text)" }}>Over</span>}
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span style={{ color: over ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: over ? 'bold' : '600' }}>{fmtK(spent)}</span>
                        {est > 0 && <span style={{ color: 'var(--text-muted)' }}> / {fmtK(est)}</span>}
                      </span>
                    </div>
                    <ProgressBar value={spent} max={est || spent} color={over ? "#ef4444" : (CAT_COLORS[b.category] ?? "#6366f1")} height="h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t" style={{ borderColor: "var(--border-light)" }}>
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Transactions</p>
              <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{expenses.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Allocated</p>
              <p className="text-base font-bold" style={{ color: 'var(--accent)' }}>{fmt(allocated)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Avg Expense</p>
              <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{expenses.length ? fmt(totalSpent / expenses.length) : "₹0"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* EXPENSE TICKETS */}
      <div className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-light)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Expense Tickets</h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{tickets.length} tickets</span>
        </div>
        {tickets.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No tickets raised yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--table-header-bg)", borderColor: "var(--border-light)" }}>
                {["Category", "Raised By", "Amount", "Date", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <tr key={t.id} className="transition-colors" style={{ backgroundColor: "var(--bg-card)" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--table-row-hover)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "var(--bg-card)"}>
                  <td className="px-4 py-3 capitalize font-medium text-xs" style={{ color: 'var(--accent)' }}>{t.category}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{t.raised_by?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{fmt(t.amount)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{t.created_at?.split("T")[0] ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TICKET_STATUS[t.status] ?? TICKET_STATUS.pending}`}>
                      {t.status?.charAt(0).toUpperCase() + t.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.status === "pending" && isAdmin ? (
                      <div className="flex gap-3">
                        <button onClick={() => updateTicket(t.id, "approved")} className="text-xs font-semibold transition-colors" style={{ color: 'var(--success)' }}>Approve</button>
                        <button onClick={() => updateTicket(t.id, "rejected")} className="text-xs font-semibold transition-colors" style={{ color: 'var(--danger)' }}>Reject</button>
                      </div>
                    ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ALL EXPENSES */}
      <div className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-light)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>All Expenses</h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{expenses.length} records · {fmt(totalSpent)}</span>
        </div>
        {expenses.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No expenses recorded yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--table-header-bg)", borderColor: "var(--border-light)" }}>
                {["Raised By", "Description", "Category", "Amount", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="transition-colors" style={{ backgroundColor: "var(--bg-card)" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--table-row-hover)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "var(--bg-card)"}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{e.volunteer_name || "Unknown"}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{e.description}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize text-white"
                      style={{ backgroundColor: CAT_COLORS[e.category] ?? "#94a3b8" }}>
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{e.expense_date ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}