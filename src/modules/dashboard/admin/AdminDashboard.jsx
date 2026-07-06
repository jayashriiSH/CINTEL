import { useEffect, useMemo, useState } from "react";
import { Loader, ErrorState } from "../../../components";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import {
  DashboardHeader,
  DashboardSection,
  EmptyState,
  PriorityBadge,
  ProgressBar,
  StatCard,
  StatGrid,
  StatusBadge,
} from "../DashboardUI";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatIcon({ type }) {
  const iconMap = {
    events: "E",
    members: "M",
    tasks: "T",
    budget: "B",
  };

  return <span className="text-sm font-semibold">{iconMap[type] || "C"}</span>;
}

function fallbackProgressByStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return 100;
  if (normalized === "ongoing") return 60;
  if (normalized === "planned") return 25;
  return 0;
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getMemberNameById(memberMap, assignedTo) {
  if (assignedTo === null || assignedTo === undefined) return "Unassigned";
  return memberMap.get(String(assignedTo)) || "Unassigned";
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState({
    stats: {
      activeEvents: 0,
      totalMembers: 0,
      tasksCompleted: 0,
      budgetSpent: 0,
    },
    recentEvents: [],
    upcomingTasks: [],
    budgetOverview: {
      totalBudget: 0,
      totalSpent: 0,
      pending: 0,
      committed: 0,
      remaining: 0,
      categories: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchDashboard = async (silent = false) => {
      if (!mounted) return;
      setError("");

      if (!silent) {
        setLoading(true);
      }

      try {
        const [
          eventsRes,
          membersRes,
          tasksRes,
          volunteersRes,
          budgetsRes,
          ticketsRes,
          expensesRes,
        ] = await Promise.allSettled([
          supabase
            .from("events")
            .select("id, name, status, date, created_at, total_budget")
            .is("deleted_at", null),
          supabase
            .from("members")
            .select("id, name", { count: "exact" })
            .is("deleted_at", null),
          supabase
            .from("tasks")
            .select("id, title, assigned_to, deadline, priority, status, event_id, created_at"),
          supabase.from("volunteers").select("id, event_id"),
          supabase.from("budgets").select("event_id, category, estimated_amount, total_amount"),
          supabase.from("tickets").select("event_id, amount, status"),
          supabase.from("expenses").select("event_id, amount, category"),
        ]);

        const eventsData = eventsRes.status === "fulfilled" ? (eventsRes.value.data || []) : [];
        const membersData = membersRes.status === "fulfilled" ? (membersRes.value.data || []) : [];
        const membersCount = membersRes.status === "fulfilled"
          ? membersRes.value.count ?? membersData.length
          : 0;
        const tasksData = tasksRes.status === "fulfilled" ? (tasksRes.value.data || []) : [];
        const volunteersData = volunteersRes.status === "fulfilled" ? (volunteersRes.value.data || []) : [];
        const budgetsData = budgetsRes.status === "fulfilled" ? (budgetsRes.value.data || []) : [];
        const ticketsData = ticketsRes.status === "fulfilled" ? (ticketsRes.value.data || []) : [];
        const expensesData = expensesRes.status === "fulfilled" ? (expensesRes.value.data || []) : [];

        const activeEventIdSet = new Set(eventsData.map((event) => String(event.id)));

        const filteredTasks = tasksData.filter(
          (row) => row.event_id !== null && row.event_id !== undefined && activeEventIdSet.has(String(row.event_id))
        );
        const filteredVolunteers = volunteersData.filter(
          (row) => row.event_id !== null && row.event_id !== undefined && activeEventIdSet.has(String(row.event_id))
        );
        const filteredBudgets = budgetsData.filter(
          (row) => row.event_id !== null && row.event_id !== undefined && activeEventIdSet.has(String(row.event_id))
        );
        const filteredTickets = ticketsData.filter(
          (row) => row.event_id !== null && row.event_id !== undefined && activeEventIdSet.has(String(row.event_id))
        );
        const filteredExpenses = expensesData.filter(
          (row) => row.event_id !== null && row.event_id !== undefined && activeEventIdSet.has(String(row.event_id))
        );

        const memberMap = new Map(
          membersData.map((member) => [String(member.id), member.name || "Member"])
        );

        const volunteersByEvent = filteredVolunteers.reduce((acc, row) => {
          const eventId = row.event_id;
          if (eventId === null || eventId === undefined) return acc;
          const key = String(eventId);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const tasksByEvent = filteredTasks.reduce((acc, row) => {
          const eventId = row.event_id;
          if (eventId === null || eventId === undefined) return acc;
          const key = String(eventId);
          if (!acc[key]) {
            acc[key] = { total: 0, completed: 0 };
          }
          acc[key].total += 1;
          if (String(row.status || "").toLowerCase() === "completed") {
            acc[key].completed += 1;
          }
          return acc;
        }, {});

        const activeEvents = eventsData.filter((event) => {
          const status = normalizeStatus(event.status);
          return status === "planned" || status === "ongoing";
        }).length;

        const tasksCompleted = filteredTasks.filter((task) => normalizeStatus(task.status) === "completed").length;

        const recentEvents = [...eventsData]
          .sort((a, b) => {
            const aTime = new Date(a.date || a.created_at || 0).getTime();
            const bTime = new Date(b.date || b.created_at || 0).getTime();
            return bTime - aTime;
          })
          .slice(0, 5)
          .map((event) => {
            const eventKey = String(event.id);
            const eventTasks = tasksByEvent[eventKey];
            const completion = eventTasks && eventTasks.total > 0
              ? Math.round((eventTasks.completed / eventTasks.total) * 100)
              : fallbackProgressByStatus(event.status);

            return {
              id: event.id,
              name: event.name || "Untitled Event",
              status: event.status || "planned",
              volunteers: volunteersByEvent[eventKey] || 0,
              completion,
            };
          });

        const upcomingTasks = [...filteredTasks]
          .filter((task) => {
            const status = normalizeStatus(task.status);
            return status !== "completed" && status !== "cancelled";
          })
          .sort((a, b) => {
            const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
            const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
            return aTime - bTime;
          })
          .slice(0, 5)
          .map((task) => ({
            id: task.id,
            title: task.title || "Untitled Task",
            assignedMember: getMemberNameById(memberMap, task.assigned_to),
            deadline: task.deadline,
            priority: task.priority || "medium",
          }));

        const budgetsByEvent = filteredBudgets.reduce((acc, row) => {
          const key = String(row.event_id);
          if (!acc[key]) {
            acc[key] = { allocated: 0, spent: 0 };
          }
          acc[key].allocated += normalizeNumber(row.estimated_amount);
          acc[key].spent += normalizeNumber(row.total_amount);
          return acc;
        }, {});

        const perEventFinance = eventsData.map((event) => {
          const key = String(event.id);
          const allocated = budgetsByEvent[key]?.allocated || 0;
          const spent = budgetsByEvent[key]?.spent || 0;
          const explicitBudget = normalizeNumber(event.total_budget);
          const eventBudget = explicitBudget > 0 ? explicitBudget : allocated;

          return {
            eventId: event.id,
            budget: eventBudget,
            spent,
          };
        });

        const totalBudget = perEventFinance.reduce((sum, row) => sum + row.budget, 0);
        const totalSpentFromBudgets = perEventFinance.reduce((sum, row) => sum + row.spent, 0);
        const totalSpent = totalSpentFromBudgets;

        const pending = filteredTickets
          .filter((ticket) => {
            const status = normalizeStatus(ticket.status);
            return status === "pending" || status === "open" || status === "submitted" || status === "awaiting_approval";
          })
          .reduce((sum, ticket) => sum + normalizeNumber(ticket.amount), 0);

        const remaining = totalBudget - totalSpent;

        const categoryMap = new Map();
        filteredBudgets.forEach((row) => {
          const key = String(row.category || "other").toLowerCase();
          const previous = categoryMap.get(key) || 0;
          const rowAmount = normalizeNumber(row.total_amount);
          categoryMap.set(key, previous + rowAmount);
        });

        // Fallback to expenses only when no budget-spend rows exist yet.
        if (categoryMap.size === 0) {
          filteredExpenses.forEach((row) => {
            const key = String(row.category || "other").toLowerCase();
            const previous = categoryMap.get(key) || 0;
            categoryMap.set(key, previous + normalizeNumber(row.amount));
          });
        }

        const categories = Array.from(categoryMap.entries())
          .map(([name, amount]) => ({
            id: name,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            amount,
          }))
          .sort((a, b) => b.amount - a.amount);

        if (mounted) {
          setDashboard({
            stats: {
              activeEvents,
              totalMembers: membersCount,
              tasksCompleted,
              budgetSpent: totalSpent,
            },
            recentEvents,
            upcomingTasks,
            budgetOverview: {
              totalBudget,
              totalSpent,
              pending,
              remaining,
              categories,
            },
          });
          setLoading(false);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || "Failed to load dashboard data");
          setLoading(false);
        }
      }
    };

    fetchDashboard(false);

    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "volunteers" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => fetchDashboard(true))
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [refreshToken]);

  const budget = dashboard.budgetOverview;
  const budgetUsage = useMemo(() => {
    if (!budget.totalBudget) return 0;
    return Math.round((budget.totalSpent / budget.totalBudget) * 100);
  }, [budget.totalBudget, budget.totalSpent]);

  if (loading) {
    return (
      <div className="p-6">
        <Loader text="Loading admin dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message={error} onRetry={() => setRefreshToken((prev) => prev + 1)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-5 lg:p-6">
      <DashboardHeader
        title="Admin Dashboard"
        subtitle="System-wide club performance and operations snapshot"
        userName={user?.user_metadata?.full_name || user?.email}
        roleLabel="Admin"
      />

      <StatGrid>
        <StatCard title="Active Events" value={dashboard.stats.activeEvents} icon={<StatIcon type="events" />} tone="blue" />
        <StatCard title="Total Members" value={dashboard.stats.totalMembers} icon={<StatIcon type="members" />} tone="green" />
        <StatCard title="Tasks Completed" value={dashboard.stats.tasksCompleted} icon={<StatIcon type="tasks" />} tone="purple" />
        <StatCard title="Budget Spent" value={formatCurrency(dashboard.stats.budgetSpent)} icon={<StatIcon type="budget" />} tone="orange" />
      </StatGrid>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardSection title="Recent Events" subtitle="Latest 5 events with volunteer load and completion">
          {dashboard.recentEvents.length === 0 ? (
            <EmptyState message="No recent events found." />
          ) : (
            <div className="space-y-4">
              {dashboard.recentEvents.map((event) => (
                <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">{event.name}</h3>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{event.volunteers} volunteers</p>
                  <div className="mt-3 space-y-1.5">
                    <ProgressBar value={event.completion} color="cyan" />
                    <p className="text-right text-xs font-medium text-slate-600">{event.completion}% complete</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Upcoming Tasks" subtitle="Next tasks sorted by nearest deadline">
          {dashboard.upcomingTasks.length === 0 ? (
            <EmptyState message="No upcoming tasks found." />
          ) : (
            <div className="space-y-3">
              {dashboard.upcomingTasks.map((task) => (
                <article key={task.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{task.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">Assigned to {task.assignedMember}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{formatDate(task.deadline)}</p>
                    <div className="mt-1">
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </DashboardSection>
      </section>

      <DashboardSection title="Budget Overview" subtitle="Budget health and category-wise spending">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BudgetCell title="Total Budget" value={formatCurrency(budget.totalBudget)} />
          <BudgetCell title="Total Spent" value={formatCurrency(budget.totalSpent)} tone="text-amber-700" />
          <BudgetCell title="Pending" value={formatCurrency(budget.pending)} tone="text-violet-700" />
          <BudgetCell title="Remaining Budget" value={formatCurrency(budget.remaining)} tone="text-emerald-700" />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Budget usage</span>
            <span className="text-slate-500">{budgetUsage}%</span>
          </div>
          <ProgressBar value={budgetUsage} color="amber" />
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Spending by Category</h3>
          {budget.categories.length === 0 ? (
            <EmptyState message="No budget categories found yet." />
          ) : (
            budget.categories.map((category) => {
              const denominator = budget.totalSpent || budget.totalBudget;
              const categoryPercent = denominator
                ? Math.round((category.amount / denominator) * 100)
                : 0;

              return (
                <div key={category.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{category.name}</span>
                    <span>{formatCurrency(category.amount)}</span>
                  </div>
                  <ProgressBar value={categoryPercent} color="violet" />
                </div>
              );
            })
          )}
        </div>
      </DashboardSection>
    </div>
  );
}

function BudgetCell({ title, value, tone = "text-slate-900" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
