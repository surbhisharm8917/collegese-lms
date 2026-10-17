import axios from "axios";
import { API_ORIGIN } from "@/lib/env";

const API_BASE_URL = `${API_ORIGIN}/api/v1/stats/student`;

export interface StudentOverview {
  totalEnrolledCourses: number;
  completedCourses: number;
  avgProgress: number;
  totalQuizAttempts: number;
  avgQuizScore: number;
}

export interface QuizTrend {
  date: string;
  score: number;
  quizName: string;
}

export interface AssessmentStatus {
  completed: number;
  pending: number;
  failed: number;
}

export interface LiveLecturesAnalytics {
  totalParticipated: number;
  upcomingLectures: number;
  ongoingLectures: number;
  completedLectures: number;
  recentParticipation: number;
  courseParticipation: Array<{
    course: string;
    count: number;
  }>;
}

export interface EnrolledCourse {
  courseId: string;
  courseName: string;
  progress: number;
  status: string;
  enrolledAt: string;
}

export interface EnrolledCoursesData {
  courses: EnrolledCourse[];
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  totalCourses: number;
}

export const fetchStudentOverview = async (): Promise<StudentOverview> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/overview`, {
      withCredentials: true,
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to fetch student overview");
    }
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } } };
    if (err.response?.status === 401) {
      throw new Error("Unauthorized: Please log in again");
    }
    if (err.response?.status === 403) {
      throw new Error("Forbidden: Student access required");
    }
    throw new Error(err.response?.data?.message || "Failed to fetch student overview");
  }
};

export const fetchQuizTrend = async (): Promise<QuizTrend[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/quiz-trend`, {
      withCredentials: true,
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to fetch quiz trend");
    }
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } } };
    if (err.response?.status === 401) {
      throw new Error("Unauthorized: Please log in again");
    }
    if (err.response?.status === 403) {
      throw new Error("Forbidden: Student access required");
    }
    throw new Error(err.response?.data?.message || "Failed to fetch quiz trend");
  }
};

export const fetchAssessmentStatus = async (): Promise<AssessmentStatus> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/assessments`, {
      withCredentials: true,
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to fetch assessment status");
    }
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } } };
    if (err.response?.status === 401) {
      throw new Error("Unauthorized: Please log in again");
    }
    if (err.response?.status === 403) {
      throw new Error("Forbidden: Student access required");
    }
    throw new Error(err.response?.data?.message || "Failed to fetch assessment status");
  }
};

export const fetchLiveLecturesAnalytics = async (): Promise<LiveLecturesAnalytics> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/live-lectures`, {
      withCredentials: true,
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to fetch live lectures analytics");
    }
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } } };
    if (err.response?.status === 401) {
      throw new Error("Unauthorized: Please log in again");
    }
    if (err.response?.status === 403) {
      throw new Error("Forbidden: Student access required");
    }
    throw new Error(err.response?.data?.message || "Failed to fetch live lectures analytics");
  }
};

export const fetchEnrolledCourses = async (): Promise<EnrolledCoursesData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/enrolled-courses`, {
      withCredentials: true,
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to fetch enrolled courses");
    }
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } } };
    if (err.response?.status === 401) {
      throw new Error("Unauthorized: Please log in again");
    }
    if (err.response?.status === 403) {
      throw new Error("Forbidden: Student access required");
    }
    throw new Error(err.response?.data?.message || "Failed to fetch enrolled courses");
  }
};

export const syncCourseCompletion = async (): Promise<{
  success: boolean;
  message: string;
  enrollmentsUpdated: number;
}> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/sync-completion`,
      {},
      {
        withCredentials: true,
      },
    );

    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.message || "Failed to sync course completion");
    }
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } } };
    if (err.response?.status === 401) {
      throw new Error("Unauthorized: Please log in again");
    }
    if (err.response?.status === 403) {
      throw new Error("Forbidden: Student access required");
    }
    throw new Error(err.response?.data?.message || "Failed to sync course completion");
  }
};
