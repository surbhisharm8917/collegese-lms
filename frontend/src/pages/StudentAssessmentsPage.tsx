import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import Loader from "@/components/Loader";
import {
  ClipboardList,
  BookOpen,
  Calendar,
  Award,
  Upload,
  AlignLeft,
  ArrowRight,
} from "lucide-react";

interface Assessment {
  id: string;
  title: string;
  description: string;
  course: { title: string };
  dueDate: string;
  totalMarks: number;
  submissionType: "FILE_UPLOAD" | "TEXT_ENTRY";
}

interface Course {
  id: string;
  title: string;
}

interface ApiAssessment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  submissionType: "FILE_UPLOAD" | "TEXT_ENTRY";
}

const StudentAssessmentsPage = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentAssessments = async () => {
      try {
        setLoading(true);
        const coursesResponse = await api.get("/user/courses/me");
        const courses: Course[] = coursesResponse.data.courses;
        const assessmentPromises = courses.map((course) =>
          api
            .get(`/assessments/course/${course.id}`)
            .then((response) => ({
              course,
              assessments: response.data.assessments as ApiAssessment[],
            }))
            .catch(() => ({ course, assessments: [] as ApiAssessment[] })),
        );
        const results = await Promise.all(assessmentPromises);
        const allAssessments = results.flatMap((result) =>
          result.assessments.map((a: ApiAssessment) => ({
            ...a,
            course: { title: result.course.title },
          })),
        );
        setAssessments(allAssessments);
      } catch {
        toast.error("Failed to load assessments");
      } finally {
        setLoading(false);
      }
    };
    fetchStudentAssessments();
  }, []);

  if (loading) return <Loader message="Loading assessments…" />;

  const isPast = (d: string) => new Date(d) < new Date();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-50 p-2.5 rounded-xl">
          <ClipboardList className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Assessments</h1>
          <p className="text-xs text-gray-400">
            {assessments.length} assessment{assessments.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No assessments found for your enrolled courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessments.map((a) => {
            const pastDue = isPast(a.dueDate);
            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{a.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{a.description}</p>
                  </div>
                  {pastDue && (
                    <span className="ml-2 shrink-0 inline-flex items-center px-2 py-0.5 rounded-lg bg-red-50 text-[10px] font-semibold uppercase tracking-widest text-red-500">
                      Past Due
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                      Course
                    </p>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-gray-400" />
                      <p className="text-xs font-medium text-gray-700 truncate">{a.course.title}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                      Due Date
                    </p>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <p
                        className={`text-xs font-medium ${pastDue ? "text-red-500" : "text-gray-700"}`}
                      >
                        {new Date(a.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                      Total Marks
                    </p>
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-gray-400" />
                      <p className="text-xs font-medium text-gray-700">{a.totalMarks}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                      Type
                    </p>
                    <div className="flex items-center gap-1">
                      {a.submissionType === "FILE_UPLOAD" ? (
                        <Upload className="w-3 h-3 text-gray-400" />
                      ) : (
                        <AlignLeft className="w-3 h-3 text-gray-400" />
                      )}
                      <p className="text-xs font-medium text-gray-700">
                        {a.submissionType === "FILE_UPLOAD" ? "File Upload" : "Text Entry"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/dashboard/student/assessment/${a.id}/submit`)}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-orange-500 text-white py-2 rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors"
                >
                  Start Assessment{" "}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAssessmentsPage;
