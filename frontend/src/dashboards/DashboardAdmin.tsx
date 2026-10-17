import {
  Award,
  BadgeIndianRupee,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutGrid,
  MessagesSquare,
  Settings,
  UserCircle,
  Users,
  Video,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "./DashboardShell";

const navItems: DashboardNavItem[] = [
  { name: "Dashboard", path: "dashboard", icon: LayoutGrid },
  { name: "Users", path: "users", icon: Users },
  { name: "Courses", path: "courses", icon: BookOpen },
  { name: "Recorded Lectures", path: "recorded-lectures", icon: Video },
  { name: "Payment Approvals", path: "payment-requests", icon: BadgeIndianRupee },
  { name: "Manage Quizzes", path: "quizzes", icon: FileText },
  { name: "Manage Exams", path: "manageExams", icon: ClipboardList },
  { name: "Assessments", path: "assessments", icon: ClipboardCheck },
  { name: "Certifications", path: "manageCertifications", icon: Award },
  { name: "Support", path: "support", icon: MessagesSquare },
  { name: "Settings", path: "settings", icon: Settings },
  { name: "Profile", path: "profile", icon: UserCircle },
];
const DashboardAdmin = () => <DashboardShell navItems={navItems} fallbackName="Admin" />;
export default DashboardAdmin;
