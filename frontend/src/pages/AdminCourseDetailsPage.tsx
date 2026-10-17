import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Calendar, User, Clock, FileText, BarChart3 } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  category?: string;
  duration?: number;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role?: string;
    profilePic?: string;
  };
}

interface Enrollment {
  id: string;
  status: string;
  progress: number;
  enrolledAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface CourseStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  averageProgress: number;
  totalLectures: number;
  totalQuizzes: number;
  totalAssessments: number;
}

interface InstructorProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  profilePic?: string;
  phone?: string;
  address?: string;
}

const getProfileRoute = (_userId: string, role?: string) => {
  const roleRoutes: { [key: string]: string } = {
    TEACHER: `/dashboard/teacher/teacherprofile`,
    STUDENT: `/dashboard/student/studentProfile`,
    ASSISTANT: `/dashboard/assistant/profile`,
    ADMIN: `/dashboard/admin/profile`,
    SUPERADMIN: `/dashboard/superadmin/superAdminProfile`,
  };
  if (!role) return `/dashboard/superadmin/superAdminProfile`;
  return roleRoutes[role.toUpperCase()] || `/dashboard/superadmin/superAdminProfile`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const AdminCourseDetailsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllEnrollments, setShowAllEnrollments] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);
  const [instructorProfile, setInstructorProfile] = useState<InstructorProfile | null>(null);

  const fetchInstructorProfile = async (
    instructorId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fallbackProfile: any,
  ) => {
    try {
      const instructorRes = await axios.get(`/api/v1/admin/users/${instructorId}`, {
        withCredentials: true,
      });
      const profileData = instructorRes.data.user || instructorRes.data;
      setInstructorProfile(profileData);
    } catch (err) {
      console.log("Failed to fetch instructor profile:", err);
      setInstructorProfile(fallbackProfile);
    }
  };

  const fetchCourseAndStats = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      const [courseRes, enrollmentsRes, statsRes] = await Promise.all([
        axios.get(`/api/v1/user/courses/dashboard/${courseId}`, {
          withCredentials: true,
        }),
        axios
          .get(`/api/v1/stats/admin/enrollments/${courseId}`, {
            withCredentials: true,
          })
          .catch(() => ({ data: { data: [] } })),
        axios
          .get(`/api/v1/stats/admin/course-stats/${courseId}`, {
            withCredentials: true,
          })
          .catch(() => ({ data: { data: null } })),
      ]);

      const courseData = courseRes.data.data || courseRes.data.course || null;
      setCourse(courseData);
      setEnrollments(enrollmentsRes.data?.data || []);
      setStats(statsRes.data?.data || null);
      setProfileImgError(false);

      if (courseData?.createdBy?.id) {
        await fetchInstructorProfile(courseData.createdBy.id, courseData.createdBy);
      }

      setError(null);
    } catch (err) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(error.response?.data?.message || error.message || "Failed to load course data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseAndStats();
  }, [courseId]);

  if (loading) {
    return <div className="p-8 text-center">Loading course details...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error loading course: {error}</div>;
  }

  if (!course) {
    return <div className="p-8 text-center">Course not found.</div>;
  }

  // Helper functions for rendering to reduce complexity in the main return block
  const renderEnrollmentStatusBadge = (status: string) => {
    const isCompleted = status === "COMPLETED";
    const variant = isCompleted ? "default" : "secondary";
    const className = isCompleted
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";
    return (
      <Badge variant={variant} className={className}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const renderEnrollmentProgress = (progress: number) => (
    <div className="flex items-center space-x-2">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div
          className="bg-orange-500 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <span className="text-sm text-gray-600 font-medium min-w-[3rem]">{progress}%</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{course.title}</h1>
              <div className="flex items-center gap-3 mb-4">
                <Badge
                  variant={course.isPublished ? "default" : "secondary"}
                  className={course.isPublished ? "bg-orange-100 border-orange-200" : ""}
                  style={course.isPublished ? { color: "#FF5733", borderColor: "#FF5733" } : {}}
                >
                  {course.isPublished ? "Published" : "Draft"}
                </Badge>
                {course.category && (
                  <Badge
                    variant="outline"
                    className="border-orange-200 bg-orange-50"
                    style={{ color: "#FF5733", borderColor: "#FF5733" }}
                  >
                    {course.category}
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 leading-relaxed max-w-3xl">{course.description}</p>
            </div>
            <div className="text-right text-sm text-gray-500 ml-6 flex-shrink-0">
              <div className="bg-gray-50 rounded-lg p-3 min-w-[200px]">
                <p className="font-medium text-gray-700 mb-1">Course Details</p>
                <p className="mb-1">ID: {course.id.slice(-8)}</p>
                <p className="mb-1">Created: {formatDate(course.createdAt)}</p>
                <p>Updated: {formatDate(course.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-100">
                <CardTitle className="flex items-center text-orange-900">
                  <BookOpen className="w-5 h-5 mr-3 text-orange-600" />
                  Course Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {course.thumbnailUrl && (
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-40 h-24 object-cover rounded-lg border shadow-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-3 text-lg">Course Overview</h3>
                      <p className="text-gray-700 leading-relaxed">{course.description}</p>
                    </div>
                  </div>
                )}
                {!course.thumbnailUrl && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Course Overview</h3>
                    <p className="text-gray-700 leading-relaxed">{course.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                      Created Date
                    </h3>
                    <p className="text-gray-700 font-medium">{formatDate(course.createdAt)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-600" />
                      Last Updated
                    </h3>
                    <p className="text-gray-700 font-medium">{formatDate(course.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {(instructorProfile || course.createdBy) && (
              <Card className="shadow-sm border-0 bg-white">
                <CardHeader
                  className="bg-gradient-to-r from-orange-50 to-red-50 border-b"
                  style={{ borderColor: "#FF5733" }}
                >
                  <CardTitle className="flex items-center" style={{ color: "#FF5733" }}>
                    <User className="w-5 h-5 mr-3" style={{ color: "#FF5733" }} />
                    Instructor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      {(instructorProfile?.profilePic || course.createdBy?.profilePic) &&
                      !profileImgError ? (
                        <img
                          src={instructorProfile?.profilePic || course.createdBy?.profilePic}
                          alt={instructorProfile?.name || course.createdBy?.name}
                          className="w-16 h-16 rounded-full object-cover"
                          style={{ border: `2px solid #FF5733` }}
                          onError={() => setProfileImgError(true)}
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "#FF5733", color: "white" }}
                        >
                          <span className="text-xl font-bold">
                            {(instructorProfile?.name || course.createdBy?.name || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {instructorProfile?.name || course.createdBy?.name}
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {instructorProfile?.email || course.createdBy?.email}
                      </p>
                      {instructorProfile?.phone && (
                        <p className="text-gray-600 text-sm mb-2">📞 {instructorProfile.phone}</p>
                      )}
                      {(instructorProfile?.role || course.createdBy?.role) && (
                        <Badge
                          variant="outline"
                          className="border-orange-200 bg-orange-50"
                          style={{ color: "#FF5733", borderColor: "#FF5733" }}
                        >
                          {instructorProfile?.role || course.createdBy?.role}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <Link
                        to={getProfileRoute(
                          instructorProfile?.id || course.createdBy?.id || "",
                          instructorProfile?.role || course.createdBy?.role,
                        )}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-200 hover:bg-orange-50"
                          style={{
                            color: "#FF5733",
                            borderColor: "#FF5733",
                          }}
                        >
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-100">
                <CardTitle className="flex items-center text-orange-900">
                  <Users className="w-5 h-5 mr-3 text-orange-600" />
                  Recent Enrollments
                  <Badge
                    variant="outline"
                    className="ml-auto border-orange-200 text-orange-700 bg-orange-50"
                  >
                    {enrollments.length} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {enrollments.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No enrollments found for this course.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {(showAllEnrollments ? enrollments : enrollments.slice(0, 5)).map(
                      (enrollment) => (
                        <div key={enrollment.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-orange-600">
                                  {enrollment.user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {enrollment.user.name}
                                </h4>
                                <p className="text-gray-600 text-sm">{enrollment.user.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-3 mb-2">
                                {renderEnrollmentStatusBadge(enrollment.status)}
                              </div>
                              {renderEnrollmentProgress(enrollment.progress)}
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                    {enrollments.length > 5 && (
                      <div className="p-4 bg-gray-50 text-center border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllEnrollments(!showAllEnrollments)}
                          className="border-orange-200 hover:bg-orange-50"
                          style={{
                            color: "#FF5733",
                            borderColor: "#FF5733",
                          }}
                        >
                          {showAllEnrollments
                            ? "Show Less"
                            : `View All ${enrollments.length} Enrollments`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            {stats && (
              <Card className="shadow-sm border-0 bg-white">
                <CardHeader
                  className="bg-gradient-to-r from-orange-50 to-red-50 border-b"
                  style={{ borderColor: "#FF5733" }}
                >
                  <CardTitle className="flex items-center" style={{ color: "#FF5733" }}>
                    <BarChart3 className="w-5 h-5 mr-3" style={{ color: "#FF5733" }} />
                    Course Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl text-center border"
                      style={{ borderColor: "#FF5733" }}
                    >
                      <div className="text-3xl font-bold mb-2" style={{ color: "#FF5733" }}>
                        {stats.totalEnrollments}
                      </div>
                      <div className="text-sm font-medium" style={{ color: "#FF5733" }}>
                        Total Enrollments
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center border border-green-200">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {stats.completedEnrollments}
                      </div>
                      <div className="text-sm font-medium text-green-700">Completed</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl text-center border border-orange-200">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {stats.activeEnrollments}
                      </div>
                      <div className="text-sm font-medium text-orange-700">Active</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl text-center border border-orange-200">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {Math.round(stats.averageProgress)}%
                      </div>
                      <div className="text-sm font-medium text-orange-700">Avg Progress</div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Completion Rate</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completed</span>
                        <span className="font-medium text-green-600">
                          {stats.totalEnrollments > 0
                            ? Math.round(
                                (stats.completedEnrollments / stats.totalEnrollments) * 100,
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              stats.totalEnrollments > 0
                                ? (stats.completedEnrollments / stats.totalEnrollments) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {stats && (
              <Card className="shadow-sm border-0 bg-white">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                  <CardTitle className="flex items-center text-amber-900">
                    <FileText className="w-5 h-5 mr-3 text-amber-600" />
                    Content Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                          <BookOpen className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">Lectures</span>
                      </div>
                      <span className="text-xl font-bold text-orange-600">
                        {stats.totalLectures}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">Quizzes</span>
                      </div>
                      <span className="text-xl font-bold text-green-600">{stats.totalQuizzes}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                          <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">Assessments</span>
                      </div>
                      <span className="text-xl font-bold text-orange-600">
                        {stats.totalAssessments}
                      </span>
                    </div>

                    {course.duration && (
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                            <Clock className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-700 font-medium">Duration</span>
                        </div>
                        <span className="text-xl font-bold text-orange-600">
                          {Math.round(course.duration / 60)}h
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCourseDetailsPage;
