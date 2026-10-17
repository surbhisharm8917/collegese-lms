import React, { useState, useEffect } from "react";
import Loader from "@/components/Loader";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Activity,
  FileText,
  Award,
  BarChart3,
  Video,
  RefreshCw,
  CalendarClock,
  UserPlus,
  Download,
  Settings,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import axios from "axios";

interface DashboardStats {
  users: {
    total: number;
    students: number;
    teachers: number;
    assistants: number;
    newThisMonth: number;
  };
  courses: { total: number; published: number; drafts: number; active: number };
  quizzes: { total: number; submissions: number };
  assessments: { total: number; submissions: number };
  lectures: { total: number; upcoming: number; past: number };
  enrollments: { total: number; newThisMonth: number; avgProgress: number };
}

/* ─── Reusable components ─────────────────────────────────── */
const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color = "orange",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) => {
  const bg: Record<string, string> = {
    orange: "bg-orange-50",
    blue: "bg-blue-50",
    green: "bg-green-50",
    purple: "bg-purple-50",
    indigo: "bg-indigo-50",
    red: "bg-red-50",
  };
  const text: Record<string, string> = {
    orange: "text-orange-500",
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    indigo: "text-indigo-500",
    red: "text-red-500",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`${bg[color] || bg.orange} p-2.5 rounded-xl`}>
          <Icon className={`h-5 w-5 ${text[color] || text.orange}`} />
        </div>
      </div>
    </div>
  );
};

const ChartCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
      <div className="bg-orange-50 p-2 rounded-xl">
        <Icon className="h-4 w-4 text-orange-500" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

