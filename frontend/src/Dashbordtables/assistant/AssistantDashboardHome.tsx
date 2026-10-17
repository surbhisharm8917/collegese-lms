/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import api from "@/lib/api";
import {
  BookCheck,
  Hourglass,
  Users,
  Bell,
  BarChart2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Target,
  Award,
  BookOpen,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

interface AssistantDashboardStats {
  overview: {
    totalAssignedAssessments: number;
    pendingGrading: number;
    totalStudentsSupported: number;
    upcomingLectures: number;
    completedGrading: number;
    overduePendingGrading: number;
    recentGradingActivity: number;
    coursesSupported: number;
    averageGradingTimeHours: number;
    weeklyGradingProgress: number;
    unreadNotifications: number;
    urgentTasks: number;
  };
  assignedAssessments: any[];
  studentsSupported: Array<{
    user: { name?: string; email?: string; profilePic?: string };
    course: { title?: string };
  }>;
  upcomingLectures: Array<{
    title: string;
    course: { title: string };
    startTime: string;
  }>;
  notifications: Array<{
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
  }>;
  workloadBreakdown: {
    assessments: Array<{
      id: string;
      title: string;
      course: string;
      pendingSubmissions: number;
      dueDate: string | null;
      oldestSubmission: number | null;
    }>;
  };
  coursesSupported: Array<{
    id: string;
    title: string;
    assessmentCount: number;
    studentCount: number;
    teachers: Array<{ name: string; email: string }>;
  }>;
  gradingStats: {
    distribution: Array<{ gradeRange: string; count: number }>;
    recentActivity: Array<{
      id: string;
      assessmentTitle: string;
      courseTitle: string;
      studentName: string;
      grade: number;
      totalMarks: number;
      gradedAt: string;
      turnaroundTime: number | null;
    }>;
  };
  quickActions: {
    urgentGrading: number;
    overdueItems: number;
    todaysTarget: number;
    weeklyProgress: string;
  };
}

/* ── Stat Card ────────────────────────────────────────────── */
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  accent?: string;
  subtitle?: string;
}> = ({ title, value, icon: Icon, accent = "text-orange-500 bg-orange-50", subtitle }) => {
  const [iconColor, bgColor] = accent.split(" ");
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bgColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </span>
      </div>
    </div>
  );
};

/* ── Chart Card wrapper ───────────────────────────────────── */
const ChartCard: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, icon: Icon, children, action }) => (
  <div className="rounded-2xl border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
          <Icon className="h-4 w-4 text-orange-500" />
        </span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

/* ── Empty state ──────────────────────────────────────────── */
const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  message: string;
}> = ({ icon: Icon, title, message }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
      <Icon className="h-5 w-5 text-gray-300" />
    </span>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="text-xs text-gray-400">{message}</p>
  </div>
);

