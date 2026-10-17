import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import CreateRecordedLecture from "@/pages/CreateRecordedLecture";
import AssignTeacherModal from "@/components/AssignTeacherModal";
import ViewAssignedTeachersModal from "@/components/ViewAssignedTeachersModal";
import Loader from "@/components/Loader";
import api from "@/lib/api";
import { PROGRAMME_NAMES } from "@/lib/programmes";
import {
  List,
  LayoutGrid,
  BookOpen,
  Plus,
  UserPlus,
  Pencil,
  Trash2,
  Eye,
  Upload,
  Users,
  UserCheck,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Course = {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  createdAt: string;
  category?: string | null;
  priceInPaise?: number;
  thumbnailUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  enrollmentCount?: number;
};

/* ─── Reusable tiny components ─── */
const MicroLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
    {children}
  </span>
);

const ModalShell = ({
  title,
  onClose,
  width = "max-w-2xl",
  children,
}: {
  title: string;
  onClose: () => void;
  width?: string;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      className={cn("bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto", width)}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
        <h4 className="text-base font-bold text-gray-900">{title}</h4>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const inputCls =
  "block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors";
const btnPrimary =
  "px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors";
const btnOutline =
  "px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors";
const actionBtn =
  "px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors";

/* ─── Main component ─── */
const AdminCoursesTable = () => {
  const [courses, setCourses] = useState<Course[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState<number>(0);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentUserId, setStudentUserId] = useState("");
  const [enrollmentType, setEnrollmentType] = useState<"email" | "userId">("email");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [assigningCourseId, setAssigningCourseId] = useState<string | null>(null);
  const [viewingTeachersForCourse, setViewingTeachersForCourse] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [newCourseData, setNewCourseData] = useState({
    title: "",
    description: "",
    category: "",
    priceRupees: "",
    startDate: "",
    endDate: "",
    isPublished: false,
  });
  const [editCourseData, setEditCourseData] = useState({
    title: "",
    description: "",
    category: "",
    priceRupees: "",
    startDate: "",
    endDate: "",
    isPublished: false,
  });

  const [view, setView] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));
  const pagedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return courses.slice(start, start + pageSize);
  }, [courses, currentPage]);

  /* ─── API helpers ─── */
  const fetchEnrollmentCount = async (courseId: string): Promise<number> => {
    try {
      const res = await api.get(
        `/user/courses/dashboard/${courseId}/enrollment-count?t=${Date.now()}`,
      );
      return res.data.enrolledUsersCount || 0;
    } catch {
      return 0;
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get(`/user/courses/dashboard/all?t=${Date.now()}`);
      const fetched: Course[] = res.data.courses;
      // enrollment count already fetched for each?
      // If backend logic is split, we might still need individual counts:
      const withCounts = await Promise.all(
        fetched.map(async (c) => ({
          ...c,
          enrollmentCount: await fetchEnrollmentCount(c.id),
        })),
      );
      setCourses(withCounts);
      setCurrentPage(1);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (err instanceof Error ? (err as Error).message : "An unknown error occurred."),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseById = async (courseId: string) => {
    try {
      const res = await api.get(`/user/courses/dashboard/${courseId}`);
      return res.data.course;
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          (err instanceof Error ? (err as Error).message : "Failed to fetch course details."),
      );
      return null;
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const fd = new FormData();
      fd.append("title", newCourseData.title);
      fd.append("description", newCourseData.description);
      fd.append("category", newCourseData.category);
      fd.append("priceInPaise", String(Math.round(Number(newCourseData.priceRupees) * 100)));
      fd.append("currency", "INR");
      fd.append("startDate", newCourseData.startDate);
      fd.append("endDate", newCourseData.endDate);
      fd.append("isPublished", newCourseData.isPublished.toString());
      if (thumbnailFile) fd.append("thumbnail", thumbnailFile);
      const res = await api.post("/admin/courses", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data;
      toast.success(data.message || "Course created!");
      setIsModalOpen(false);
      setNewCourseData({
        title: "",
        description: "",
        category: "",
        priceRupees: "",
        startDate: "",
        endDate: "",
        isPublished: false,
      });
      setThumbnailFile(null);
      fetchCourses();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          (err instanceof Error ? (err as Error).message : "An unknown error occurred."),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setIsUpdating(true);
    try {
      const fd = new FormData();
      fd.append("title", editCourseData.title);
      fd.append("description", editCourseData.description);
      fd.append("category", editCourseData.category);
      fd.append("priceInPaise", String(Math.round(Number(editCourseData.priceRupees) * 100)));
      fd.append("currency", "INR");
      fd.append("startDate", editCourseData.startDate);
      fd.append("endDate", editCourseData.endDate);
      fd.append("isPublished", editCourseData.isPublished.toString());
      if (editThumbnailFile) fd.append("thumbnail", editThumbnailFile);

      // Update with axios (api)
      const { data } = await api.put(`/admin/courses/${selectedCourse.id}`, fd);

      toast.success(data.message || "Course updated!");
      setIsEditModalOpen(false);
      setSelectedCourse(null);
      setEditThumbnailFile(null);
      fetchCourses();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to update course.";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone."))
      return;
    setIsDeleting(courseId);
    try {
      const { data } = await api.delete(`/admin/courses/${courseId}`);
      toast.success(data.message || "Course deleted!");
      fetchCourses();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to delete course.";
      toast.error(msg);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error("Please select a course.");
      return;
    }
    if (enrollmentType === "email" && !studentEmail) {
      toast.error("Please enter student email.");
      return;
    }
    if (enrollmentType === "userId" && !studentUserId) {
      toast.error("Please enter student user ID.");
      return;
    }
    setIsEnrolling(true);
    try {
      const endpoint =
        enrollmentType === "email"
          ? `/admin/courses/${selectedCourseId}/enroll-by-email`
          : `/admin/courses/${selectedCourseId}/enroll-by-id`;
      const bodyData =
        enrollmentType === "email" ? { email: studentEmail } : { userId: studentUserId };

      const { data } = await api.post(endpoint, bodyData);

      toast.success(data.message || "Student enrolled!");
      setStudentEmail("");
      setStudentUserId("");
      setIsEnrollmentModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to enroll student.";
      toast.error(msg);
    } finally {
      setIsEnrolling(false);
    }
  };

  const openEditModal = async (course: Course) => {
    const details = await fetchCourseById(course.id);
    if (details) {
      setSelectedCourse(course);
      setEditCourseData({
        title: details.title || "",
        description: details.description || "",
        category: details.category || "",
        priceRupees: String((details.priceInPaise || 0) / 100),
        startDate: details.startDate ? String(details.startDate).slice(0, 10) : "",
        endDate: details.endDate ? String(details.endDate).slice(0, 10) : "",
        isPublished: details.isPublished || false,
      });
      setIsEditModalOpen(true);
    }
  };

  const openEnrollmentModal = (courseId: string) => {
    setSelectedCourseId(courseId);
    setIsEnrollmentModalOpen(true);
    setEnrollmentType("email");
    setStudentEmail("");
    setStudentUserId("");
    fetchEnrollmentCount(courseId).then(setEnrollmentCount);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    isEdit = false,
  ) => {
    const { name, value, type } = e.target;
    const setter = isEdit ? setEditCourseData : setNewCourseData;
    setter((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0] || null;
    if (isEdit) {
      setEditThumbnailFile(file);
    } else {
      setThumbnailFile(file);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading) return <Loader message="Loading courses…" />;
  if (error)
    return (
      <div className="bg-red-50 text-red-600 rounded-2xl border border-red-100 p-6 text-sm">
        {error}
      </div>
    );

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── Course form fields (shared between create & edit) ─── */
  const CourseFormFields = ({ data, isEdit }: { data: typeof newCourseData; isEdit: boolean }) => (
    <>
      <label className="block">
        <MicroLabel>Course Title *</MicroLabel>
        <input
          type="text"
          name="title"
          value={data.title}
          onChange={(e) => handleInputChange(e, isEdit)}
          required
          className={cn(inputCls, "mt-1")}
          placeholder="Enter course title"
        />
      </label>
      <label className="block">
        <MicroLabel>Description</MicroLabel>
        <textarea
          name="description"
          value={data.description}
          onChange={(e) => handleInputChange(e, isEdit)}
          rows={3}
          className={cn(inputCls, "mt-1 resize-none")}
          placeholder="Enter course description"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <MicroLabel>Programme category *</MicroLabel>
          <select
            name="category"
            value={data.category}
            onChange={(e) => handleInputChange(e, isEdit)}
            required
            className={cn(inputCls, "mt-1 bg-white")}
          >
            <option value="">Select programme</option>
            {PROGRAMME_NAMES.map((programme) => (
              <option key={programme} value={programme}>
                {programme}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <MicroLabel>Price in rupees *</MicroLabel>
          <input
            type="number"
            name="priceRupees"
            value={data.priceRupees}
            onChange={(e) => handleInputChange(e, isEdit)}
            required
            min="0"
            step="0.01"
            className={cn(inputCls, "mt-1")}
            placeholder="e.g. 12500"
          />
        </label>
      </div>
      <div>
        <MicroLabel>Thumbnail</MicroLabel>
        <div className="mt-1 space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleThumbnailFileChange(e, isEdit)}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <MicroLabel>Start Date</MicroLabel>
          <input
            type="date"
            name="startDate"
            value={data.startDate}
            onChange={(e) => handleInputChange(e, isEdit)}
            className={cn(inputCls, "mt-1")}
          />
        </label>
        <label className="block">
          <MicroLabel>End Date</MicroLabel>
          <input
            type="date"
            name="endDate"
            value={data.endDate}
            onChange={(e) => handleInputChange(e, isEdit)}
            className={cn(inputCls, "mt-1")}
          />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isPublished"
          checked={data.isPublished}
          onChange={(e) => handleInputChange(e, isEdit)}
          className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
        />
        <span className="text-sm text-gray-700">Publish immediately</span>
      </label>
    </>
  );

  /* ─── Pagination ─── */
  const Pagination = () =>
    courses.length > pageSize ? (
      <div className="flex justify-center items-center gap-1.5 pt-4">
        <button
          disabled={currentPage === 1}
          onClick={() => goToPage(currentPage - 1)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            currentPage === 1
              ? "text-gray-300 border-gray-100 cursor-not-allowed"
              : "text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50",
          )}
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => goToPage(i + 1)}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-medium border transition-colors",
              currentPage === i + 1
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-orange-300",
            )}
          >
            {i + 1}
          </button>
        ))}
        <button
          disabled={currentPage === totalPages}
          onClick={() => goToPage(currentPage + 1)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            currentPage === totalPages
              ? "text-gray-300 border-gray-100 cursor-not-allowed"
              : "text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50",
          )}
        >
          Next
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2.5 rounded-xl">
            <BookOpen className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Courses</h2>
            <p className="text-xs text-gray-400">{courses.length} courses total</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsModalOpen(true)}
            className={btnPrimary + " flex items-center gap-1.5"}
          >
            <Plus size={15} /> New Course
          </button>
          <button
            onClick={() => setIsEnrollmentModalOpen(true)}
            className={btnOutline + " flex items-center gap-1.5"}
          >
            <UserPlus size={15} /> Enroll
          </button>
          <button
            onClick={() => setView((v) => (v === "table" ? "grid" : "table"))}
            className="p-2 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500"
          >
            {view === "table" ? <LayoutGrid size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      {/* Table view */}
      {view === "table" ? (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/80">
                    {[
                      "Title",
                      "Description",
                      "Programme",
                      "Price",
                      "Published",
                      "Enrollments",
                      "Created",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap border-b border-gray-100"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    pagedCourses.map((course) => (
                      <tr
                        key={course.id}
                        className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                          {course.title}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[280px] truncate">
                          {course.description}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                          {course.category || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-800 whitespace-nowrap">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format((course.priceInPaise || 0) / 100)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              course.isPublished
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {course.isPublished ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                          {course.enrollmentCount ?? 0}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(course.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <Link
                              to={`/dashboard/superadmin/courses/${course.id}`}
                              className={actionBtn + " flex items-center gap-1"}
                            >
                              <Eye size={12} />
                              View
                            </Link>
                            <button
                              onClick={() => openEditModal(course)}
                              className={actionBtn + " flex items-center gap-1"}
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                            <button
                              onClick={() => openEnrollmentModal(course.id)}
                              className={actionBtn + " flex items-center gap-1"}
                            >
                              <Users size={12} />
                              Enroll
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCourseId(course.id);
                                setIsUploadModalOpen(true);
                              }}
                              className={actionBtn + " flex items-center gap-1"}
                            >
                              <Upload size={12} />
                              Upload
                            </button>
                            <button
                              onClick={() =>
                                setViewingTeachersForCourse({ id: course.id, title: course.title })
                              }
                              className={actionBtn + " flex items-center gap-1"}
                            >
                              <UserCheck size={12} />
                              Teachers
                            </button>
                            <button
                              onClick={() => setAssigningCourseId(course.id)}
                              className={actionBtn + " flex items-center gap-1"}
                            >
                              <UserPlus size={12} />
                              Assign
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              disabled={isDeleting === course.id}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {isDeleting === course.id ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" />…
                                </>
                              ) : (
                                <>
                                  <Trash2 size={12} />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination />
        </>
      ) : (
        /* Grid view */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedCourses.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-400">No courses found.</div>
            ) : (
              pagedCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col"
                >
                  <div className="p-5 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{course.title}</h3>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          course.isPublished
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {course.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                        {course.category || "Uncategorised"}
                      </span>
                      <span className="font-bold text-gray-800">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format((course.priceInPaise || 0) / 100)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-gray-400">
                        Enrolled:{" "}
                        <span className="font-semibold text-gray-700">
                          {course.enrollmentCount ?? 0}
                        </span>
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(course.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-4 border-t border-gray-100">
                    <Link to={`/dashboard/superadmin/courses/${course.id}`} className={actionBtn}>
                      <Eye size={12} />
                    </Link>
                    <button onClick={() => openEditModal(course)} className={actionBtn}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => openEnrollmentModal(course.id)} className={actionBtn}>
                      <Users size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setIsUploadModalOpen(true);
                      }}
                      className={actionBtn}
                    >
                      <Upload size={12} />
                    </button>
                    <button onClick={() => setAssigningCourseId(course.id)} className={actionBtn}>
                      <UserPlus size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      disabled={isDeleting === course.id}
                      className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <Pagination />
        </>
      )}

      {/* ─── Create Course Modal ─── */}
      {isModalOpen && (
        <ModalShell title="Create New Course" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleCreateCourse} className="space-y-5">
            <CourseFormFields data={newCourseData} isEdit={false} />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setIsModalOpen(false)} className={btnOutline}>
                Cancel
              </button>
              <button type="submit" disabled={isCreating} className={btnPrimary}>
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Creating…
                  </span>
                ) : (
                  "Create Course"
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ─── Edit Course Modal ─── */}
      {isEditModalOpen && selectedCourse && (
        <ModalShell title="Edit Course" onClose={() => setIsEditModalOpen(false)}>
          <form onSubmit={handleUpdateCourse} className="space-y-5">
            <CourseFormFields data={editCourseData} isEdit={true} />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className={btnOutline}
              >
                Cancel
              </button>
              <button type="submit" disabled={isUpdating} className={btnPrimary}>
                {isUpdating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Updating…
                  </span>
                ) : (
                  "Update Course"
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ─── Enrollment Modal ─── */}
      {isEnrollmentModalOpen && (
        <ModalShell
          title="Student Enrollment"
          onClose={() => setIsEnrollmentModalOpen(false)}
          width="max-w-lg"
        >
          {selectedCourseId && (
            <div className="mb-5 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-sm text-orange-700">
                Current Enrollments: <span className="font-bold">{enrollmentCount}</span>
              </p>
            </div>
          )}
          <form onSubmit={handleEnrollStudent} className="space-y-5">
            <label className="block">
              <MicroLabel>Select Course</MicroLabel>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  if (e.target.value) fetchEnrollmentCount(e.target.value);
                }}
                required
                className={cn(inputCls, "mt-1")}
              >
                <option value="">Select a course…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <MicroLabel>Enrollment Method</MicroLabel>
              <div className="flex gap-4 mt-2">
                {(["email", "userId"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      value={t}
                      checked={enrollmentType === t}
                      onChange={(e) => setEnrollmentType(e.target.value as "email" | "userId")}
                      className="text-orange-500 focus:ring-orange-400"
                    />
                    {t === "email" ? "By Email" : "By User ID"}
                  </label>
                ))}
              </div>
            </div>
            {enrollmentType === "email" ? (
              <label className="block">
                <MicroLabel>Student Email *</MicroLabel>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  required
                  placeholder="Enter student email"
                  className={cn(inputCls, "mt-1")}
                />
              </label>
            ) : (
              <label className="block">
                <MicroLabel>Student User ID *</MicroLabel>
                <input
                  type="text"
                  value={studentUserId}
                  onChange={(e) => setStudentUserId(e.target.value)}
                  required
                  placeholder="Enter student user ID"
                  className={cn(inputCls, "mt-1")}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Enter the full User ID (24 character string)
                </p>
              </label>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEnrollmentModalOpen(false)}
                className={btnOutline}
              >
                Cancel
              </button>
              <button type="submit" disabled={isEnrolling} className={btnPrimary}>
                {isEnrolling ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Enrolling…
                  </span>
                ) : (
                  "Enroll Student"
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ─── Upload Lectures Modal ─── */}
      {isUploadModalOpen && (
        <ModalShell
          title="Upload Lectures"
          onClose={() => setIsUploadModalOpen(false)}
          width="max-w-3xl"
        >
          {selectedCourseId && (
            <div className="rounded-xl border border-gray-100 p-2">
              <CreateRecordedLecture courseId={selectedCourseId} />
            </div>
          )}
        </ModalShell>
      )}

      {/* ─── External modals ─── */}
      {assigningCourseId && (
        <AssignTeacherModal
          courseId={assigningCourseId}
          onClose={() => setAssigningCourseId(null)}
        />
      )}
      {viewingTeachersForCourse && (
        <ViewAssignedTeachersModal
          courseId={viewingTeachersForCourse.id}
          courseTitle={viewingTeachersForCourse.title}
          onClose={() => setViewingTeachersForCourse(null)}
        />
      )}
    </div>
  );
};

export default AdminCoursesTable;
