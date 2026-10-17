import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader";
import QuizTrendChart from "@/components/student/QuizTrendChart";
import AssessmentStatusChart from "@/components/student/AssessmentStatusChart";
import LiveLecturesChart from "@/components/student/LiveLecturesChart";
import EnrolledCoursesChart from "@/components/student/EnrolledCoursesChart";
import StudentPaymentPanel from "@/components/student/StudentPaymentPanel";
import {
  fetchStudentOverview,
  fetchQuizTrend,
  fetchAssessmentStatus,
  fetchLiveLecturesAnalytics,
  fetchEnrolledCourses,
  syncCourseCompletion,
} from "@/utils/studentStatsAPI";
import type {
  StudentOverview,
  QuizTrend as QuizTrendType,
  AssessmentStatus as AssessmentStatusType,
  LiveLecturesAnalytics,
  EnrolledCoursesData,
} from "@/utils/studentStatsAPI";
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  Star,
  Video,
  ClipboardList,
  FileText,
  RefreshCw,
  BarChart3,
  PieChart,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */

interface Stats {
  totalQuizzes: number;
  totalAssessments: number;
  totalLectures: number;
  totalExams: number;
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
  loading: boolean;
  hasData: boolean;
  emptyText: string;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  icon,
  loading,
  hasData,
  emptyText,
  children,
  className = "",
}) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 ${className}`}
  >
    <div className="flex items-center gap-3 px-6 pt-6 pb-2">
      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h3>
    </div>
    <div className="px-6 pb-6">
      {loading ? (
        <div className="flex items-center justify-center h-72">
          <Loader />
        </div>
      ) : hasData ? (
        children
      ) : (
        <div className="flex flex-col items-center justify-center h-72 text-gray-400">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <BarChart3 className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm">{emptyText}</p>
        </div>
      )}
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────── */

const StudentDashboardHome: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [studentOverview, setStudentOverview] = useState<StudentOverview | null>(null);
  const [quizTrend, setQuizTrend] = useState<QuizTrendType[]>([]);
  const [assessmentStatus, setAssessmentStatus] = useState<AssessmentStatusType | null>(null);
  const [liveLecturesAnalytics, setLiveLecturesAnalytics] = useState<LiveLecturesAnalytics | null>(
    null,
  );
  const [enrolledCoursesData, setEnrolledCoursesData] = useState<EnrolledCoursesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  /* ── Data fetching ──────────────────────────────────────── */

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("/api/v1/stats");
        if (res.data.success) {
          const s = res.data.stats;
          setStats({
            totalQuizzes: s.quizzes.total,
            totalAssessments: s.assessments.total,
            totalLectures: s.lectures.total,
            totalExams: s.exams?.total || 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch student stats", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        setError(null);
        const [overview, trend, status, liveLectures, enrolledCourses] = await Promise.allSettled([
          fetchStudentOverview(),
          fetchQuizTrend(),
          fetchAssessmentStatus(),
          fetchLiveLecturesAnalytics(),
          fetchEnrolledCourses(),
        ]);
        if (overview.status === "fulfilled") setStudentOverview(overview.value);
        if (trend.status === "fulfilled") setQuizTrend(trend.value);
        if (status.status === "fulfilled") setAssessmentStatus(status.value);
        if (liveLectures.status === "fulfilled") setLiveLecturesAnalytics(liveLectures.value);
        if (enrolledCourses.status === "fulfilled") setEnrolledCoursesData(enrolledCourses.value);

        [overview, trend, status, liveLectures, enrolledCourses].forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(
              `Failed to fetch ${
                ["overview", "trend", "status", "liveLectures", "enrolledCourses"][index]
              }:`,
              result.reason,
            );
          }
        });
      } catch (err) {
        console.error("Failed to fetch analytics", err);
        setError("Failed to load analytics data");
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchStats();
    fetchAnalytics();
  }, []);

  /* ── Sync handler ───────────────────────────────────────── */

  const handleSyncCompletion = async () => {
    try {
      setSyncLoading(true);
      setSyncMessage(null);
      setError(null);
      const result = await syncCourseCompletion();
      if (result.success) {
        setSyncMessage(result.message);
        const overview = await fetchStudentOverview();
        const enrolledCourses = await fetchEnrolledCourses();
        if (overview) setStudentOverview(overview);
        if (enrolledCourses) setEnrolledCoursesData(enrolledCourses);
      }
    } catch (err) {
      console.error("Sync completion error:", err);
      setError("Failed to sync course completion status");
    } finally {
      setSyncLoading(false);
    }
  };

  /* ── Loading state ──────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Your academic progress at a glance</p>
        </div>

        <div className="flex items-center gap-3">
          {syncMessage && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>{syncMessage}</span>
            </div>
          )}
          <button
            onClick={handleSyncCompletion}
            disabled={syncLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${syncLoading ? "animate-spin" : ""}`} />
            {syncLoading ? "Syncing…" : "Sync Progress"}
          </button>
        </div>
      </div>

      <StudentPaymentPanel />

      {/* Overview stat cards */}
      {studentOverview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label="Enrolled"
            value={studentOverview.totalEnrolledCourses}
            icon={<BookOpen className="w-5 h-5 text-orange-500" />}
            accent="bg-orange-50"
          />
          <StatCard
            label="Completed"
            value={studentOverview.completedCourses}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            accent="bg-emerald-50"
          />
          <StatCard
            label="Avg Progress"
            value={`${studentOverview.avgProgress}%`}
            icon={<TrendingUp className="w-5 h-5 text-violet-500" />}
            accent="bg-violet-50"
          />
          <StatCard
            label="Quiz Attempts"
            value={studentOverview.totalQuizAttempts}
            icon={<HelpCircle className="w-5 h-5 text-amber-500" />}
            accent="bg-amber-50"
          />
          <StatCard
            label="Avg Quiz Score"
            value={`${studentOverview.avgQuizScore}%`}
            icon={<Star className="w-5 h-5 text-yellow-500" />}
            accent="bg-yellow-50"
          />
        </div>
      )}

      {/* Activity stat cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Live Lectures"
            value={stats.totalLectures}
            icon={<Video className="w-5 h-5 text-sky-500" />}
            accent="bg-sky-50"
          />
          <StatCard
            label="Assessments"
            value={stats.totalAssessments}
            icon={<ClipboardList className="w-5 h-5 text-pink-500" />}
            accent="bg-pink-50"
          />
          <StatCard
            label="Exams"
            value={stats.totalExams}
            icon={<FileText className="w-5 h-5 text-red-500" />}
            accent="bg-red-50"
          />
          <StatCard
            label="Quizzes"
            value={stats.totalQuizzes}
            icon={<HelpCircle className="w-5 h-5 text-orange-500" />}
            accent="bg-orange-50"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Quiz Performance Trend"
          icon={<BarChart3 className="w-4 h-4 text-orange-500" />}
          loading={analyticsLoading}
          hasData={quizTrend.length > 0}
          emptyText="No quiz trend data available"
        >
          <QuizTrendChart data={quizTrend} />
        </ChartCard>

        <ChartCard
          title="Assessment Status"
          icon={<PieChart className="w-4 h-4 text-orange-500" />}
          loading={analyticsLoading}
          hasData={!!assessmentStatus}
          emptyText="No assessment data available"
        >
          {assessmentStatus && <AssessmentStatusChart data={assessmentStatus} />}
        </ChartCard>

        <ChartCard
          title="Live Lectures Analytics"
          icon={<Video className="w-4 h-4 text-orange-500" />}
          loading={analyticsLoading}
          hasData={!!liveLecturesAnalytics}
          emptyText="No live lectures data available"
          className="lg:col-span-2"
        >
          {liveLecturesAnalytics && <LiveLecturesChart data={liveLecturesAnalytics} />}
        </ChartCard>

        <ChartCard
          title="Enrolled Courses"
          icon={<GraduationCap className="w-4 h-4 text-orange-500" />}
          loading={analyticsLoading}
          hasData={!!enrolledCoursesData}
          emptyText="No enrolled courses data available"
          className="lg:col-span-2"
        >
          {enrolledCoursesData && <EnrolledCoursesChart data={enrolledCoursesData} />}
        </ChartCard>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboardHome;
