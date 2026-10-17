import {
  Award,
  BadgeIndianRupee,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  Settings,
  UserCircle,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "./DashboardShell";

const navItems: DashboardNavItem[] = [
  { name: "Dashboard", path: "superAdminDash", icon: LayoutGrid },
  { name: "Users", path: "users", icon: Users },
  { name: "Courses", path: "courses", icon: BookOpen },
  { name: "Recorded Lectures", path: "recorded-lectures", icon: Video },
  { name: "Payment Approvals", path: "payment-requests", icon: BadgeIndianRupee },
  { name: "Sessions", path: "sessions", icon: CalendarClock },
  { name: "Bulk Register", path: "register-bulk", icon: UserPlus },
  { name: "Enrollments", path: "enrollments", icon: GraduationCap },
  { name: "Live Lecture", path: "create", icon: Video },
  { name: "Manage Quizzes", path: "quizzes", icon: FileText },
  { name: "Manage Exams", path: "manageExams", icon: ClipboardList },
  { name: "Assessments", path: "assessments", icon: ClipboardCheck },
  { name: "Certifications", path: "manageCertifications", icon: Award },
  { name: "Export Data", path: "export", icon: Download },
  { name: "Support", path: "support", icon: MessagesSquare },
  { name: "Settings", path: "settings", icon: Settings },
  { name: "Profile", path: "superAdminProfile", icon: UserCircle },
];
const DashboardSuperAdmin = () => <DashboardShell navItems={navItems} fallbackName="Super Admin" />;
export default DashboardSuperAdmin;
