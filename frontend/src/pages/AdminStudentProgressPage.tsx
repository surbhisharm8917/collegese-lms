import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { UserContext } from "@/context/UserContext";

type Course = {
  id: string;
  title: string;
  description: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type Enrollment = {
  id: string;
  status: string;
  progress: number;
  enrolledAt: string;
};

type ProgressData = {
  overall: number;
  lectures: {
    completed: number;
    total: number;
    percentage: number;
  };
  quizzes: {
    completed: number;
    total: number;
    percentage: number;
  };
  assessments: {
    completed: number;
    total: number;
    percentage: number;
  };
};

type Lecture = {
  id: string;
  title: string;
  order: number;
  duration: number;
  progress: number;
  completed: boolean;
  lastWatchedAt: string | null;
};

type QuizSubmission = {
  quizId: string;
  quizTitle: string;
  score: number | null;
  totalQuestions: number;
  submittedAt: string;
};

type AssessmentSubmission = {
  assessmentId: string;
  assessmentTitle: string;
  marksObtained: number | null;
  totalMarks: number;
  submittedAt: string | null;
};

const AdminStudentProgressPage: React.FC = () => {
  const { courseId, userId } = useParams<{
    courseId: string;
    userId: string;
  }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [assessmentSubmissions, setAssessmentSubmissions] = useState<AssessmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userContext = useContext(UserContext);
  const adminId = userContext?.user_id;

  useEffect(() => {
    if (!courseId || !userId) {
      setError("Missing course ID or user ID in URL.");
      setLoading(false);
      return;
    }

    const fetchCourseAndProgress = async () => {
      try {
        const { data } = await api.get(`/stats/admin/course-progress/${courseId}/${userId}`);

        if (data.success) {
          setCourse(data.data.course);
          setUser(data.data.user);
          setEnrollment(data.data.enrollment);
          setProgress(data.data.progress);
          setLectures(data.data.lectures);
          setQuizSubmissions(data.data.quizSubmissions);
          setAssessmentSubmissions(data.data.assessmentSubmissions);
        } else {
          throw new Error(data.message || "Failed to fetch progress data");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
        toast.error("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourseAndProgress();
  }, [courseId, userId, adminId]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(" ") || "0s";
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">Loading student progress...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p>There was an error loading the data: {error}</p>
        <p>Please ensure you are logged in and have the correct permissions.</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6 text-gray-500">
        <p>No course found for this ID.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Course Progress: {course?.title}</h1>
      <p className="text-gray-600 mb-6">
        Viewing progress for <span className="font-semibold">{user?.name}</span> ({user?.email}) -
        Student ID: <span className="font-mono bg-gray-100 p-1 rounded">{userId}</span>
      </p>

      {enrollment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Enrollment Status</h3>
              <p className="text-blue-700">
                Status:{" "}
                <span
                  className={`font-medium ${enrollment.status === "COMPLETED" ? "text-green-600" : "text-orange-600"}`}
                >
                  {enrollment.status}
                </span>
              </p>
              <p className="text-blue-700">
                Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">{enrollment.progress}%</div>
              <div className="text-sm text-blue-600">Overall Progress</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${enrollment.progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {progress && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Lectures</h4>
            <div className="text-2xl font-bold text-green-900">
              {progress.lectures.completed}/{progress.lectures.total}
            </div>
            <div className="text-sm text-green-600">{progress.lectures.percentage}% completed</div>
            <div className="mt-2 w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${progress.lectures.percentage}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-2">Quizzes</h4>
            <div className="text-2xl font-bold text-purple-900">
              {progress.quizzes.completed}/{progress.quizzes.total}
            </div>
            <div className="text-sm text-purple-600">{progress.quizzes.percentage}% completed</div>
            <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${progress.quizzes.percentage}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">Assessments</h4>
            <div className="text-2xl font-bold text-orange-900">
              {progress.assessments.completed}/{progress.assessments.total}
            </div>
            <div className="text-sm text-orange-600">
              {progress.assessments.percentage}% completed
            </div>
            <div className="mt-2 w-full bg-orange-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{ width: `${progress.assessments.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Lecture Progress</h2>
            {lectures.length === 0 ? (
              <p className="text-gray-500 text-center">No lectures found for this course.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {lectures.map((lecture) => (
                  <div
                    key={lecture.id}
                    className="p-4 border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {lecture.order}. {lecture.title}
                      </span>
                      <span className="text-sm font-semibold text-gray-600">
                        {lecture.completed ? "Completed" : `${Math.round(lecture.progress || 0)}%`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          lecture.completed ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${lecture.progress || 0}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-xs text-gray-500 mt-1">
                      Duration: {formatDuration(lecture.duration)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Quiz Submissions</h2>
              {quizSubmissions.length === 0 ? (
                <p className="text-gray-500 text-center">No quiz submissions found.</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {quizSubmissions.map((submission, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 truncate">
                          {submission.quizTitle}
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {submission.score !== null
                            ? `${submission.score}/${submission.totalQuestions}`
                            : "Not graded"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Assessment Submissions</h2>
              {assessmentSubmissions.length === 0 ? (
                <p className="text-gray-500 text-center">No assessment submissions found.</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {assessmentSubmissions.map((submission, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 truncate">
                          {submission.assessmentTitle}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          {submission.marksObtained !== null
                            ? `${submission.marksObtained}/${submission.totalMarks}`
                            : "Not graded"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Submitted:{" "}
                        {submission.submittedAt
                          ? new Date(submission.submittedAt).toLocaleDateString()
                          : "Not submitted"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStudentProgressPage;
