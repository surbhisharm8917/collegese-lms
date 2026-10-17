import React, { useEffect, useMemo, useState, useRef, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { UserContext } from "@/context/UserContext";
import {
  Clock,
  User,
  BookOpen,
  FileText,
  ClipboardList,
  GraduationCap,
  Lock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Play,
} from "lucide-react";
import Loader from "@/components/Loader";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  createdBy?: {
    name: string;
    role?: string;
  };
}

interface RecordedLecture {
  id: string;
  title: string;
  order: number;
  description: string;
  videoUrl: string;
  duration: number;
  progress?: number;
  subject?: { id: string; title: string; order: number } | null;
  chapter?: { id: string; title: string; order: number } | null;
}

interface LectureChapterGroup {
  id: string;
  title: string;
  order: number;
  lectures: RecordedLecture[];
}

interface LectureSubjectGroup {
  id: string;
  title: string;
  order: number;
  chapters: LectureChapterGroup[];
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  timeLimit?: number;
  completed?: boolean;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  totalMarks?: number;
  submissionType?: "FILE_UPLOAD" | "TEXT_ENTRY";
  completed?: boolean;
}

interface ExamOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface ExamQuestion {
  id: string;
  text: string;
  type: string;
  marks: number;
  options: ExamOption[];
}

interface ExamAttempt {
  id: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  score?: number;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  courseId: string;
  questions: ExamQuestion[];
  attempts: ExamAttempt[];
  course: {
    title: string;
  };
  createdAt: string;
}

interface StartQuizResponse {
  submissionId: string;
  timeLimit?: number;
}

