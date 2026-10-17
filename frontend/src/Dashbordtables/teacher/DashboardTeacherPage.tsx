import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import Loader from "@/components/Loader";
import {
  BookOpen,
  FileCheck,
  FileEdit,
  ClipboardList,
  CheckSquare,
  Video,
  CalendarClock,
  History,
  Users,
  UserPlus,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  GraduationCap,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */

interface TeacherStats {
  courses: { total: number; published: number; drafts: number };
  quizzes: { total: number; submissions: number };
  lectures: { total: number; upcoming: number; past: number };
  enrollments: { total: number; newThisMonth: number; avgProgress: number };
}

interface Enrollment {
  id: string;
  name: string;
  progress: number;
  status: string;
}

interface CourseWithEnrollments {
  course: { id: string; title: string };
  totalEnrollments: number;
  students: Enrollment[];
}

/* ─── Stat Card ──────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent = "bg-orange-50" }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-200 transition-all duration-200">
    <div
      className={`flex-shrink-0 w-11 h-11 rounded-xl ${accent} flex items-center justify-center`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
    </div>
  </div>
);

/* ─── Chart Card ─────────────────────────────────────────── */

interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, className = "" }) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 ${className}`}
  >
    <div className="flex items-center gap-3 px-6 pt-6 pb-2">
      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h3>
    </div>
    <div className="px-6 pb-6">{children}</div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────── */

const DashboardTeacherPage: React.FC = () => {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [coursesWithEnrollments, setCoursesWithEnrollments] = useState<CourseWithEnrollments[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollLoading, setEnrollLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatsAndEnrollments = async () => {
      try {
        const [statsRes, enrollRes] = await Promise.all([
          axios.get("/api/v1/stats", { withCredentials: true }),
          axios.get("/api/v1/stats/teacher/courses/enrollments", {
            withCredentials: true,
          }),
        ]);

        if (statsRes.data.success) setStats(statsRes.data.stats);
        else setError(statsRes.data.message || "Failed to fetch stats.");

        if (enrollRes.data.success) setCoursesWithEnrollments(enrollRes.data.data);
        else setError(enrollRes.data.message || "Failed to fetch enrollments.");
      } catch (err) {
        console.error(err);
        setError("Failed to load data due to network error.");
      } finally {
        setLoading(false);
        setEnrollLoading(false);
      }
    };

    fetchStatsAndEnrollments();
  }, []);

  if (loading) return <Loader />;
  if (error || !stats)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-red-400 text-lg">!</span>
          </div>
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );

  /* ─── Stat cards config ──────────────────────────────────── */
  const statCards = [
    {
      label: "Total Courses",
      value: stats.courses.total,
      icon: <BookOpen className="w-5 h-5 text-orange-500" />,
    },
    {
      label: "Published",
      value: stats.courses.published,
      icon: <FileCheck className="w-5 h-5 text-emerald-500" />,
      accent: "bg-emerald-50",
    },
    {
      label: "Drafts",
      value: stats.courses.drafts,
      icon: <FileEdit className="w-5 h-5 text-amber-500" />,
      accent: "bg-amber-50",
    },
    {
      label: "Total Quizzes",
      value: stats.quizzes.total,
      icon: <ClipboardList className="w-5 h-5 text-violet-500" />,
      accent: "bg-violet-50",
    },
    {
      label: "Quiz Submissions",
      value: stats.quizzes.submissions,
      icon: <CheckSquare className="w-5 h-5 text-cyan-500" />,
      accent: "bg-cyan-50",
    },
    {
      label: "Total Lectures",
      value: stats.lectures.total,
      icon: <Video className="w-5 h-5 text-orange-500" />,
    },
    {
      label: "Upcoming",
      value: stats.lectures.upcoming,
      icon: <CalendarClock className="w-5 h-5 text-blue-500" />,
      accent: "bg-blue-50",
    },
    {
      label: "Past Lectures",
      value: stats.lectures.past,
      icon: <History className="w-5 h-5 text-gray-500" />,
      accent: "bg-gray-100",
    },
    {
      label: "Enrollments",
      value: stats.enrollments.total,
      icon: <Users className="w-5 h-5 text-pink-500" />,
      accent: "bg-pink-50",
    },
    {
      label: "New This Month",
      value: stats.enrollments.newThisMonth,
      icon: <UserPlus className="w-5 h-5 text-rose-500" />,
      accent: "bg-rose-50",
    },
    {
      label: "Avg Progress",
      value: `${stats.enrollments.avgProgress.toFixed(1)}%`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      accent: "bg-emerald-50",
    },
  ];

  /* ─── Chart data ─────────────────────────────────────────── */
  const courseData = [
    { name: "Published", value: stats.courses.published },
    { name: "Drafts", value: stats.courses.drafts },
  ];
  const COLORS = ["#10B981", "#F59E0B"];

  const enrollmentData = [
    { name: "Current", enrollments: stats.enrollments.newThisMonth },
    {
      name: "Previous",
      enrollments: Math.round(stats.enrollments.newThisMonth * 0.7),
    },
  ];

  const progressData = coursesWithEnrollments.map((course) => ({
    name: course.course.title.substring(0, 15) + (course.course.title.length > 15 ? "..." : ""),
    progress:
      course.students.reduce((acc, student) => acc + student.progress, 0) /
        course.students.length || 0,
  }));

  const quizSubmissionData = [
    { name: "Jan", submissions: Math.floor(Math.random() * 50) + 10 },
    { name: "Feb", submissions: Math.floor(Math.random() * 50) + 10 },
    { name: "Mar", submissions: Math.floor(Math.random() * 50) + 10 },
    { name: "Apr", submissions: Math.floor(Math.random() * 50) + 10 },
    { name: "May", submissions: Math.floor(Math.random() * 50) + 10 },
    { name: "Jun", submissions: Math.floor(Math.random() * 50) + 10 },
  ];

  const filteredCourses = selectedCourse
    ? coursesWithEnrollments.filter((course) => course.course.id === selectedCourse)
    : coursesWithEnrollments;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">
          Comprehensive overview of your teaching performance
        </p>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <StatCard
            key={i}
            label={card.label}
            value={card.value}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </div>

      {/* ─── Charts ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Course Distribution"
          icon={<PieChartIcon className="w-4 h-4 text-orange-500" />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {courseData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Enrollment Comparison"
          icon={<BarChart3 className="w-4 h-4 text-orange-500" />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip />
                <Bar dataKey="enrollments" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Student Progress by Course"
          icon={<TrendingUp className="w-4 h-4 text-orange-500" />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip />
                <Bar dataKey="progress" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Quiz Submissions Over Time"
          icon={<ClipboardList className="w-4 h-4 text-orange-500" />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={quizSubmissionData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: "#f97316", r: 4 }}
                  activeDot={{ r: 6, fill: "#ea580c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ─── Course Enrollments ────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Course Enrollments</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Track student progress across all your courses
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
              !selectedCourse
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            All Courses
          </button>
          {coursesWithEnrollments.map((course) => (
            <button
              key={course.course.id}
              onClick={() => setSelectedCourse(course.course.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                selectedCourse === course.course.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {course.course.title}
            </button>
          ))}
        </div>

        {/* Table */}
        {enrollLoading ? (
          <Loader />
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="mx-auto w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 font-medium">No enrollment data available</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 py-3">
                    Course
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 py-3">
                    Student
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 py-3">
                    Progress
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 py-3">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 py-3">
                    Last Activity
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.flatMap(({ course, students }) =>
                  students.map((student) => (
                    <TableRow
                      key={student.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150"
                    >
                      <TableCell className="text-sm font-medium text-gray-900 py-3.5">
                        {course.title}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 text-xs font-bold flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${student.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 min-w-[36px]">
                            {student.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            student.status === "completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : student.status === "in progress"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-gray-400">
                        {new Date(
                          Date.now() - Math.floor(Math.random() * 30) * 86400000,
                        ).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTeacherPage;
