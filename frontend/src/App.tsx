import React, { Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./index.css";
import "./App.css";
import { useUser } from "./context/useUser";

/** Redirects bare /dashboard to the role-specific dashboard */
function DashboardRedirect() {
  const { role } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    switch (role) {
      case "STUDENT":
        navigate("/dashboard/student/dashboard", { replace: true });
        break;
      case "TEACHER":
        navigate("/dashboard/teacher/dashboardTeacher", { replace: true });
        break;
      case "ADMIN":
        navigate("/dashboard/admin/dashboard", { replace: true });
        break;
      case "ASSISTANT":
        navigate("/dashboard/assistant/assistant", { replace: true });
        break;
      case "SUPER_ADMIN":
        navigate("/dashboard/superadmin/superAdminDash", { replace: true });
        break;
      default:
        navigate("/login", { replace: true });
    }
  }, [role, navigate]);

  return <Loader />;
}
import { NotificationProvider } from "./context/NotificationContext";
import { Toaster } from "sonner";
import Loader from "./components/Loader";
import api from "./lib/api";

// --- Eagerly loaded (needed on first paint) ---
import Home from "./pages/Home";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./protect/ProtectedRoute";
import MaintenancePage from "./pages/MaintenancePage";

// --- Lazy-loaded: Auth pages ---
const ForgotPassword = React.lazy(() => import("./components/ui/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./components/ui/ResetPassword"));
const ChangePassword = React.lazy(() => import("./pages/ChangePassword"));
const VerifyEmail = React.lazy(() => import("./pages/VerifyEmail"));
const VerifyCertificate = React.lazy(() => import("./pages/VerifyCertificate"));

// --- Lazy-loaded: Dashboard shells ---
const DashboardStudent = React.lazy(() => import("./dashboards/DashboardStudent"));
const DashboardTeacher = React.lazy(() => import("./dashboards/DashboardTeacher"));
const DashboardAdmin = React.lazy(() => import("./dashboards/DashboardAdmin"));
const DashboardAssistant = React.lazy(() => import("./dashboards/DashboardAssistant"));
const DashboardSuperAdmin = React.lazy(() => import("./dashboards/DashboardSuperAdmin"));

// --- Lazy-loaded: Student pages ---
const StudentDashboardHome = React.lazy(
  () => import("./Dashbordtables/student/StudentDashboardHome"),
);
const MyCoursesPage = React.lazy(() => import("./Dashbordtables/student/MyCoursesPage"));
const StudentLiveLecturesPage = React.lazy(
  () => import("./Dashbordtables/student/StudentLiveLecturesPage"),
);
const StudentProfile = React.lazy(() => import("./Dashbordtables/student/StudentProfile"));
const StudentExamDashboard = React.lazy(
  () => import("./Dashbordtables/student/exams/StudentExamDashboard"),
);
const CourseDetailsPage = React.lazy(() => import("./pages/CourseDetailsPage"));
const MyLiveLecturePage = React.lazy(() => import("./pages/MyLiveLecturePage"));
const QuizListPage = React.lazy(() => import("./pages/QuizListPage"));
const QuizAttemptPage = React.lazy(() => import("./pages/QuizAttemptPage"));
const QuizResultsPage = React.lazy(() => import("./pages/QuizResultsPage"));
const StudentAssessmentsPage = React.lazy(() => import("./pages/StudentAssessmentsPage"));

// --- Lazy-loaded: Teacher pages ---
const DashboardTeacherPage = React.lazy(
  () => import("./Dashbordtables/teacher/DashboardTeacherPage"),
);
const TeacherLiveLecturesPage = React.lazy(
  () => import("./Dashbordtables/teacher/TeacherLiveLecturesPage"),
);
const TeacherMycoursesPage = React.lazy(
  () => import("./Dashbordtables/teacher/TeacherMycoursesPage"),
);
const TeacherProfilePage = React.lazy(() => import("./Dashbordtables/teacher/TeacherProfilePage"));
const TeacherRecLectures = React.lazy(() => import("./Dashbordtables/teacher/TeacherRecLectures"));

