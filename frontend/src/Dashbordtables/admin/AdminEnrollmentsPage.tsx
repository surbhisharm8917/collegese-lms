import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import axios, { AxiosError } from "axios";
import Loader from "@/components/Loader";
import { GraduationCap, Search, LayoutGrid, List, Users, Eye, Loader2 } from "lucide-react";

type Enrollment = {
  id: string;
  status: string;
  enrolledAt: string;
  course: {
    id: string;
    title: string;
    description: string;
    isPublished: boolean;
    thumbnailUrl?: string;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type User = {
  id: string;
  name: string;
  email: string;
};

const AdminEnrollmentsPage: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [enrollingCourseIds, setEnrollingCourseIds] = useState<string[]>([]);
  const [enrollingUserId, setEnrollingUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const perPage = 10;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get("/api/v1/user/profile", {
        withCredentials: true,
        headers: getAuthHeaders(),
      });
      setCurrentUser(res.data.user || null);
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  };

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const res = await axios.get("/api/v1/admin/enrollments/all", {
          withCredentials: true,
          headers: getAuthHeaders(),
        });
        const data = res.data;
        if (Array.isArray(data.enrollments)) {
          setEnrollments(
            data.enrollments.map((e: Enrollment) => ({
              ...e,
              user: e.user ?? null,
              course: e.course ?? null,
            })),
          );
        } else {
          setEnrollments([]);
        }
      } catch (err) {
        const axErr = err as AxiosError<{ message?: string }>;
        setError(axErr.response?.data?.message || axErr.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollments();
    fetchCurrentUser();
  }, []);

  const fetchUsers = async () => {
    try {
      setFetchingUsers(true);
      const res = await axios.get("/api/v1/admin/users/all", {
        withCredentials: true,
        headers: getAuthHeaders(),
      });
      setUsers(res.data.users || []);
      toast.success("Users loaded");
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(axErr.response?.data?.message || "Error fetching users");
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!currentUser) {
      toast.error("Current user not found. Please log in again.");
      return;
    }
    try {
      setEnrollingCourseIds((prev) => [...prev, courseId]);
      const res = await axios.post(
        `/api/v1/user/courses/${courseId}/enroll`,
        {},
        { withCredentials: true, headers: getAuthHeaders() },
      );
      const data = res.data;
      toast.success(data.message);
      const courseData = enrollments.find((e) => e.course?.id === courseId)?.course || {
        id: courseId,
        title: "Course",
        description: "",
        isPublished: true,
      };
      setEnrollments((prev) => [
        ...prev,
        {
          id: data.enrollment.id,
          status: data.enrollment.status || "IN_PROGRESS",
          enrolledAt: data.enrollment.enrolledAt || new Date().toISOString(),
          course: courseData,
          user: currentUser,
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setEnrollingCourseIds((prev) => prev.filter((id) => id !== courseId));
    }
  };

  const handleEnrollUser = async (courseId: string) => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }
    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return;
    try {
      setEnrollingUserId(user.id);
      const res = await axios.post(
        `/api/v1/admin/courses/${courseId}/enroll-by-id`,
        { userId: user.id },
        { withCredentials: true, headers: getAuthHeaders() },
      );
      const data = res.data;
      toast.success(data.message);
      const courseData = enrollments.find((e) => e.course?.id === courseId)?.course || {
        id: courseId,
        title: "Course",
        description: "",
        isPublished: true,
      };
      setEnrollments((prev) => [
        ...prev,
        {
          id: data.enrollment.id,
          status: data.enrollment.status || "IN_PROGRESS",
          enrolledAt: data.enrollment.enrolledAt || new Date().toISOString(),
          course: courseData,
          user,
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setEnrollingUserId(null);
    }
  };

  const filtered = enrollments.filter((e) => {
    const term = searchTerm.toLowerCase();
    return (
      e.course?.title?.toLowerCase().includes(term) ||
      e.user?.name?.toLowerCase().includes(term) ||
      e.user?.email?.toLowerCase().includes(term) ||
      e.status?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "COMPLETED") return "bg-emerald-50 text-emerald-600";
    if (s === "IN_PROGRESS") return "bg-blue-50 text-blue-600";
    return "bg-amber-50 text-amber-600";
  };

  // Determine base path for links (admin vs superadmin)
  const basePath = window.location.pathname.includes("/superadmin/")
    ? "/dashboard/superadmin"
    : "/dashboard/admin";

  if (loading) return <Loader message="Loading enrollments…" />;

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">All Enrollments</h2>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} enrollments found</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={fetchingUsers}
            className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center gap-1.5"
          >
            {fetchingUsers ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            Fetch Users
          </button>
          {users.length > 0 && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none w-52 transition-colors"
            >
              <option value="">Select a user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search enrollments…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none w-full sm:w-56 transition-colors"
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
          <GraduationCap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No enrollments found</p>
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
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Enrolled
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((enrollment) => {
                  const course = enrollment.course || {
                    id: "",
                    title: "Course deleted",
                    description: "",
                    isPublished: false,
                  };
                  return (
                    <tr
                      key={enrollment.id}
                      className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {course.thumbnailUrl && (
                            <img
                              src={course.thumbnailUrl}
                              alt=""
                              className="w-8 h-8 object-cover rounded-lg"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900 max-w-[160px] truncate">
                            {course.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {enrollment.user?.name || "Deleted"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate">
                        {enrollment.user?.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(enrollment.status)}`}
                        >
                          {enrollment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {course.id && (
                            <Link to={`${basePath}/courses/${course.id}`}>
                              <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                <Eye className="h-3 w-3 inline mr-1" />
                                View
                              </button>
                            </Link>
                          )}
                          <button
                            onClick={() => handleEnroll(course.id)}
                            disabled={
                              !course.id || enrollingCourseIds.includes(course.id) || !currentUser
                            }
                            className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 transition-colors"
                          >
                            {enrollingCourseIds.includes(course.id) ? "Enrolling…" : "Enroll Me"}
                          </button>
                          {selectedUserId && course.id && (
                            <button
                              onClick={() => handleEnrollUser(course.id)}
                              disabled={enrollingUserId === selectedUserId}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 transition-colors"
                            >
                              {enrollingUserId === selectedUserId ? "Enrolling…" : "Enroll User"}
                            </button>
                          )}
                          {enrollment.user?.id && course.id && (
                            <Link
                              to={`${basePath}/courses/${course.id}/students/${enrollment.user.id}`}
                            >
                              <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                Progress
                              </button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((enrollment) => {
            const course = enrollment.course || {
              id: "",
              title: "Course deleted",
              description: "",
              isPublished: false,
            };
            return (
              <div
                key={enrollment.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {course.thumbnailUrl && (
                      <img
                        src={course.thumbnailUrl}
                        alt=""
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                    )}
                    <h3 className="text-sm font-semibold text-gray-900 max-w-[160px] truncate">
                      {course.title}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(enrollment.status)}`}
                  >
                    {enrollment.status}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-500 mb-3">
                  <p>
                    <span className="font-medium text-gray-700">Student:</span>{" "}
                    {enrollment.user?.name || "Deleted"}
                  </p>
                  <p className="truncate">{enrollment.user?.email || "—"}</p>
                  <p>{new Date(enrollment.enrolledAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {course.id && (
                    <Link to={`${basePath}/courses/${course.id}`}>
                      <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                        View
                      </button>
                    </Link>
                  )}
                  <button
                    onClick={() => handleEnroll(course.id)}
                    disabled={!course.id || enrollingCourseIds.includes(course.id) || !currentUser}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 transition-colors"
                  >
                    {enrollingCourseIds.includes(course.id) ? "Enrolling…" : "Enroll Me"}
                  </button>
                  {selectedUserId && course.id && (
                    <button
                      onClick={() => handleEnrollUser(course.id)}
                      disabled={enrollingUserId === selectedUserId}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 transition-colors"
                    >
                      {enrollingUserId === selectedUserId ? "Enrolling…" : "Enroll User"}
                    </button>
                  )}
                  {enrollment.user?.id && course.id && (
                    <Link to={`${basePath}/courses/${course.id}/students/${enrollment.user.id}`}>
                      <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                        Progress
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
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
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === page
                    ? "bg-orange-500 text-white border border-orange-500"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {page}
              </button>
            );
          })}
          {totalPages > 7 && <span className="text-xs text-gray-400">…</span>}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminEnrollmentsPage;
