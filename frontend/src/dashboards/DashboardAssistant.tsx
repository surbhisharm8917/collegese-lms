import {
  Award,
  CalendarCheck,
  ClipboardList,
  FileText,
  LayoutGrid,
  UserCircle,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "./DashboardShell";

const navItems: DashboardNavItem[] = [
  { name: "Dashboard", path: "assistant", icon: LayoutGrid },
  { name: "Quiz Management", path: "quizzes", icon: FileText },
  { name: "Assessments", path: "assessments", icon: ClipboardList },
  { name: "Certifications", path: "manageCertifications", icon: Award },
  { name: "Exams", path: "manageExams", icon: CalendarCheck },
  { name: "Profile", path: "profile", icon: UserCircle },
];
const DashboardAssistant = () => <DashboardShell navItems={navItems} fallbackName="Assistant" />;
export default DashboardAssistant;
