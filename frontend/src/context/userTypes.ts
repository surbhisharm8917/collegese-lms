export type Role = "STUDENT" | "TEACHER" | "ADMIN" | "ASSISTANT" | "SUPER_ADMIN";

export interface User {
  id: string;
  name: string;
  learnerId: string;
  email: string;
  phone: string;
  profilePic: string | null;
  courseId: string | null;
  courseName: string;
  Gender: string;
  dateOfBirth: string;
  address: string;
  department: string;
  year: number;
  guardianPhone: string;
  attendancePercentage: number;
  grade: string;
  feedback: string;
  bio: string | null;
  role: Role;
  completedCourse: boolean;
  isVerified: boolean;
  forcePasswordChange: boolean;
  isSuspended: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserContextType {
  user: User | null;
  user_id: string | null;
  role: Role | null;
  isLoading: boolean;
  profilePic: string | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
}