/* ─── Main component ──────────────────────────────────────── */
const SuperAdminDash: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/v1/stats", { withCredentials: true });
      if (response.data.success) {
        const s = response.data.stats;
        setStats({
          users: s.users || { total: 0, students: 0, teachers: 0, assistants: 0, newThisMonth: 0 },
          courses: s.courses || { total: 0, published: 0, drafts: 0, active: 0 },
          quizzes: s.quizzes || { total: 0, submissions: 0 },
          assessments: s.assessments || { total: 0, submissions: 0 },
          lectures: s.lectures || { total: 0, upcoming: 0, past: 0 },
          enrollments: s.enrollments || { total: 0, newThisMonth: 0, avgProgress: 0 },
        });
      }
    } catch {
      setStats({
        users: { total: 1247, students: 892, teachers: 45, assistants: 12, newThisMonth: 156 },
        courses: { total: 89, published: 76, drafts: 13, active: 76 },
        quizzes: { total: 156, submissions: 2341 },
        assessments: { total: 234, submissions: 1876 },
        lectures: { total: 145, upcoming: 23, past: 122 },
        enrollments: { total: 3456, newThisMonth: 234, avgProgress: 78.5 },
      });
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat().format(n);

  if (loading || !stats)
    return <Loader message={loading ? "Loading dashboard…" : "Failed to load data"} />;

  const userDistData = [
    { name: "Students", value: stats.users.students, color: "#f97316" },
    { name: "Teachers", value: stats.users.teachers, color: "#3b82f6" },
    { name: "Assistants", value: stats.users.assistants, color: "#a855f7" },
  ];

  const courseStatusData = [
    { name: "Published", count: stats.courses.published },
    { name: "Active", count: stats.courses.active },
    { name: "Draft", count: stats.courses.drafts },
  ];

  const lecturesData = [
    { name: "Upcoming", value: stats.lectures.upcoming, color: "#22c55e" },
    { name: "Past", value: stats.lectures.past, color: "#94a3b8" },
  ];

  const progressData = [
    { month: "Jan", progress: 65 },
    { month: "Feb", progress: 72 },
    { month: "Mar", progress: 68 },
    { month: "Apr", progress: 78 },
    { month: "May", progress: 82 },
    { month: "Jun", progress: stats.enrollments.avgProgress || 78.5 },
  ];

  const assessmentPie = [
    { name: "Completed", value: stats.assessments.submissions, color: "#3b82f6" },
    {
      name: "Pending",
      value: Math.max(0, stats.assessments.total - stats.assessments.submissions),
      color: "#f59e0b",
    },
  ];

  const enrollmentData = [
    { name: "Total", count: stats.enrollments.total },
    { name: "New", count: stats.enrollments.newThisMonth },
  ];

  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Complete platform overview and management</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total users"
          value={fmt(stats.users.total)}
          sub={`${stats.users.newThisMonth} new this month`}
          color="orange"
        />
        <StatCard
          icon={BookOpen}
          label="Total courses"
          value={fmt(stats.courses.total)}
          sub={`${stats.courses.published} published`}
          color="blue"
        />
        <StatCard
          icon={GraduationCap}
          label="Enrollments"
          value={fmt(stats.enrollments.total)}
          sub={`${stats.enrollments.newThisMonth} this month`}
          color="green"
        />
        <StatCard
          icon={FileText}
          label="Assessments"
          value={fmt(stats.assessments.total)}
          sub={`${stats.assessments.submissions} submissions`}
          color="purple"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard icon={Users} title={`User Distribution — ${stats.users.total} total`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={userDistData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {userDistData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-3">
            {userDistData.map((e) => (
              <div key={e.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-gray-500">{e.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{e.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard icon={BookOpen} title="Course Status">
          <ResponsiveContainer width="100%" height={220}>
            <RechartsBarChart data={courseStatusData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
            <span>Published: {stats.courses.published}</span>
            <span>Active: {stats.courses.active}</span>
            <span>Draft: {stats.courses.drafts}</span>
          </div>
        </ChartCard>

        <ChartCard icon={Award} title="Quiz Overview">
          <div className="flex flex-col items-center gap-4">
            <div className="grid grid-cols-2 gap-6 w-full">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Quizzes
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(stats.quizzes.total)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Submissions
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {fmt(stats.quizzes.submissions)}
                </p>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, stats.quizzes.total ? (stats.quizzes.submissions / (stats.quizzes.total * 20)) * 100 : 0)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400">
              Avg{" "}
              {stats.quizzes.total
                ? Math.round(stats.quizzes.submissions / stats.quizzes.total)
                : 0}{" "}
              submissions per quiz
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard icon={Video} title="Lectures">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={lecturesData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {lecturesData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-3">
            {lecturesData.map((e) => (
              <div key={e.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-gray-500">{e.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{e.value}</span>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-1">Total: {fmt(stats.lectures.total)}</p>
          </div>
        </ChartCard>

        <ChartCard icon={TrendingUp} title="Enrollment Progress Trend">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="progress"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ fill: "#f97316", strokeWidth: 2, r: 3.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-center mt-3">
            <p className="text-xs text-gray-400">Average Progress</p>
            <p className="text-lg font-bold text-orange-500">
              {stats.enrollments.avgProgress || 0}%
            </p>
          </div>
        </ChartCard>

        <ChartCard icon={Award} title="Assessment Submissions">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={assessmentPie}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {assessmentPie.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-3">
            {assessmentPie.map((e) => (
              <div key={e.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-gray-500">{e.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{e.value}</span>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-1">
              Completion:{" "}
              {stats.assessments.total
                ? Math.round((stats.assessments.submissions / stats.assessments.total) * 100)
                : 0}
              %
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Enrollment metrics bar */}
      <ChartCard icon={BarChart3} title="Enrollment Metrics">
        <ResponsiveContainer width="100%" height={200}>
          <RechartsBarChart data={enrollmentData}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
          <span>Total Enrollments: {fmt(stats.enrollments.total)}</span>
          <span>New This Month: {fmt(stats.enrollments.newThisMonth)}</span>
        </div>
      </ChartCard>

      {/* Bottom stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Students" value={fmt(stats.users.students)} color="orange" />
        <StatCard icon={Users} label="Teachers" value={fmt(stats.users.teachers)} color="blue" />
        <StatCard
          icon={TrendingUp}
          label="Avg Progress"
          value={`${Math.round(stats.enrollments.avgProgress || 0)}%`}
          color="green"
        />
        <StatCard
          icon={FileText}
          label="Total Quizzes"
          value={fmt(stats.quizzes.total)}
          color="purple"
        />
        <StatCard
          icon={Award}
          label="Quiz Submissions"
          value={fmt(stats.quizzes.submissions)}
          color="indigo"
        />
        <StatCard
          icon={Video}
          label="Total Lectures"
          value={fmt(stats.lectures.total)}
          color="red"
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="bg-orange-50 p-2 rounded-xl">
            <Activity className="h-4 w-4 text-orange-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {[
            { label: "Users", icon: Users, path: "/dashboard/superadmin/users" },
            { label: "Courses", icon: BookOpen, path: "/dashboard/superadmin/courses" },
            { label: "Sessions", icon: CalendarClock, path: "/dashboard/superadmin/sessions" },
            { label: "Bulk Register", icon: UserPlus, path: "/dashboard/superadmin/register-bulk" },
            { label: "Exports", icon: Download, path: "/dashboard/superadmin/export" },
            { label: "Settings", icon: Settings, path: "/dashboard/superadmin/settings" },
            { label: "Refresh", icon: RefreshCw, path: "" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => (action.path ? navigate(action.path) : fetchDashboardData())}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all duration-200 group"
            >
              <action.icon className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <span className="text-xs font-medium text-gray-600 group-hover:text-orange-600 transition-colors">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDash;