const isValidObjectId = (val?: string): boolean =>
  typeof val === "string" && /^[a-fA-F0-9]{24}$/.test(val);

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const CourseDetailsPage: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(UserContext) as {
    user?: { id?: string; _id?: string };
  };
  const resolvedUserId = (user?._id || user?.id) ?? "";
  const hasValidUserId = isValidObjectId(resolvedUserId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<RecordedLecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLecture, setSelectedLecture] = useState<RecordedLecture | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedUrlLoading, setSignedUrlLoading] = useState(false);
  const [pendingSeekPercent, setPendingSeekPercent] = useState<number | null>(null);
  const [currentVideoProgress, setCurrentVideoProgress] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const allLecturesCompleted =
    lectures.length > 0 && lectures.every((lecture) => (lecture.progress || 0) >= 95);
  const allQuizzesCompleted = quizzes.length > 0 && quizzes.every((quiz) => quiz.completed);
  const allAssessmentsCompleted =
    assessments.length > 0 && assessments.every((assessment) => assessment.completed);
  const examsUnlocked = allLecturesCompleted && allQuizzesCompleted && allAssessmentsCompleted;

  const courseProgress = {
    lectures:
      lectures.length > 0
        ? (lectures.filter((l) => (l.progress || 0) >= 95).length / lectures.length) * 100
        : 100,
    quizzes:
      quizzes.length > 0 ? (quizzes.filter((q) => q.completed).length / quizzes.length) * 100 : 100,
    assessments:
      assessments.length > 0
        ? (assessments.filter((a) => a.completed).length / assessments.length) * 100
        : 100,
  };

  const lectureHierarchy = useMemo<LectureSubjectGroup[]>(() => {
    const subjects = new Map<
      string,
      {
        id: string;
        title: string;
        order: number;
        chapters: Map<string, LectureChapterGroup>;
      }
    >();
    lectures.forEach((lecture) => {
      const subject = lecture.subject || {
        id: "uncategorised",
        title: "Other Lectures",
        order: 9999,
      };
      const chapter = lecture.chapter || {
        id: "uncategorised",
        title: "Uncategorised",
        order: 9999,
      };
      if (!subjects.has(subject.id)) {
        subjects.set(subject.id, { ...subject, chapters: new Map() });
      }
      const subjectGroup = subjects.get(subject.id)!;
      if (!subjectGroup.chapters.has(chapter.id)) {
        subjectGroup.chapters.set(chapter.id, { ...chapter, lectures: [] });
      }
      subjectGroup.chapters.get(chapter.id)!.lectures.push(lecture);
    });
    return [...subjects.values()]
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
      .map((subject) => ({
        id: subject.id,
        title: subject.title,
        order: subject.order,
        chapters: [...subject.chapters.values()]
          .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
          .map((chapter) => ({
            ...chapter,
            lectures: [...chapter.lectures].sort(
              (a, b) => a.order - b.order || a.title.localeCompare(b.title),
            ),
          })),
      }));
  }, [lectures]);

  const fetchCourseData = async (): Promise<void> => {
    if (!courseId) return;
    try {
      setLoading(true);
      const [courseRes, lecturesRes, quizzesRes, assessmentsRes, examsRes] = await Promise.all([
        axios.get(`/api/v1/user/courses/enrolled/${courseId}`, {
          withCredentials: true,
        }),
        axios.get(`/api/v1/reclec/courses/${courseId}/lectures?userId=${resolvedUserId}`, {
          withCredentials: true,
        }),
        axios.get(`/api/v1/quizzes/student/course/${courseId}`, {
          withCredentials: true,
        }),
        axios.get(`/api/v1/assessments/course/${courseId}`, {
          withCredentials: true,
        }),
        axios.get(`/api/v1/exams/course/${courseId}`, {
          withCredentials: true,
        }),
      ]);

      setCourse(courseRes.data.course);
      let lectureList: RecordedLecture[] = lecturesRes.data;
      let quizList: Quiz[] = quizzesRes.data.quizzes;
      let assessmentList: Assessment[] = assessmentsRes.data.assessments;
      setExams(examsRes.data);

      if (hasValidUserId) {
        const quizCompletionResults = await Promise.all(
          quizList.map(async (quiz) => {
            try {
              const res = await axios.get(
                `/api/v1/user/quizzes/student/${resolvedUserId}/${quiz.id}/completion-status`,
                { withCredentials: true },
              );
              return { ...quiz, completed: res.data?.completed ?? false };
            } catch {
              return { ...quiz, completed: false };
            }
          }),
        );
        quizList = quizCompletionResults;
      }
      setQuizzes(quizList);

      if (hasValidUserId) {
        const assessmentCompletionResults = await Promise.all(
          assessmentList.map(async (assessment) => {
            try {
              const res = await axios.get(
                `/api/v1/user/assessments/${assessment.id}/student/${resolvedUserId}/completion-status`,
                { withCredentials: true },
              );
              return { ...assessment, completed: res.data?.completed ?? false };
            } catch {
              return { ...assessment, completed: false };
            }
          }),
        );
        assessmentList = assessmentCompletionResults;
      }
      setAssessments(assessmentList);

      if (hasValidUserId) {
        const progressResults = await Promise.all(
          lectureList.map(async (lec) => {
            try {
              const res = await axios.get(`/api/v1/reclec/progress/${resolvedUserId}/${lec.id}`, {
                withCredentials: true,
              });
              return { ...lec, progress: res.data?.progress ?? 0 };
            } catch {
              return { ...lec, progress: 0 };
            }
          }),
        );
        lectureList = progressResults;
      }
      setLectures(lectureList);
    } catch (err) {
      console.error("Failed to fetch course data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (quiz: Quiz): Promise<void> => {
    if (quiz.completed) {
      toast.info("You have already completed this quiz.");
      return;
    }
    try {
      const response = await axios.post<StartQuizResponse>(
        `/api/v1/quizzes/student/${quiz.id}/start`,
        {},
        { withCredentials: true },
      );
      navigate(`/dashboard/student/quiz/attempt/${response.data.submissionId}`, {
        state: { timeLimit: quiz.timeLimit, quizId: quiz.id },
      });
    } catch (err) {
      console.error("Failed to start quiz:", err);
      const axiosError = err as AxiosError<{ message?: string }>;
      toast.error(
        axiosError.response?.data?.message ||
          "Failed to start quiz. You may have already attempted it.",
      );
    }
  };

  const handleStartExam = async (exam: Exam): Promise<void> => {
    if (!examsUnlocked) {
      toast.error("Complete all lectures, quizzes, and assessments to unlock exams.");
      return;
    }
    try {
      if (exam.attempts && exam.attempts.length > 0) {
        toast.error("You have already attempted this exam.");
        return;
      }
      navigate(`/dashboard/student/exam/attempt/${exam.id}`, {
        state: {
          timeLimit: exam.duration,
          examId: exam.id,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
        },
      });
    } catch (err) {
      console.error("Failed to start exam:", err);
      toast.error("Failed to start exam. Please try again.");
    }
  };

  const handleLectureClick = async (lecture: RecordedLecture): Promise<void> => {
    setSelectedLecture(lecture);
    setSignedUrlLoading(true);
    setPendingSeekPercent(null);
    setCurrentVideoProgress(0);
    try {
      const signedUrlResponse = await axios.get(
        `/api/v1/reclec/lectures/${lecture.id}/signed-url`,
        { withCredentials: true },
      );
      setSignedUrl(signedUrlResponse.data.signedUrl);
      if (hasValidUserId) {
        const progressRes = await axios.get(
          `/api/v1/reclec/progress/${resolvedUserId}/${lecture.id}`,
          { withCredentials: true },
        );
        const savedPercent = Number(progressRes.data?.progress ?? 0);
        if (!Number.isNaN(savedPercent) && savedPercent > 0) {
          setPendingSeekPercent(savedPercent);
        }
      }
    } catch (err) {
      console.error("Failed to load video:", err);
      toast.error("Failed to load video.");
      setSignedUrl(null);
    } finally {
      setSignedUrlLoading(false);
    }
  };

  const handleLoadedMetadata = (): void => {
    if (videoRef.current && pendingSeekPercent !== null) {
      const duration = videoRef.current.duration;
      if (!Number.isNaN(duration) && duration > 0) {
        const seekTime = (pendingSeekPercent / 100) * duration;
        videoRef.current.currentTime = Math.min(Math.max(seekTime, 0), duration - 0.5);
      }
    }
  };

  const updateProgress = async (): Promise<void> => {
    if (!videoRef.current || !selectedLecture || !hasValidUserId) return;
    const duration = videoRef.current.duration;
    if (!Number.isNaN(duration) && duration > 0) {
      const currentTime = videoRef.current.currentTime;
      const progressPercent = Math.min(100, (currentTime / duration) * 100);
      setCurrentVideoProgress(progressPercent);
      try {
        await axios.post(
          `/api/v1/reclec/progress/${resolvedUserId}/${selectedLecture.id}`,
          { progress: progressPercent },
          { withCredentials: true },
        );
        setLectures((prev) =>
          prev.map((lec) =>
            lec.id === selectedLecture.id ? { ...lec, progress: progressPercent } : lec,
          ),
        );
      } catch (err) {
        console.error("Failed to update progress:", err);
      }
    }
  };

  const handleVideoPlay = (): void => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(updateProgress, 10000);
  };

  const handleVideoPauseOrEnd = (): void => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    updateProgress();
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId, hasValidUserId, resolvedUserId]);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const lectureDurationDisplay = selectedLecture ? formatDuration(selectedLecture.duration) : "";

  const getRequirementStatus = () => {
    return {
      lectures: {
        completed: allLecturesCompleted,
        progress: courseProgress.lectures,
        count: lectures.length,
        completedCount: lectures.filter((l) => (l.progress || 0) >= 95).length,
      },
      quizzes: {
        completed: allQuizzesCompleted,
        progress: courseProgress.quizzes,
        count: quizzes.length,
        completedCount: quizzes.filter((q) => q.completed).length,
      },
      assessments: {
        completed: allAssessmentsCompleted,
        progress: courseProgress.assessments,
        count: assessments.length,
        completedCount: assessments.filter((a) => a.completed).length,
      },
    };
  };

  const requirements = getRequirementStatus();

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm font-medium text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <BookOpen className="h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-400">No course found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* ── Course Hero ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row md:items-center gap-6 p-5 md:p-6">
          {course.thumbnailUrl && (
            <div className="w-full md:w-56 h-40 flex-shrink-0 rounded-xl overflow-hidden border border-gray-100">
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-orange-500" />
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                Course Details
              </p>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
            {course.createdBy?.name && (
              <div className="flex items-center gap-2 mb-3">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">Created by</span>
                <span className="text-xs font-semibold text-gray-700">{course.createdBy.name}</span>
                {course.createdBy.role && (
                  <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                    {course.createdBy.role}
                  </span>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{course.description}</p>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Content (2/3 width) ───────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          {selectedLecture && (
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
                <Play className="h-4 w-4 text-orange-500" />
                <h2 className="text-sm font-bold text-gray-900">{selectedLecture.title}</h2>
              </div>
              <div className="p-5">
                {signedUrlLoading ? (
                  <div className="flex items-center justify-center h-64 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-400">Loading video…</p>
                  </div>
                ) : signedUrl ? (
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      controls
                      src={signedUrl}
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={updateProgress}
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPauseOrEnd}
                      onEnded={handleVideoPauseOrEnd}
                      className="w-full rounded-xl"
                      style={{ maxHeight: "70vh" }}
                    />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {selectedLecture.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-orange-500" />
                          {Math.round(currentVideoProgress)}% completed
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-orange-500" />
                          Duration: {lectureDurationDisplay}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all"
                        style={{ width: `${currentVideoProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-400">Select a lecture to begin.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Recorded Lectures ────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
                <BookOpen className="h-4 w-4 text-orange-500" />
              </span>
              <h2 className="text-sm font-bold text-gray-900">Recorded Lectures</h2>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-100">
                    <th className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-3 text-center w-12">
                      #
                    </th>
                    <th className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-3 text-left">
                      Title
                    </th>
                    <th className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-3 text-center w-28">
                      Progress
                    </th>
                    <th className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-3 text-center w-20">
                      Duration
                    </th>
                    <th className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-3 text-center w-16">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lectureHierarchy.length > 0 ? (
                    lectureHierarchy.map((subject) => (
                      <React.Fragment key={subject.id}>
                        <tr className="border-b border-blue-100 bg-[#072A60] text-white">
                          <td colSpan={5} className="px-4 py-3 text-sm font-bold">
                            {subject.id === "uncategorised"
                              ? subject.title
                              : `Subject ${subject.order}: ${subject.title}`}
                          </td>
                        </tr>
                        {subject.chapters.map((chapter) => (
                          <React.Fragment key={`${subject.id}-${chapter.id}`}>
                            <tr className="border-b border-orange-100 bg-orange-50">
                              <td
                                colSpan={5}
                                className="px-4 py-2 text-xs font-bold text-orange-700"
                              >
                                {chapter.id === "uncategorised"
                                  ? chapter.title
                                  : `Chapter ${chapter.order}: ${chapter.title}`}
                              </td>
                            </tr>
                            {chapter.lectures.map((lecture) => {
                              const isCompleted = (lecture.progress || 0) >= 95;
                              const isSelected = selectedLecture?.id === lecture.id;
                              return (
                                <tr
                                  key={lecture.id}
                                  onClick={() => handleLectureClick(lecture)}
                                  className={cn(
                                    "cursor-pointer border-b border-gray-50 transition-colors",
                                    isSelected
                                      ? "bg-orange-50 hover:bg-orange-50"
                                      : "hover:bg-orange-50/30",
                                  )}
                                >
                                  <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                                    {lecture.order}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="truncate text-sm font-medium text-gray-900">
                                      Lecture {lecture.order}: {lecture.title}
                                    </div>
                                    {lecture.description && (
                                      <div className="mt-0.5 line-clamp-1 text-xs text-gray-400">
                                        {lecture.description}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                                        <div
                                          className="h-full rounded-full bg-orange-500 transition-all"
                                          style={{ width: `${lecture.progress || 0}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] text-gray-400">
                                        {Math.round(lecture.progress || 0)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                                    {formatDuration(lecture.duration)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {isCompleted ? (
                                      <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <div className="mx-auto h-4 w-4 rounded-full border-2 border-gray-200" />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                        No recorded lectures available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Assessments ──────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
                <ClipboardList className="h-4 w-4 text-orange-500" />
              </span>
              <h2 className="text-sm font-bold text-gray-900">Assessments</h2>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-5 space-y-3">
              {assessments.length > 0 ? (
                assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {assessment.title}
                          </h3>
                          {assessment.completed && (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                          {assessment.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          {assessment.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {new Date(assessment.dueDate).toLocaleString()}
                            </span>
                          )}
                          {assessment.totalMarks && <span>Marks: {assessment.totalMarks}</span>}
                        </div>
                      </div>
                      <Link
                        to={`/dashboard/student/assessment/${assessment.id}`}
                        className={cn(
                          "shrink-0 inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold transition-colors",
                          assessment.completed
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-orange-500 hover:bg-orange-600 text-white",
                        )}
                      >
                        {assessment.completed ? "Completed" : "View & Submit"}
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  No assessments available for this course yet.
                </p>
              )}
            </div>
          </div>

          {/* ── Quizzes ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
                <FileText className="h-4 w-4 text-orange-500" />
              </span>
              <h2 className="text-sm font-bold text-gray-900">Quizzes</h2>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-5 space-y-3">
              {quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <FileText className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {quiz.title}
                          </h3>
                          {quiz.completed && (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-1">
                          {quiz.description}
                        </p>
                        {quiz.timeLimit && (
                          <p className="text-[10px] text-gray-400">
                            Time Limit: {quiz.timeLimit} minutes
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartQuiz(quiz)}
                      disabled={quiz.completed}
                      className={cn(
                        "w-full rounded-xl py-2 text-xs font-semibold transition-colors",
                        quiz.completed
                          ? "bg-emerald-500 text-white cursor-default"
                          : "bg-orange-500 hover:bg-orange-600 text-white",
                      )}
                    >
                      {quiz.completed ? "Completed" : "Start Quiz"}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  No quizzes available for this course yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar (1/3 width) ────────────────────────────── */}
        <div className="space-y-6">
          {/* Course Progress */}
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
                <GraduationCap className="h-4 w-4 text-orange-500" />
              </span>
              <h2 className="text-sm font-bold text-gray-900">Course Progress</h2>
            </div>
            <div className="p-5 space-y-3">
              {/* Lectures progress */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    requirements.lectures.completed ? "bg-emerald-50" : "bg-orange-50",
                  )}
                >
                  {requirements.lectures.completed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-orange-500" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">Lectures</p>
                  <p className="text-[10px] text-gray-400">
                    {requirements.lectures.completedCount}/{requirements.lectures.count} completed
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        requirements.lectures.completed ? "bg-emerald-500" : "bg-orange-500",
                      )}
                      style={{ width: `${requirements.lectures.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quizzes progress */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    requirements.quizzes.completed ? "bg-emerald-50" : "bg-orange-50",
                  )}
                >
                  {requirements.quizzes.completed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-orange-500" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">Quizzes</p>
                  <p className="text-[10px] text-gray-400">
                    {requirements.quizzes.completedCount}/{requirements.quizzes.count} completed
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        requirements.quizzes.completed ? "bg-emerald-500" : "bg-orange-500",
                      )}
                      style={{ width: `${requirements.quizzes.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Assessments progress */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    requirements.assessments.completed ? "bg-emerald-50" : "bg-orange-50",
                  )}
                >
                  {requirements.assessments.completed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ClipboardList className="h-4 w-4 text-orange-500" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">Assessments</p>
                  <p className="text-[10px] text-gray-400">
                    {requirements.assessments.completedCount}/{requirements.assessments.count}{" "}
                    completed
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        requirements.assessments.completed ? "bg-emerald-500" : "bg-orange-500",
                      )}
                      style={{ width: `${requirements.assessments.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Exams ────────────────────────────────────────── */}
          <div
            className={cn(
              "rounded-2xl border overflow-hidden hover:shadow-md transition-shadow",
              examsUnlocked ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50/50",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 px-5 py-3 border-b",
                examsUnlocked ? "border-emerald-100 bg-emerald-50/50" : "border-gray-100",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  examsUnlocked ? "bg-emerald-50" : "bg-gray-100",
                )}
              >
                {examsUnlocked ? (
                  <GraduationCap className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-400" />
                )}
              </span>
              <h2
                className={cn(
                  "text-sm font-bold",
                  examsUnlocked ? "text-gray-900" : "text-gray-500",
                )}
              >
                Exams
              </h2>
              {!examsUnlocked && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  Locked
                </span>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto p-5 space-y-3">
              {!examsUnlocked && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 mb-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lock className="h-3.5 w-3.5 text-yellow-600" />
                    <span className="text-xs font-semibold text-yellow-800">
                      Requirements Not Met
                    </span>
                  </div>
                  <p className="text-[10px] text-yellow-700 mb-1.5">To unlock exams, complete:</p>
                  <ul className="text-[10px] space-y-0.5">
                    {!allLecturesCompleted && (
                      <li className="flex items-center gap-1.5 text-yellow-600">
                        <span className="h-1 w-1 rounded-full bg-yellow-500" />
                        All lectures (95%+ each)
                      </li>
                    )}
                    {!allQuizzesCompleted && (
                      <li className="flex items-center gap-1.5 text-yellow-600">
                        <span className="h-1 w-1 rounded-full bg-yellow-500" />
                        All quizzes
                      </li>
                    )}
                    {!allAssessmentsCompleted && (
                      <li className="flex items-center gap-1.5 text-yellow-600">
                        <span className="h-1 w-1 rounded-full bg-yellow-500" />
                        All assessments
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {exams.length > 0 ? (
                exams.map((exam) => (
                  <div
                    key={exam.id}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      examsUnlocked
                        ? "border-gray-100 bg-white hover:border-emerald-200"
                        : "border-gray-100 bg-gray-50 opacity-75",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{exam.title}</h3>
                      {!examsUnlocked && <Lock className="h-3 w-3 text-gray-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">{exam.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock
                          className={cn(
                            "h-3 w-3",
                            examsUnlocked ? "text-emerald-500" : "text-gray-400",
                          )}
                        />
                        {formatDuration(exam.duration * 60)}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap
                          className={cn(
                            "h-3 w-3",
                            examsUnlocked ? "text-emerald-500" : "text-gray-400",
                          )}
                        />
                        {exam.totalMarks} marks
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText
                          className={cn(
                            "h-3 w-3",
                            examsUnlocked ? "text-emerald-500" : "text-gray-400",
                          )}
                        />
                        {exam.questions?.length || 0} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardList
                          className={cn(
                            "h-3 w-3",
                            examsUnlocked ? "text-emerald-500" : "text-gray-400",
                          )}
                        />
                        Pass: {exam.passingMarks}
                      </span>
                    </div>

                    {exam.attempts && exam.attempts.length > 0 && (
                      <div className="flex items-center gap-2 border-t border-gray-100 pt-2 mb-2">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          {exam.attempts[0].completedAt ? "Completed" : "In Progress"}
                        </span>
                        {exam.attempts[0].score !== undefined && (
                          <span className="text-[10px] text-gray-500">
                            Score: {exam.attempts[0].score}/{exam.totalMarks}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleStartExam(exam)}
                      disabled={!examsUnlocked || (exam.attempts && exam.attempts.length > 0)}
                      className={cn(
                        "w-full rounded-xl py-2 text-xs font-semibold transition-colors",
                        !examsUnlocked || (exam.attempts && exam.attempts.length > 0)
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white",
                      )}
                    >
                      {!examsUnlocked
                        ? "Complete Requirements"
                        : exam.attempts && exam.attempts.length > 0
                          ? "Already Attempted"
                          : "Start Exam"}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  No exams available for this course yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsPage;
