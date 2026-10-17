import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Loader from "@/components/Loader";
import { Video, Search, LayoutGrid, List, Users, Clock, Loader2, X } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  enrolledCount: number;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

const CreateLiveLecture: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/v1/admin/courses/dashboard/all", { withCredentials: true });
      const courseData = (res.data.courses || []).map(
        (c: Course & { _count?: { enrollments?: number } }) => ({
          ...c,
          enrolledCount: c.enrolledCount ?? c._count?.enrollments ?? 0,
        }),
      );
      setCourses(courseData);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get("/api/v1/admin/users/all", { withCredentials: true });
      const allUsers = res.data.users || [];
      setTeachers(allUsers.filter((u: { role: string }) => u.role === "TEACHER"));
    } catch {
      toast.error("Failed to load teachers");
    }
  };

  const openAssignModal = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTeacherId("");
    setStartTime("");
    setEndTime("");
    setShowModal(true);
  };

  const handleStartLecture = async () => {
    if (!selectedCourse || !selectedTeacherId || !startTime || !endTime) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      setCreating(selectedCourse.id);
      await axios.post(
        "/api/v1/live-lectures/live",
        {
          courseId: selectedCourse.id,
          teacherId: selectedTeacherId,
          // Convert the local datetime-local value to a full ISO string (with
          // timezone) so the server stores the correct instant regardless of
          // its own timezone.
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        },
        { withCredentials: true },
      );
      toast.success("Live lecture scheduled");
      setShowModal(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to start lecture");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setCreating(null);
    }
  };

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  if (loading) return <Loader message="Loading courses…" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Create Live Lecture</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Select a course to assign a teacher and schedule a live lecture
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none w-full sm:w-64 transition-colors"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            {viewMode === "table" ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Video className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No courses found</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Enrolled
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((course) => (
                  <tr
                    key={course.id}
                    className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{course.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-500 max-w-xs truncate">
                        {course.description || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">{course.enrolledCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openAssignModal(course)}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
                      >
                        Assign & Start
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginated.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{course.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                {course.description || "No description"}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                <Users className="h-3.5 w-3.5" />
                <span>{course.enrolledCount} enrolled</span>
              </div>
              <button
                onClick={() => openAssignModal(course)}
                className="w-full px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
              >
                Assign & Start
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentPage === i + 1
                  ? "bg-orange-500 text-white border border-orange-500"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Teacher & Schedule</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedCourse?.title}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Teacher *
                </span>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-colors bg-white"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Start Time *
                </span>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-colors"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  End Time *
                </span>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-colors"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartLecture}
                disabled={
                  !selectedTeacherId || !startTime || !endTime || creating === selectedCourse?.id
                }
                className="px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                {creating === selectedCourse?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    Start Lecture
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateLiveLecture;
