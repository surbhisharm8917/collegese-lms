import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, User, Calendar, AlertCircle } from "lucide-react";
import Loader from "@/components/Loader";
import api from "@/lib/api";

type Course = {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  isEnrolled: boolean;
  enrollmentStatus?: string;
  enrollmentDate?: string;
  progress: number;
  startDate?: string;
  endDate?: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

const ITEMS_PER_PAGE = 6;

const MyCoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    let isMounted = true;

    const fetchMyCourses = async () => {
      try {
        const response = await api.get(`/user/courses/me?t=${Date.now()}`);
        const data = response.data;
        if (isMounted && Array.isArray(data.courses)) {
          setCourses(data.courses);
        } else if (isMounted) {
          setCourses([]);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err.response?.data?.message || err instanceof Error
              ? (err as Error).message
              : "Failed to fetch courses.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMyCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalPages = Math.ceil(courses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = courses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm font-medium text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-5 w-5 text-orange-500" />
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
            Enrolled Courses
          </p>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-sm text-gray-400 mt-1">
          {courses.length} course{courses.length !== 1 ? "s" : ""} enrolled
        </p>
      </div>

      {/* ── Empty State ──────────────────────────────────────── */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-4">
            <BookOpen className="h-6 w-6 text-gray-300" />
          </span>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No Courses Yet</h3>
          <p className="text-xs text-gray-400">You haven&apos;t enrolled in any courses yet.</p>
        </div>
      ) : (
        <>
          {/* ── Course Cards Grid ────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentItems.map((course) => (
              <Link key={course.id} to={`${course.id}`} className="block group">
                <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full">
                  {/* Thumbnail */}
                  <div className="w-full h-44 overflow-hidden bg-gray-100">
                    <img
                      src={
                        course.thumbnailUrl ||
                        "/brand/just-easy-ca-classes-512.png"
                      }
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1.5">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2 flex-grow mb-3">
                      {course.description}
                    </p>

                    {/* Meta info */}
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{course.createdBy.name}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {course.startDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400">
                              {new Date(course.startDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {course.endDate && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400">
                              — {new Date(course.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {course.isEnrolled && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                              Progress
                            </span>
                            <span className="text-xs font-semibold text-gray-700">
                              {Math.round(course.progress)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                course.progress >= 100 ? "bg-emerald-500" : "bg-orange-500"
                              }`}
                              style={{ width: `${Math.min(course.progress, 100)}%` }}
                            />
                          </div>
                          {course.progress >= 100 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
                              Completed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* ── Pagination ───────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    currentPage === idx + 1
                      ? "bg-orange-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-orange-50"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyCoursesPage;
