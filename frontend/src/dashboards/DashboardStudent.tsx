import {
  BookOpen,
  Calendar,
  ClipboardList,
  Compass,
  LayoutGrid,
  UserCircle,
  Users,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "./DashboardShell";

const navItems: DashboardNavItem[] = [
  { name: "Overview", path: "dashboard", icon: LayoutGrid },
  { name: "Enrolled Courses", path: "my-courses", icon: BookOpen },
  { name: "Discover Courses", path: "/courses", icon: Compass },
  { name: "Login Activity", path: "sessions", icon: Users },
  { name: "Live Classes", path: "my-live-lec", icon: Calendar },
  { name: "Exams & Assessments", path: "my-Exams", icon: ClipboardList },
  { name: "Profile Settings", path: "studentProfile", icon: UserCircle },
];
const DashboardStudent = () => (
  <DashboardShell navItems={navItems} fallbackName="Student" greetingFirstName />
);
export default DashboardStudent;
