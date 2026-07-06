import { useEffect, useMemo, useState } from "react";
import { Loader, ErrorState } from "../../../components";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import {
  DashboardHeader,
  DashboardSection,
  EmptyState,
  PriorityBadge,
  StatCard,
  StatGrid,
  StatusBadge,
} from "../DashboardUI";

function StatIcon({ type }) {
  const iconMap = {
    events: "E",
    tasks: "T",
    progress: "P",
    team: "TM",
  };

  return <span className="text-xs font-semibold">{iconMap[type] || "M"}</span>;
}

function formatDate(value) {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resolveTeamName(teamMap, teamId) {
  if (!teamId) return "General";
  return teamMap.get(String(teamId)) || `Team ${teamId}`;
}

function uniqueBy(items, getKey) {
  const map = new Map();
  items.forEach((item) => {
    map.set(getKey(item), item);
  });
  return Array.from(map.values());
}

function normalizeTaskStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "completed";
  if (normalized === "in_progress") return "in_progress";
  if (normalized === "cancelled") return "cancelled";
  return "pending";
}

export default function MemberDashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState({
    stats: {
      myEvents: 0,
      myTasks: 0,
      c2cProgress: "0/0",
      teamMembers: 0,
    },
    upcomingEvents: [],
    myTasks: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    const fetchDashboard = async (silent = false) => {
      if (!mounted) return;

      setError("");
      if (!silent) {
        setLoading(true);
      }

      try {
        const { data: memberRows, error: memberError } = await supabase
          .from("members")
          .select("id, name, user_id")
          .eq("user_id", user.id)
          .limit(1);

        if (memberError) throw memberError;

        const member = memberRows?.[0] || null;
        const memberId = member?.id;

        const volunteerByEmailPromise = user.email
          ? supabase
              .from("volunteers")
              .select("id, event_id, team_id, role, email, member_id, events(id, name, status, date)")
              .eq("email", user.email)
          : Promise.resolve({ data: [] });

        const volunteerByMemberPromise = memberId
          ? supabase
              .from("volunteers")
              .select("id, event_id, team_id, role, email, member_id, events(id, name, status, date)")
              .eq("member_id", memberId)
          : Promise.resolve({ data: [] });

        const taskByMemberPromise = memberId
          ? supabase
              .from("tasks")
              .select("id, title, event_id, assigned_to, deadline, priority, status, events(name)")
              .eq("assigned_to", memberId)
          : Promise.resolve({ data: [] });

        const taskByUserPromise = supabase
          .from("tasks")
          .select("id, title, event_id, assigned_to, deadline, priority, status, events(name)")
          .eq("assigned_to", user.id);

        const [volByEmailRes, volByMemberRes, taskByMemberRes, taskByUserRes, teamsRes] = await Promise.allSettled([
          volunteerByEmailPromise,
          volunteerByMemberPromise,
          taskByMemberPromise,
          taskByUserPromise,
          supabase.from("teams").select("id, name"),
        ]);

        const volunteerData = [
          ...(volByEmailRes.status === "fulfilled" ? (volByEmailRes.value.data || []) : []),
          ...(volByMemberRes.status === "fulfilled" ? (volByMemberRes.value.data || []) : []),
        ];

        const uniqueVolunteers = uniqueBy(volunteerData, (row) => String(row.id));

        const taskData = uniqueBy(
          [
            ...(taskByMemberRes.status === "fulfilled" ? (taskByMemberRes.value.data || []) : []),
            ...(taskByUserRes.status === "fulfilled" ? (taskByUserRes.value.data || []) : []),
          ],
          (row) => String(row.id)
        );

        const teamMap = new Map(
          (teamsRes.status === "fulfilled" ? (teamsRes.value.data || []) : []).map((team) => [
            String(team.id),
            team.name || `Team ${team.id}`,
          ])
        );

        const upcomingEvents = uniqueVolunteers
          .filter((row) => row.events)
          .map((row) => ({
            id: row.events.id,
            name: row.events.name || "Untitled Event",
            role: row.role || "Volunteer",
            team: resolveTeamName(teamMap, row.team_id),
            status: row.events.status || "planned",
            date: row.events.date,
          }))
          .sort((a, b) => {
            const aTime = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
            const bTime = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
            return aTime - bTime;
          })
          .slice(0, 5);

        const sortedTasks = [...taskData]
          .sort((a, b) => {
            const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
            const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
            return aTime - bTime;
          })
          .slice(0, 5)
          .map((task) => ({
            id: task.id,
            title: task.title || "Untitled Task",
            eventName: task.events?.name || "General",
            deadline: task.deadline,
            priority: task.priority || "medium",
            status: normalizeTaskStatus(task.status),
          }));

        const completedTasksCount = taskData.filter(
          (task) => normalizeTaskStatus(task.status) === "completed"
        ).length;

        const teamIds = uniqueVolunteers
          .map((row) => row.team_id)
          .filter((teamId) => teamId !== null && teamId !== undefined);

        let teamMembers = 0;
        if (teamIds.length > 0) {
          const { data: teamVolunteerRows } = await supabase
            .from("volunteers")
            .select("id, member_id, email, team_id")
            .in("team_id", teamIds);

          const uniqueMembers = new Set(
            (teamVolunteerRows || []).map(
              (row) => row.member_id || row.email || `volunteer-${row.id}`
            )
          );
          teamMembers = uniqueMembers.size;
        }

        if (mounted) {
          setDashboard({
            stats: {
              myEvents: upcomingEvents.length,
              myTasks: taskData.length,
              c2cProgress: `${completedTasksCount}/${taskData.length}`,
              teamMembers,
            },
            upcomingEvents,
            myTasks: sortedTasks,
          });
          setLoading(false);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || "Failed to load member dashboard data");
          setLoading(false);
        }
      }
    };

    fetchDashboard(false);

    const channel = supabase
      .channel(`member-dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "volunteers" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => fetchDashboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => fetchDashboard(true))
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, refreshToken]);

  const sortedTasks = useMemo(() => dashboard.myTasks || [], [dashboard.myTasks]);

  if (loading) {
    return (
      <div className="p-6">
        <Loader text="Loading member dashboard..." />
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
        title="Member Dashboard"
        subtitle="Your assignments, events, and team progress"
        userName={user?.user_metadata?.full_name || user?.email}
        roleLabel="Member"
      />

      <StatGrid>
        <StatCard title="My Events" value={dashboard.stats.myEvents} icon={<StatIcon type="events" />} tone="blue" />
        <StatCard title="My Tasks" value={dashboard.stats.myTasks} icon={<StatIcon type="tasks" />} tone="green" />
        <StatCard
          title="C2C Progress"
          value={dashboard.stats.c2cProgress}
          icon={<StatIcon type="progress" />}
          tone="purple"
          helper="Completed vs assigned coverage"
        />
        <StatCard title="Team Members" value={dashboard.stats.teamMembers} icon={<StatIcon type="team" />} tone="orange" />
      </StatGrid>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardSection title="My Upcoming Events" subtitle="Events where you are actively participating">
          {dashboard.upcomingEvents.length === 0 ? (
            <EmptyState message="No upcoming events assigned yet." />
          ) : (
            <div className="space-y-3">
              {dashboard.upcomingEvents.map((event) => (
                <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">{event.name}</h3>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Role: {event.role}</p>
                  <span className="mt-2 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
                    {event.team}
                  </span>
                </article>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="My Tasks" subtitle="Tasks assigned to your account">
          {sortedTasks.length === 0 ? (
            <EmptyState message="No task assignments found." />
          ) : (
            <div className="space-y-3">
              {sortedTasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{task.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{task.eventName}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(task.deadline)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </DashboardSection>
      </section>
    </div>
  );
}