/* ── Main Dashboard Component ─────────────────────────────── */
const AssistantDashboardHome = () => {
  const [stats, setStats] = useState<AssistantDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/assistant/stats");
        const json = res.data;
        if (!json.error) {
          setStats(json);
        }
      } catch (error) {
        console.error("Error fetching assistant dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <Loader message="Loading dashboard…" />;
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center text-red-600 text-sm">
        Failed to load assistant dashboard stats. Please try refreshing the page.
      </div>
    );
  }

  const workloadTimelineData = stats.workloadBreakdown.assessments
    .slice(0, 5)
    .map((assessment) => ({
      name: assessment.title.slice(0, 15) + "…",
      pending: assessment.pendingSubmissions,
      daysOverdue: assessment.oldestSubmission
        ? Math.floor((Date.now() - assessment.oldestSubmission) / (1000 * 60 * 60 * 24))
        : 0,
    }));

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Overview
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Assistant Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your grading workload and track performance metrics
          </p>
        </div>

        {(stats.quickActions.urgentGrading > 0 || stats.quickActions.overdueItems > 0) && (
          <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-semibold">Action Required</span>
            </div>
            <p className="mt-1 text-[11px] text-red-500">
              {stats.quickActions.urgentGrading} urgent + {stats.quickActions.overdueItems} overdue
              items
            </p>
          </div>
        )}
      </div>

      {/* ── Stat cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Assigned"
          value={stats.overview.totalAssignedAssessments}
          icon={BookCheck}
          accent="text-blue-500 bg-blue-50"
          subtitle={`${stats.overview.coursesSupported} courses`}
        />
        <StatCard
          title="Pending Grading"
          value={stats.overview.pendingGrading}
          icon={Hourglass}
          accent={
            stats.overview.pendingGrading > 20
              ? "text-red-500 bg-red-50"
              : "text-orange-500 bg-orange-50"
          }
          subtitle={`${stats.overview.overduePendingGrading} overdue`}
        />
        <StatCard
          title="Completed / Week"
          value={stats.overview.weeklyGradingProgress}
          icon={CheckCircle}
          accent="text-emerald-500 bg-emerald-50"
          subtitle="Graded submissions"
        />
        <StatCard
          title="Avg. Time"
          value={`${stats.overview.averageGradingTimeHours}h`}
          icon={Clock}
          accent="text-violet-500 bg-violet-50"
          subtitle="Per submission"
        />
        <StatCard
          title="Students"
          value={stats.overview.totalStudentsSupported}
          icon={Users}
          accent="text-teal-500 bg-teal-50"
        />
        <StatCard
          title="Daily Target"
          value={stats.quickActions.todaysTarget}
          icon={Target}
          accent="text-indigo-500 bg-indigo-50"
          subtitle="Suggested goal"
        />
      </div>

      {/* ── Charts + sidebar ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main — 8 cols */}
        <div className="space-y-6 lg:col-span-8">
          {/* Workload chart */}
          <ChartCard title="Assessment Workload" icon={BarChart2}>
            {workloadTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={workloadTimelineData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(249,115,22,0.06)" }}
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "1px solid #f3f4f6",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="pending"
                    name="Pending Submissions"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BarChart2}
                title="No Workload Data"
                message="Pending assessments will appear here."
              />
            )}
          </ChartCard>

          {/* Recent grading activity */}
          <ChartCard title="Recent Grading Activity" icon={Award}>
            {stats.gradingStats.recentActivity.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {stats.gradingStats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-orange-50/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {activity.assessmentTitle}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {activity.studentName} · {activity.courseTitle}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-bold text-gray-900">
                        {activity.grade}/{activity.totalMarks}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {activity.turnaroundTime
                          ? `${activity.turnaroundTime}d`
                          : new Date(activity.gradedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Award}
                title="No Recent Activity"
                message="Your recently graded submissions will be listed here."
              />
            )}
          </ChartCard>
        </div>

        {/* Sidebar — 4 cols */}
        <div className="space-y-6 lg:col-span-4">
          {/* Courses supported */}
          <ChartCard title="Courses Supported" icon={BookOpen}>
            {stats.coursesSupported.length > 0 ? (
              <div className="space-y-2">
                {stats.coursesSupported.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-xl border border-gray-100 p-3 hover:bg-orange-50/40 transition-colors"
                  >
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{course.title}</h4>
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                      <span>{course.assessmentCount} assessments</span>
                      <span>{course.studentCount} students</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No Courses Assigned"
                message="The courses you support will appear here."
              />
            )}
          </ChartCard>

          {/* Notifications */}
          <div className="rounded-2xl border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
                  <Bell className="h-4 w-4 text-orange-500" />
                </span>
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              </div>
              {stats.overview.unreadNotifications > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {stats.overview.unreadNotifications}
                </span>
              )}
            </div>
            <div className="p-4 space-y-2">
              {stats.notifications.length > 0 ? (
                stats.notifications.slice(0, 5).map((notification, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl p-3 text-sm transition-colors",
                      !notification.isRead
                        ? "bg-orange-50/60 border border-orange-100"
                        : "border border-gray-50",
                    )}
                  >
                    <p className="font-medium text-gray-900 text-xs">{notification.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{notification.message}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Bell}
                  title="No Notifications"
                  message="You have no new notifications."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantDashboardHome;