// --- Lazy-loaded: Admin pages ---
const AdminDashboardHome = React.lazy(() => import("./Dashbordtables/admin/AdminDashboardHome"));
const AdminCoursesTable = React.lazy(() => import("./Dashbordtables/admin/AdminCoursesTable"));
const AdminEnrollmentsPage = React.lazy(
  () => import("./Dashbordtables/admin/AdminEnrollmentsPage"),
);
const AdminPaymentRequestsPage = React.lazy(() => import("./pages/AdminPaymentRequestsPage"));
const AdminRecordedLecturesPage = React.lazy(() => import("./pages/AdminRecordedLecturesPage"));
const AdminCourseDetailsPage = React.lazy(() => import("./pages/AdminCourseDetailsPage"));
const AdminStudentProgressPage = React.lazy(() => import("./pages/AdminStudentProgressPage"));
const AdminProfile = React.lazy(() => import("./pages/AdminProfile"));

// --- Lazy-loaded: SuperAdmin pages ---
const SuperAdminDash = React.lazy(() => import("./Dashbordtables/superAdmin/SuperAdminDash"));
const SuperAdminProfile = React.lazy(() => import("./Dashbordtables/superAdmin/SuperAdminProfile"));
const SessionsTable = React.lazy(() => import("./Dashbordtables/superAdmin/SessionsTable"));
const UsersTable = React.lazy(() => import("./Dashbordtables/superAdmin/UsersTable"));
const BulkRegisterUsers = React.lazy(() => import("./Dashbordtables/superAdmin/BulkRegisterUsers"));
const CreateLiveLecture = React.lazy(() => import("./Dashbordtables/superAdmin/CreateLiveLecture"));
const EvaluateAttempt = React.lazy(
  () => import("./Dashbordtables/superAdmin/exams/EvaluateAttempt"),
);

// --- Lazy-loaded: Assistant pages ---
const AssistantDashboardHome = React.lazy(
  () => import("./Dashbordtables/assistant/AssistantDashboardHome"),
);
const AssistantProfilePage = React.lazy(() => import("./pages/AssistantProfilePage"));

// --- Lazy-loaded: Shared management pages ---
const AdminQuizPage = React.lazy(() => import("./pages/QuizManagementPage"));
const QuizQuestionsPage = React.lazy(() => import("./pages/QuizQuestionsPage"));
const QuizAnalyticsPage = React.lazy(() => import("./pages/QuizAnalyticsPage"));
const AssessmentManagementPage = React.lazy(() => import("./pages/AssessmentManagementPage"));
const GradeAssessmentPage = React.lazy(() => import("./pages/GradeAssessmentPage"));
const AssessmentDetailsPage = React.lazy(() => import("./pages/AssessmentDetailsPage"));
const AssessmentAnalyticsPage = React.lazy(() => import("./pages/AssessmentAnalyticsPage"));
const ManageCertifications = React.lazy(
  () => import("./Dashbordtables/assistant/ManageCertifications"),
);
const ExamAdminDashboard = React.lazy(() => import("./pages/ExamAdminDashboard"));
const SystemSettingsPage = React.lazy(() => import("./pages/SystemSettingsPage"));
const ExportDashboard = React.lazy(() => import("./pages/ExportDashboard"));
const UserSessionsTable = React.lazy(() => import("./Dashbordtables/users/UserSessionsTable"));
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));
const Register = React.lazy(() => import("./pages/Register"));
const CourseCataloguePage = React.lazy(() => import("./pages/CourseCataloguePage"));
const LegalPage = React.lazy(() => import("./pages/LegalPage"));
const CAPublicPage = React.lazy(() => import("./pages/CAPublicPage"));
const SupportRequestPage = React.lazy(() => import("./pages/SupportRequestPage"));
const AdminSupportPage = React.lazy(() => import("./pages/AdminSupportPage"));

