import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  BookOpen,
  Clock,
  ListOrdered,
  FileVideo,
  Hash,
} from "lucide-react";
import Loader from "@/components/Loader";

/* ── Interfaces ───────────────────────────────────────────── */
interface Course {
  id: string;
  title: string;
  description: string;
}

interface LectureFormData {
  title: string;
  description: string;
  duration: number;
  order: number;
  videoFile: File | null;
}

/* ── Component ────────────────────────────────────────────── */
const TeacherMyCoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [lectureForm, setLectureForm] = useState<LectureFormData>({
    title: "",
    description: "",
    duration: 0,
    order: 1,
    videoFile: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  /* ── Fetch ──────────────────────────────────────────────── */
  useEffect(() => {
    const fetchAssignedCourses = async () => {
      try {
        const response = await axios.get("/api/v1/admin/courses/teacher/my-assigned", {
          withCredentials: true,
        });
        setCourses(response.data.courses);
        if (response.data.courses.length > 0) {
          setSelectedCourseId(response.data.courses[0].id);
        }
      } catch (error) {
        console.error("Error fetching assigned courses:", error);
        toast.error("Failed to fetch assigned courses.");
      } finally {
        setLoading(false);
      }
    };
    fetchAssignedCourses();
  }, []);

  /* ── Handlers ───────────────────────────────────────────── */
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "file") {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setLectureForm((prev) => ({ ...prev, videoFile: file }));
    } else {
      setLectureForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUploadLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureForm.videoFile || !selectedCourseId) {
      toast.error("Please fill out all fields and select a video file.");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("title", lectureForm.title);
    formData.append("description", lectureForm.description);
    formData.append("duration", String(lectureForm.duration));
    formData.append("order", String(lectureForm.order));
    formData.append("video", lectureForm.videoFile);
    formData.append("courseId", selectedCourseId);

    try {
      await axios.post(`/api/v1/reclec/courses/${selectedCourseId}/lectures`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      toast.success("Lecture uploaded successfully!");
      setLectureForm({
        title: "",
        description: "",
        duration: 0,
        order: 1,
        videoFile: null,
      });
    } catch (error) {
      console.error("Error uploading lecture:", error);
      toast.error("Failed to upload lecture.");
    } finally {
      setIsUploading(false);
    }
  };

  /* ── Pagination ─────────────────────────────────────────── */
  const totalPages = Math.ceil(courses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCourses = courses.slice(startIndex, endIndex);

  const goToPage = (page: number) => setCurrentPage(page);
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  /* ── Loading ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      {/* ── Page header ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-5 w-5 text-orange-500" />
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
            My Courses
          </p>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Courses &amp; Lectures</h1>
        <p className="text-sm text-gray-400 mt-1">
          Upload new lectures and view your assigned courses
        </p>
      </div>

      {/* ── Upload Card ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
        {/* card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
            <Upload className="h-4 w-4 text-orange-500" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Upload a New Lecture</h2>
            <p className="text-xs text-gray-400">
              Fill out the form below to add a lecture to a course
            </p>
          </div>
        </div>

        {/* form */}
        <form onSubmit={handleUploadLecture} className="grid gap-5 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="title"
                className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold"
              >
                Lecture Title
              </label>
              <Input
                id="title"
                name="title"
                value={lectureForm.title}
                onChange={handleFormChange}
                placeholder="e.g., Introduction to React"
                required
                className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400 bg-white text-sm text-gray-900 placeholder:text-gray-300"
              />
            </div>

            {/* Course */}
            <div className="space-y-1.5">
              <label
                htmlFor="course"
                className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold"
              >
                Select Course
              </label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400 bg-white text-sm text-gray-900">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent
                  className="z-[200] bg-white border border-gray-100 shadow-lg rounded-xl max-h-60 overflow-auto"
                  position="popper"
                  sideOffset={4}
                >
                  {courses.map((course) => (
                    <SelectItem
                      key={course.id}
                      value={course.id}
                      className="cursor-pointer hover:bg-orange-50 px-3 py-2 text-sm text-gray-900 rounded-lg"
                    >
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-1.5">
              <label
                htmlFor="duration"
                className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold flex items-center gap-1"
              >
                <Clock className="h-3 w-3" /> Duration (seconds)
              </label>
              <Input
                id="duration"
                name="duration"
                type="number"
                value={lectureForm.duration}
                onChange={handleFormChange}
                placeholder="e.g., 3600"
                required
                className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400 bg-white text-sm text-gray-900 placeholder:text-gray-300"
              />
            </div>

            {/* Order */}
            <div className="space-y-1.5">
              <label
                htmlFor="order"
                className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold flex items-center gap-1"
              >
                <ListOrdered className="h-3 w-3" /> Lecture Order
              </label>
              <Input
                id="order"
                name="order"
                type="number"
                value={lectureForm.order}
                onChange={handleFormChange}
                placeholder="e.g., 1"
                required
                className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400 bg-white text-sm text-gray-900 placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold"
            >
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={lectureForm.description}
              onChange={handleFormChange}
              placeholder="Provide a brief description of the lecture content."
              required
              rows={3}
              className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400 bg-white text-sm text-gray-900 placeholder:text-gray-300 resize-none"
            />
          </div>

          {/* Video File */}
          <div className="space-y-1.5">
            <label
              htmlFor="videoFile"
              className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold flex items-center gap-1"
            >
              <FileVideo className="h-3 w-3" /> Video File
            </label>
            <Input
              id="videoFile"
              name="videoFile"
              type="file"
              accept="video/*"
              onChange={handleFormChange}
              required
              className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400 bg-white text-sm text-gray-900 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload Lecture</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Courses Table Card ──────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
        {/* card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
            <BookOpen className="h-4 w-4 text-orange-500" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Assigned Courses</h2>
            <p className="text-xs text-gray-400">All courses you are currently assigned to</p>
          </div>
          {courses.length > 0 && (
            <span className="ml-auto inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600">
              {courses.length}
            </span>
          )}
        </div>

        {/* table */}
        {courses.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold w-16">
                      <Hash className="h-3 w-3 inline-block" />
                    </th>
                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                      Course Title
                    </th>
                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentCourses.map((course, index) => (
                    <tr key={course.id} className="hover:bg-orange-50/40 transition-colors">
                      <td className="px-6 py-3.5 text-xs font-medium text-gray-400">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">
                        {course.title}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-500 line-clamp-2">
                        {course.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Showing {startIndex + 1}–{Math.min(endIndex, courses.length)} of {courses.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`min-w-[28px] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                            currentPage === page
                              ? "bg-orange-500 text-white"
                              : "text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-1 text-xs text-gray-300">
                          …
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-4">
              <BookOpen className="h-6 w-6 text-gray-300" />
            </span>
            <p className="text-sm font-medium text-gray-500">No courses assigned yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Contact your administrator to get assigned to courses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherMyCoursesPage;
