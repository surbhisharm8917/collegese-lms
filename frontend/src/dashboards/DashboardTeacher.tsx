import {
  Award,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Film,
  LayoutGrid,
  UserCircle,
  Video,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "./DashboardShell";

const navItems: DashboardNavItem[] = [
  { name: "Dashboard", path: "dashboardTeacher", icon: LayoutGrid },
  { name: "Live Lectures", path: "teacherlivelectures", icon: Video },
  { name: "My Courses", path: "teacherMycourses", icon: BookOpen },
  { name: "Manage Quizzes", path: "quizzes", icon: ClipboardList },
  { name: "Assessments", path: "assessments", icon: ClipboardList },
  { name: "Certifications", path: "manageCertifications", icon: Award },
  { name: "Exams", path: "manageExams", icon: CalendarCheck },
  { name: "Recorded Lectures", path: "teacherRecording", icon: Film },
  { name: "Profile", path: "teacherprofile", icon: UserCircle },
];
const DashboardTeacher = () => <DashboardShell navItems={navItems} fallbackName="Teacher" />;
export default DashboardTeacher;
