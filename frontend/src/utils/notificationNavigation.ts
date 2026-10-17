import type { Notification } from "../context/NotificationContextTypes";

export interface NotificationRoute {
  path: string;
  title: string;
  description?: string;
}

export const getNotificationRoute = (
  notification: Notification,
  userRole: string = "STUDENT",
): NotificationRoute | null => {
  const { type, metadata } = notification;
  const normalizedRole = userRole.toUpperCase();
  const rolePrefix = normalizedRole.toLowerCase();

  switch (type) {
    case "QUIZ_PUBLISHED":
    case "quiz":
    case "QUIZ_CREATED":
      if (rolePrefix === "student") {
        return {
          path: `/dashboard/student/quizzes`,
          title: "View Quizzes",
          description: "Take the newly published quiz",
        };
      } else if (rolePrefix === "teacher") {
        return {
          path: `/dashboard/teacher/dashboardTeacher`,
          title: "Manage Quizzes",
          description: "View and manage quizzes",
        };
      } else if (rolePrefix === "admin") {
        return {
          path: `/dashboard/admin/quizzes`,
          title: "Quiz Management",
          description: "Manage all quizzes",
        };
      } else if (rolePrefix === "super_admin") {
        return {
          path: `/dashboard/superadmin/quizzes`,
          title: "Quiz Management",
          description: "Manage all quizzes",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/quizzes`,
        title: "View Quizzes",
        description: "Browse all available quizzes",
      };

    case "QUIZ_SUBMITTED":
      if (metadata?.quizId) {
        return {
          path: `/dashboard/${rolePrefix}/quizzes/${metadata.quizId}/results`,
          title: "View Results",
          description: "Check your quiz results",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/quizzes`,
        title: "View Quizzes",
        description: "Browse quiz history and results",
      };

    case "ASSESSMENT_PUBLISHED":
    case "assessment":
    case "ASSESSMENT_CREATED":
      if (rolePrefix === "student") {
        return {
          path: `/dashboard/student/assessments`,
          title: "View Assessments",
          description: "Complete the newly published assessment",
        };
      } else if (rolePrefix === "teacher") {
        return {
          path: `/dashboard/teacher/dashboardTeacher`,
          title: "Manage Assessments",
          description: "View and manage assessments",
        };
      } else if (rolePrefix === "admin") {
        return {
          path: `/dashboard/admin/assessments`,
          title: "Assessment Management",
          description: "Manage all assessments",
        };
      } else if (rolePrefix === "super_admin") {
        return {
          path: `/dashboard/superadmin/assessments`,
          title: "Assessment Management",
          description: "Manage all assessments",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/assessments`,
        title: "View Assessments",
        description: "Browse all available assessments",
      };

    case "COURSE_ENROLLMENT":
    case "course":
    case "COURSE_CREATED":
      if (rolePrefix === "student") {
        return {
          path: `/dashboard/student/my-courses`,
          title: "My Courses",
          description: "Access your enrolled course",
        };
      } else if (rolePrefix === "teacher") {
        return {
          path: `/dashboard/teacher/teacherMycourses`,
          title: "My Courses",
          description: "View your assigned courses",
        };
      } else if (rolePrefix === "admin") {
        return {
          path: `/dashboard/admin/courses`,
          title: "Course Management",
          description: "Manage all courses",
        };
      } else if (rolePrefix === "super_admin") {
        return {
          path: `/dashboard/superadmin/courses`,
          title: "Course Management",
          description: "Manage all courses",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/courses`,
        title: "My Courses",
        description: "View all your courses",
      };

    case "GRADE_UPDATED":
      if (metadata?.submissionId || metadata?.quizId || metadata?.assessmentId) {
        const id = metadata.submissionId || metadata.quizId || metadata.assessmentId;
        return {
          path: `/dashboard/${rolePrefix}/grades/${id}`,
          title: "View Grade",
          description: "Check your updated grade",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/grades`,
        title: "View Grades",
        description: "Check all your grades",
      };

    case "LIVE_LECTURE_SCHEDULED":
    case "lecture":
    case "liveLecture":
    case "LECTURE_STARTED":
      if (rolePrefix === "student") {
        return {
          path: `/dashboard/student/my-live-lec`,
          title: "Live Lectures",
          description: "Join the scheduled live lecture",
        };
      } else if (rolePrefix === "teacher") {
        return {
          path: `/dashboard/teacher/teacherlivelectures`,
          title: "Live Lectures",
          description: "Manage your live lectures",
        };
      } else if (rolePrefix === "admin") {
        return {
          path: `/dashboard/admin/dashboard`,
          title: "Live Lectures",
          description: "Manage live lectures",
        };
      } else if (rolePrefix === "super_admin") {
        return {
          path: `/dashboard/superadmin/create`,
          title: "Live Lectures",
          description: "Manage live lectures",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/live-lectures`,
        title: "Live Lectures",
        description: "View all scheduled lectures",
      };

    case "ASSIGNMENT_DUE":
      if (metadata?.assignmentId) {
        return {
          path: `/dashboard/${rolePrefix}/assignments/${metadata.assignmentId}`,
          title: "View Assignment",
          description: "Complete your assignment before deadline",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/assignments`,
        title: "Assignments",
        description: "View all your assignments",
      };

    case "EXAM_SCHEDULED":
    case "exam":
    case "EXAM_CREATED":
      if (rolePrefix === "student") {
        return {
          path: `/dashboard/student/my-Exams`,
          title: "My Exams",
          description: "Prepare for your scheduled exam",
        };
      } else if (rolePrefix === "teacher") {
        return {
          path: `/dashboard/teacher/exams`,
          title: "Manage Exams",
          description: "View and manage exams",
        };
      } else if (rolePrefix === "admin") {
        return {
          path: `/dashboard/admin/manageExams`,
          title: "Exam Management",
          description: "Manage all exams",
        };
      } else if (rolePrefix === "super_admin") {
        return {
          path: `/dashboard/superadmin/manageExams`,
          title: "Exam Management",
          description: "Manage all exams",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/exams`,
        title: "Exams",
        description: "View all scheduled exams",
      };

    case "CERTIFICATE_ISSUED":
      if (metadata?.certificateId) {
        return {
          path: `/dashboard/${rolePrefix}/certificates/${metadata.certificateId}`,
          title: "View Certificate",
          description: "Download your certificate",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/certificates`,
        title: "Certificates",
        description: "View all your certificates",
      };

    case "TEACHER_ASSIGNED_TO_COURSE":
      if (metadata?.courseId) {
        return {
          path: `/dashboard/${rolePrefix}/courses/${metadata.courseId}`,
          title: "View Assigned Course",
          description: "Manage your newly assigned course",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/courses`,
        title: "My Courses",
        description: "View all your assigned courses",
      };

    case "ASSISTANT_ASSIGNED_TO_COURSE":
      if (metadata?.courseId) {
        return {
          path: `/dashboard/${rolePrefix}/courses/${metadata.courseId}`,
          title: "View Course",
          description: "Access your assigned course as assistant",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/courses`,
        title: "Assigned Courses",
        description: "View all courses you assist with",
      };

    case "ASSISTANT_ASSIGNED_TO_GRADING":
      if (metadata?.assessmentId && metadata?.courseId) {
        return {
          path: `/dashboard/${rolePrefix}/courses/${metadata.courseId}/assessments/${metadata.assessmentId}/grading`,
          title: "Grade Assessment",
          description: "Start grading the assigned assessment",
        };
      } else if (metadata?.courseId) {
        return {
          path: `/dashboard/${rolePrefix}/courses/${metadata.courseId}/assessments`,
          title: "Course Assessments",
          description: "View assessments to grade",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/grading`,
        title: "Grading Tasks",
        description: "View all grading assignments",
      };

    case "TEACHER_ROLE_UPDATED":
    case "ASSISTANT_ROLE_UPDATED":
      return {
        path: `/dashboard/${rolePrefix}/profile`,
        title: "Profile",
        description: "Review your updated role and permissions",
      };

    default:
      if (rolePrefix === "student") {
        return {
          path: `/dashboard/student/dashboard`,
          title: "Dashboard",
          description: "Go to your dashboard",
        };
      } else if (rolePrefix === "teacher") {
        return {
          path: `/dashboard/teacher/dashboardTeacher`,
          title: "Dashboard",
          description: "Go to your dashboard",
        };
      } else if (rolePrefix === "admin") {
        return {
          path: `/dashboard/admin/dashboard`,
          title: "Dashboard",
          description: "Go to your dashboard",
        };
      } else if (rolePrefix === "super_admin" || rolePrefix === "superadmin") {
        return {
          path: `/dashboard/superadmin/superAdminDash`,
          title: "Dashboard",
          description: "Go to your dashboard",
        };
      }
      return {
        path: `/dashboard/${rolePrefix}/dashboard`,
        title: "Dashboard",
        description: "Go to your dashboard",
      };
  }
};

export const getUserRole = (): string => {
  const role = localStorage.getItem("userRole") || localStorage.getItem("user_role") || "STUDENT";
  return role.toUpperCase();
};

export const isValidRoute = (path: string): boolean => {
  const validPrefixes = [
    "/dashboard/student",
    "/dashboard/teacher",
    "/dashboard/admin",
    "/dashboard/superadmin",
    "/dashboard/assistant",
  ];

  return validPrefixes.some((prefix) => path.startsWith(prefix));
};