const App: React.FC = () => {
  const { user_id, user } = useUser();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await api.get("/auth/status/maintenance");
        const maintenanceMode = response.data.isMaintenanceMode;

        if (maintenanceMode && user) {
          const userRole = user.role?.toUpperCase().trim();
          const allowedRoles = ["SUPER_ADMIN", "ADMIN", "TEACHER"];

          if (allowedRoles.includes(userRole)) {
            setIsMaintenance(false);
          } else {
            setIsMaintenance(true);
          }
        } else {
          setIsMaintenance(maintenanceMode);
        }
      } catch (error) {
        console.error("Failed to fetch maintenance status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceStatus();
  }, [user]);

  if (loading) {
    return <Loader />;
  }

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <NotificationProvider>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/courses" element={<CourseCataloguePage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
          <Route path="/ca-profession" element={<CAPublicPage type="profession" />} />
          <Route path="/ca-curriculum" element={<CAPublicPage type="curriculum" />} />
          <Route path="/ca-roadmap" element={<CAPublicPage type="roadmap" />} />
          <Route path="/privacy-policy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/cookie-policy" element={<LegalPage type="cookies" />} />
          <Route path="/refund-policy" element={<LegalPage type="refund" />} />
          <Route path="/grievance" element={<SupportRequestPage />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route
            path="/evaluate-attempt/:attemptId"
            element={
              <ProtectedRoute allowedRoles={["ASSISTANT", "TEACHER", "ADMIN", "SUPER_ADMIN"]}>
                <EvaluateAttempt />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-classroom/:lectureId"
            element={
              <ProtectedRoute
                allowedRoles={["STUDENT", "ASSISTANT", "TEACHER", "ADMIN", "SUPER_ADMIN"]}
              >
                <MyLiveLecturePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/student"
            element={
              <ProtectedRoute requiredRole="STUDENT">
                <DashboardStudent />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboardHome />} />
            <Route path="studentProfile" element={<StudentProfile />} />
            <Route path="my-courses" element={<MyCoursesPage />} />
            <Route path="my-Exams" element={<StudentExamDashboard />} />
            <Route path="assessments" element={<StudentAssessmentsPage />} />
            <Route path="assessment/:assessmentId" element={<AssessmentDetailsPage />} />
            <Route path="assessment/:assessmentId/submit" element={<AssessmentDetailsPage />} />
            <Route path="my-live-lec" element={<StudentLiveLecturesPage />} />
            <Route path="my-live-lec/:lectureId" element={<MyLiveLecturePage />} />
            <Route path="my-courses/:id" element={<CourseDetailsPage />} />
            <Route path="sessions" element={<UserSessionsTable userId={user_id ?? ""} />} />
            <Route path="quizzes" element={<QuizListPage />} />
            <Route path="quiz/attempt/:submissionId" element={<QuizAttemptPage />} />
            <Route path="quiz/result/:submissionId" element={<QuizResultsPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
          <Route
            path="/dashboard/teacher"
            element={
              <ProtectedRoute requiredRole="TEACHER">
                <DashboardTeacher />
              </ProtectedRoute>
            }
          >
            <Route path="dashboardTeacher" element={<DashboardTeacherPage />} />
            <Route path="teacherlivelectures" element={<TeacherLiveLecturesPage />} />
            <Route path="manageCertifications" element={<ManageCertifications />} />
            <Route path="teacherMycourses" element={<TeacherMycoursesPage />} />
            <Route path="teacherprofile" element={<TeacherProfilePage />} />
            <Route path="quizzes" element={<AdminQuizPage />} />
            <Route path="manageExams" element={<ExamAdminDashboard />} />
            <Route path="assessments" element={<AssessmentManagementPage />} />
            <Route path="assessment/:assessmentId/submissions" element={<GradeAssessmentPage />} />
            <Route path="assessment/:assessmentId" element={<AssessmentDetailsPage />} />
            <Route
              path="assessment/:assessmentId/analytics"
              element={<AssessmentAnalyticsPage />}
            />
            <Route path="teacherRecording" element={<TeacherRecLectures />} />
            <Route path="quiz/:quizId/questions" element={<QuizQuestionsPage />} />
            <Route path="quiz/:quizId/analytics" element={<QuizAnalyticsPage />} />
            <Route index element={<Navigate to="dashboardTeacher" replace />} />
          </Route>
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <DashboardAdmin />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboardHome />} />
            <Route path="users" element={<UsersTable />} />
            <Route path="sessions" element={<SessionsTable />} />
            <Route path="register-bulk" element={<BulkRegisterUsers />} />
            <Route path="quizzes" element={<AdminQuizPage />} />
            <Route path="courses" element={<AdminCoursesTable />} />
            <Route path="recorded-lectures" element={<AdminRecordedLecturesPage />} />
            <Route path="payment-requests" element={<AdminPaymentRequestsPage />} />
            <Route path="quiz/:quizId/questions" element={<QuizQuestionsPage />} />
            <Route path="quiz/:quizId/analytics" element={<QuizAnalyticsPage />} />
            <Route path="manageExams" element={<ExamAdminDashboard />} />
            <Route path="manageCertifications" element={<ManageCertifications />} />
            <Route path="assessments" element={<AssessmentManagementPage />} />
            <Route path="assessment/:assessmentId/submissions" element={<GradeAssessmentPage />} />
            <Route path="assessment/:assessmentId" element={<AssessmentDetailsPage />} />
            <Route
              path="assessment/:assessmentId/analytics"
              element={<AssessmentAnalyticsPage />}
            />
            <Route path="settings" element={<SystemSettingsPage />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="support" element={<AdminSupportPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
          <Route
            path="/dashboard/assistant"
            element={
              <ProtectedRoute requiredRole="ASSISTANT">
                <DashboardAssistant />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<AssistantProfilePage />} />
            <Route path="manageCertifications" element={<ManageCertifications />} />
            <Route path="manageExams" element={<ExamAdminDashboard />} />
            <Route path="assistant" element={<AssistantDashboardHome />} />
            <Route path="quizzes" element={<AdminQuizPage />} />
            <Route path="assessments" element={<AssessmentManagementPage />} />
            <Route path="assessment/:assessmentId/submissions" element={<GradeAssessmentPage />} />
            <Route
              path="assessment/:assessmentId/analytics"
              element={<AssessmentAnalyticsPage />}
            />
            <Route path="quiz/:quizId/questions" element={<QuizQuestionsPage />} />
            <Route path="quiz/:quizId/analytics" element={<QuizAnalyticsPage />} />
            <Route index element={<Navigate to="assistant" replace />} />
          </Route>
          <Route
            path="/dashboard/superadmin"
            element={
              <ProtectedRoute requiredRole="SUPER_ADMIN">
                <DashboardSuperAdmin />
              </ProtectedRoute>
            }
          >
            <Route path="manageCertifications" element={<ManageCertifications />} />
            <Route path="users" element={<UsersTable />} />
            <Route path="superAdminDash" element={<SuperAdminDash />} />
            <Route path="sessions" element={<SessionsTable />} />
            <Route path="manageExams" element={<ExamAdminDashboard />} />
            <Route path="enrollments" element={<AdminEnrollmentsPage />} />
            <Route path="register-bulk" element={<BulkRegisterUsers />} />
            <Route path="courses" element={<AdminCoursesTable />} />
            <Route path="recorded-lectures" element={<AdminRecordedLecturesPage />} />
            <Route path="payment-requests" element={<AdminPaymentRequestsPage />} />
            <Route path="courses/:courseId" element={<AdminCourseDetailsPage />} />
            <Route path="create" element={<CreateLiveLecture />} />
            <Route path="superAdminProfile" element={<SuperAdminProfile />} />
            <Route
              path="courses/:courseId/students/:userId"
              element={<AdminStudentProgressPage />}
            />
            <Route path="quizzes" element={<AdminQuizPage />} />
            <Route path="quiz/:quizId/questions" element={<QuizQuestionsPage />} />
            <Route path="quiz/:quizId/analytics" element={<QuizAnalyticsPage />} />
            <Route path="assessments" element={<AssessmentManagementPage />} />
            <Route path="assessment/:assessmentId/submissions" element={<GradeAssessmentPage />} />
            <Route path="assessment/:assessmentId" element={<AssessmentDetailsPage />} />
            <Route
              path="assessment/:assessmentId/analytics"
              element={<AssessmentAnalyticsPage />}
            />
            <Route path="settings" element={<SystemSettingsPage />} />
            <Route path="export" element={<ExportDashboard />} />
            <Route path="support" element={<AdminSupportPage />} />
            <Route path="*" element={<Navigate to="users" replace />} />
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </NotificationProvider>
  );
};

export default App;
