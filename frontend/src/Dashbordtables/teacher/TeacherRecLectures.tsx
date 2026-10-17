import { useState, useEffect } from "react";
import api from "@/lib/api";
import { uploadVideoToStorage } from "@/lib/uploadVideo";
import axios from "axios";
import { useUser } from "@/context/useUser";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Loader from "@/components/Loader";
import {
  Video,
  Plus,
  Upload,
  Clock,
  Users,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  X,
  BookOpen,
  AlertCircle,
} from "lucide-react";

interface StudentProgress {
  studentId: string;
  studentName: string;
  progress: number;
  lastWatched?: string;
}

interface RecordedLecture {
  id: string;
  title: string;
  videoUrl: string;
  duration: number | null;
  teacherId?: string | null;
  studentProgress?: StudentProgress[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  recordedLectures: RecordedLecture[];
}

const TeacherRecLectures = () => {
  const { user } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLecture, setEditingLecture] = useState<{
    lectureId: string;
    courseId: string;
    title: string;
    duration: number;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    courseId: string | null;
    lectureId: string | null;
  }>({ open: false, courseId: null, lectureId: null });
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newLecture, setNewLecture] = useState<{
    title: string;
    description: string;
    file: File | null;
    duration: number;
    order: number;
    moduleId?: string;
  }>({ title: "", description: "", file: null, duration: 0, order: 1 });
  const [expandedLectures, setExpandedLectures] = useState<Set<string>>(new Set());

  const fetchCoursesWithLectures = async () => {
    if (!user || !user.id) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/teachers/${user.id}/courses`);
      const coursesData: Course[] = response.data.courses || [];
      const coursesWithProgress = await Promise.all(
        coursesData.map(async (course) => {
          const lecturesWithProgress = await Promise.all(
            course.recordedLectures.map(async (lecture) => {
              try {
                const progressRes = await api.get(
                  `/reclec/teachers/${user.id}/lectures/${lecture.id}/student-progress`,
                );
                const rawProgress = progressRes.data.progress || [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const normalizedProgress: StudentProgress[] = rawProgress.map((p: any) => ({
                  studentId: p.userId,
                  studentName: p.user?.name || "Unknown",
                  progress: p.progress,
                  lastWatched: p.watchedAt,
                }));
                return { ...lecture, studentProgress: normalizedProgress };
              } catch {
                return { ...lecture, studentProgress: [] };
              }
            }),
          );
          return { ...course, recordedLectures: lecturesWithProgress };
        }),
      );
      setCourses(coursesWithProgress);
      setLoading(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data?.message || "Failed to fetch courses.");
      } else {
        setError("Failed to fetch courses.");
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesWithLectures();
  }, [user]);

  const handleDelete = async (courseId: string, lectureId: string) => {
    if (!user || !user.id) return toast.error("User not authenticated.");
    try {
      await api.delete(`/reclec/lectures/${lectureId}`);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? { ...c, recordedLectures: c.recordedLectures.filter((l) => l.id !== lectureId) }
            : c,
        ),
      );
      toast.success("Lecture deleted successfully");
      setDeleteDialog({ open: false, courseId: null, lectureId: null });
    } catch {
      toast.error("Failed to delete lecture");
    }
  };

  const handleEdit = (courseId: string, lectureId: string) => {
    const course = courses.find((c) => c.id === courseId);
    const lecture = course?.recordedLectures.find((l) => l.id === lectureId);
    if (lecture) {
      setEditingLecture({
        lectureId: lecture.id,
        courseId,
        title: lecture.title,
        duration: lecture.duration || 0,
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingLecture || !user?.id) return;
    try {
      const response = await api.put(`/reclec/lectures/${editingLecture.lectureId}`, {
        title: editingLecture.title,
        duration: editingLecture.duration,
      });
      if (response.data.success) {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === editingLecture.courseId
              ? {
                  ...c,
                  recordedLectures: c.recordedLectures.map((l) =>
                    l.id === editingLecture.lectureId
                      ? { ...l, title: editingLecture.title, duration: editingLecture.duration }
                      : l,
                  ),
                }
              : c,
          ),
        );
        setEditingLecture(null);
        toast.success("Lecture updated successfully");
      } else {
        toast.error("Update failed");
      }
    } catch {
      toast.error("Update failed");
    }
  };

  const handleUploadLecture = async (courseId: string) => {
    if (!user?.id || !newLecture.file) return toast.error("Missing fields.");
    const file = newLecture.file;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      return toast.error("Unsupported format. Please use MP4, WebM, or MOV.");
    }
    if (file.size > 20 * 1024 * 1024 * 1024) {
      return toast.error("Video file size must be less than 20 GB.");
    }
    if (!newLecture.title.trim() || newLecture.duration <= 0 || newLecture.order < 1) {
      return toast.error("Please provide a title, a positive duration, and an order.");
    }
    try {
      setUploading(true);
      setUploadProgress(0);
      // 1. Ask the API for a short-lived direct-upload target.
      const prepared = await api.post(`/reclec/courses/${courseId}/lectures/upload-url`, {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      const { uploadUrl, key, uploadToken, headers } = prepared.data;
      // 2. Upload straight to storage (chunked for large files).
      await uploadVideoToStorage(file, { uploadUrl, headers }, setUploadProgress);
      // 3. Confirm the upload and create the lecture record.
      const response = await api.post(`/reclec/courses/${courseId}/lectures/complete`, {
        key,
        uploadToken,
        title: newLecture.title.trim(),
        description: newLecture.description.trim(),
        duration: Number(newLecture.duration),
        order: Number(newLecture.order),
        moduleId: newLecture.moduleId || undefined,
      });
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                recordedLectures: [
                  ...c.recordedLectures,
                  { ...response.data.lecture, studentProgress: [] },
                ],
              }
            : c,
        ),
      );
      toast.success("Lecture uploaded successfully");
      setNewLecture({ title: "", description: "", file: null, duration: 0, order: 1 });
      setSelectedCourseId(null);
      setUploadProgress(0);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response
          ? err.response.data?.message || err.response.data?.error || "Failed to upload lecture"
          : "Failed to upload lecture";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const toggleLectureExpanded = (id: string) => {
    setExpandedLectures((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  };

  const getAvgProgress = (sp: StudentProgress[]) => {
    if (!sp || sp.length === 0) return 0;
    return Math.round(sp.reduce((s, p) => s + p.progress, 0) / sp.length);
  };

  const progressColor = (p: number) => {
    if (p >= 90) return "bg-emerald-50 text-emerald-600";
    if (p >= 70) return "bg-orange-50 text-orange-600";
    if (p >= 50) return "bg-amber-50 text-amber-600";
    return "bg-red-50 text-red-600";
  };

  const barColor = (p: number) => {
    if (p >= 90) return "bg-emerald-500";
    if (p >= 70) return "bg-orange-500";
    if (p >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  if (loading) return <Loader message="Loading courses & lectures\u2026" />;

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w5 h-5 text-red-500" />
        </div>
        <p className="text-sm text-red-600 font-medium">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchCoursesWithLectures();
          }}
          className="px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );

  if (!user)
    return (
      <div className="text-center py-20 text-sm text-gray-400">
        Please log in to view your courses.
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-50 p-2.5 rounded-xl">
          <Video className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Courses & Recorded Lectures</h1>
          <p className="text-xs text-gray-400">
            {courses.length} course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            You have not created or been assigned to any courses yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              {/* Course header */}
              <div className="p-5 border-b border-gray-50">
                <h2 className="text-sm font-bold text-gray-900">{course.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{course.description}</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Lectures header + Add button */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Lectures ({course.recordedLectures.length})
                  </p>
                  <button
                    onClick={() => setSelectedCourseId(course.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Lecture
                  </button>
                </div>

                {/* Upload form */}
                {selectedCourseId === course.id && (
                  <div className="bg-orange-50 rounded-xl border border-orange-100 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Upload New Lecture
                      </h3>
                      <button
                        onClick={() => setSelectedCourseId(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          placeholder="Lecture Title"
                          value={newLecture.title}
                          onChange={(e) => setNewLecture({ ...newLecture, title: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                          Duration (min)
                        </label>
                        <input
                          type="number"
                          placeholder="Duration"
                          value={newLecture.duration}
                          onChange={(e) =>
                            setNewLecture({
                              ...newLecture,
                              duration: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                          Description
                        </label>
                        <textarea
                          placeholder="Lecture Description"
                          value={newLecture.description}
                          onChange={(e) =>
                            setNewLecture({ ...newLecture, description: e.target.value })
                          }
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                            Order
                          </label>
                          <input
                            type="number"
                            placeholder="Order"
                            value={newLecture.order}
                            onChange={(e) =>
                              setNewLecture({ ...newLecture, order: parseInt(e.target.value) || 1 })
                            }
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                            Video File
                          </label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-orange-200 rounded-xl cursor-pointer bg-white hover:border-orange-300 transition-colors">
                            <Upload className="w-5 h-5 text-orange-400 mb-1" />
                            <p className="text-[10px] text-orange-500 font-medium">
                              Click to upload (MP4, WebM, MOV · up to 20 GB)
                            </p>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) =>
                                setNewLecture({ ...newLecture, file: e.target.files?.[0] || null })
                              }
                            />
                          </label>
                          {newLecture.file && (
                            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {newLecture.file.name}
                            </p>
                          )}
                          {uploading && (
                            <div className="mt-2">
                              <div className="mb-1 flex justify-between text-[10px] font-medium text-gray-500">
                                <span>Uploading to secure storage</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full bg-orange-500 transition-[width] duration-200"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        disabled={uploading}
                        onClick={() => handleUploadLecture(course.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        {uploading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                            Uploading{uploadProgress ? ` ${uploadProgress}%` : "…"}
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" /> Upload Lecture
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedCourseId(null)}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit form */}
                {editingLecture && editingLecture.courseId === course.id && (
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-5 space-y-4">
                    <h3 className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit Lecture
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editingLecture.title}
                          onChange={(e) =>
                            setEditingLecture({ ...editingLecture, title: e.target.value })
                          }
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                          Duration (min)
                        </label>
                        <input
                          type="number"
                          value={editingLecture.duration}
                          onChange={(e) =>
                            setEditingLecture({
                              ...editingLecture,
                              duration: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleUpdate}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Update
                      </button>
                      <button
                        onClick={() => setEditingLecture(null)}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Lectures list */}
                {course.recordedLectures.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                    <Video className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-3">
                      No recorded lectures for this course yet.
                    </p>
                    <button
                      onClick={() => setSelectedCourseId(course.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add First Lecture
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {course.recordedLectures.map((lecture) => {
                      const avg = getAvgProgress(lecture.studentProgress || []);
                      return (
                        <div
                          key={lecture.id}
                          className="rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5">
                                <div className="bg-orange-50 p-2 rounded-lg shrink-0">
                                  <Video className="w-4 h-4 text-orange-500" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-gray-900 truncate">
                                    {lecture.title}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-3 mt-1">
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {lecture.duration || "N/A"} min
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Users className="w-3 h-3" />{" "}
                                      {lecture.studentProgress?.length || 0} students
                                    </span>
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${progressColor(avg)}`}
                                    >
                                      Avg: {avg}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Expandable student progress */}
                              {lecture.studentProgress && lecture.studentProgress.length > 0 && (
                                <>
                                  <button
                                    onClick={() => toggleLectureExpanded(lecture.id)}
                                    className="mt-3 text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                                  >
                                    {expandedLectures.has(lecture.id) ? (
                                      <>
                                        <ChevronDown className="w-3.5 h-3.5" /> Hide Progress
                                      </>
                                    ) : (
                                      <>
                                        <ChevronRight className="w-3.5 h-3.5" /> View Progress
                                      </>
                                    )}
                                  </button>
                                  {expandedLectures.has(lecture.id) && (
                                    <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2 max-h-52 overflow-y-auto">
                                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Individual Progress
                                      </p>
                                      {lecture.studentProgress.map((s) => (
                                        <div
                                          key={s.studentId}
                                          className="flex items-center justify-between gap-3 bg-white rounded-lg p-2.5 border border-gray-100"
                                        >
                                          <span className="text-xs font-medium text-gray-700 truncate">
                                            {s.studentName}
                                          </span>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <div className="w-20 bg-gray-100 rounded-full h-1.5">
                                              <div
                                                className={`h-1.5 rounded-full ${barColor(s.progress)}`}
                                                style={{ width: `${s.progress}%` }}
                                              />
                                            </div>
                                            <span
                                              className={`text-[10px] font-semibold w-8 text-right ${
                                                s.progress >= 90
                                                  ? "text-emerald-600"
                                                  : s.progress >= 70
                                                    ? "text-orange-600"
                                                    : s.progress >= 50
                                                      ? "text-amber-600"
                                                      : "text-red-600"
                                              }`}
                                            >
                                              {s.progress}%
                                            </span>
                                            {s.lastWatched && (
                                              <span className="text-[10px] text-gray-400">
                                                {new Date(s.lastWatched).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleEdit(course.id, lecture.id)}
                                className="p-2 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <AlertDialog
                                open={deleteDialog.open && deleteDialog.lectureId === lecture.id}
                                onOpenChange={(open) =>
                                  setDeleteDialog({
                                    open,
                                    courseId: open ? course.id : null,
                                    lectureId: open ? lecture.id : null,
                                  })
                                }
                              >
                                <AlertDialogTrigger asChild>
                                  <button className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white rounded-2xl border border-gray-100 shadow-lg max-w-sm">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-sm font-bold text-gray-900">
                                      Delete Lecture?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs text-gray-500">
                                      This action cannot be undone. The lecture will be permanently
                                      removed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="px-4 py-2 rounded-lg bg-gray-100 text-xs font-semibold text-gray-600 hover:bg-gray-200">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(course.id, lecture.id)}
                                      className="px-4 py-2 rounded-lg bg-red-500 text-xs font-semibold text-white hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherRecLectures;
