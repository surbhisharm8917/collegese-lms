import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "@/components/Loader";
import axios from "axios";
import { toast } from "sonner";
import AssessmentForm from "@/components/AssessmentForm";
import AssessmentDetailsModal from "@/components/AssessmentDetailsModal";
import BulkAddAssessmentQuestionsModal from "@/components/BulkAddAssessmentQuestionsModal";
import AssignAssistantModal from "@/components/AssignAssistantModal";
import { useUser } from "@/context/useUser";
import {
  List,
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  FileText,
  BarChart3,
  Upload,
  UserPlus,
  ClipboardCheck,
  X,
} from "lucide-react";
// import { cn } from "@/lib/utils";

interface Assessment {
  id: string;
  title: string;
  course: { title: string };
  dueDate: string;
  createdAt: string;
  createdBy: { name: string };
  _count: { submissions: number };
}
interface Course {
  id: string;
  title: string;
}
interface Question {
  text: string;
  marks: number;
}
interface AssessmentFormData {
  title: string;
  description: string;
  courseId: string;
  dueDate: string;
  totalMarks: number;
  submissionType: "FILE_UPLOAD" | "TEXT_ENTRY";
  questions: Question[];
}
interface QuestionPayload {
  text: string;
  marks: number;
}

const actionBtn =
  "px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors inline-flex items-center gap-1";

const AssessmentManagementPage = () => {
  const navigate = useNavigate();
  const { role } = useUser();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [viewingAssessmentId, setViewingAssessmentId] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedAssessmentForBulk, setSelectedAssessmentForBulk] = useState<Assessment | null>(
    null,
  );
  const [assigningToAssessmentId, setAssigningToAssessmentId] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");

  const canEdit = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TEACHER";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        let assessmentEndpoint = "/api/v1/assessments/teacher/my-assessments";
        let courseEndpoint = "/api/v1/admin/courses/teacher/my-assigned";
        if (role === "ADMIN" || role === "SUPER_ADMIN") {
          assessmentEndpoint = "/api/v1/assessments/admin/all";
          courseEndpoint = "/api/v1/admin/courses/dashboard/all";
        } else if (role === "ASSISTANT") {
          assessmentEndpoint = "/api/v1/assessments/assistant/assigned";
          setCourses([]);
          const r = await axios.get(assessmentEndpoint, { withCredentials: true });
          setAssessments(r.data.assessments);
          setLoading(false);
          return;
        }
        const [aRes, cRes] = await Promise.all([
          axios.get(assessmentEndpoint, { withCredentials: true }),
          axios.get(courseEndpoint, { withCredentials: true }),
        ]);
        setAssessments(aRes.data.assessments);
        setCourses(cRes.data.courses);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch data.");
        toast.error("Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role]);

  const handleCreateClick = () => {
    if (courses.length === 0) {
      toast.error("You must have access to a course first.");
      return;
    }
    setEditingAssessment(null);
    setIsModalOpen(true);
  };
  const handleEditClick = (a: Assessment) => {
    setEditingAssessment(a);
    setIsModalOpen(true);
  };
  const openBulkAddModal = (a: Assessment) => {
    setSelectedAssessmentForBulk(a);
    setIsBulkModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this assessment?")) return;
    try {
      await axios.delete(`/api/v1/assessments/${id}`, { withCredentials: true });
      toast.success("Assessment deleted!");
      setAssessments((p) => p.filter((a) => a.id !== id));
    } catch {
      toast.error("Failed to delete assessment.");
    }
  };

  const handleFormSubmit = async (data: AssessmentFormData) => {
    try {
      if (editingAssessment) {
        const res = await axios.put(`/api/v1/assessments/${editingAssessment.id}`, data, {
          withCredentials: true,
        });
        setAssessments((p) =>
          p.map((a) => (a.id === editingAssessment.id ? res.data.assessment : a)),
        );
        toast.success("Assessment updated!");
      } else {
        await axios.post(`/api/v1/assessments/course/${data.courseId}`, data, {
          withCredentials: true,
        });
        toast.success("Assessment created!");
        let ep = "/api/v1/assessments/teacher/my-assessments";
        if (role === "ADMIN" || role === "SUPER_ADMIN") ep = "/api/v1/assessments/admin/all";
        else if (role === "ASSISTANT") ep = "/api/v1/assessments/assistant/assigned";
        const r = await axios.get(ep, { withCredentials: true });
        setAssessments(r.data.assessments);
      }
      setIsModalOpen(false);
      setEditingAssessment(null);
    } catch {
      toast.error("Failed to save assessment.");
    }
  };

  const handleBulkSave = async (newQuestions: QuestionPayload[]) => {
    if (!selectedAssessmentForBulk) return;
    try {
      await axios.post(
        `/api/v1/assessments/${selectedAssessmentForBulk.id}/questions/bulk`,
        { questions: newQuestions },
        { withCredentials: true },
      );
      toast.success(`${newQuestions.length} questions added!`);
      setIsBulkModalOpen(false);
      setSelectedAssessmentForBulk(null);
      let ep = "/api/v1/assessments/teacher/my-assessments";
      if (role === "ADMIN" || role === "SUPER_ADMIN") ep = "/api/v1/assessments/admin/all";
      else if (role === "ASSISTANT") ep = "/api/v1/assessments/assistant/assigned";
      const r = await axios.get(ep, { withCredentials: true });
      setAssessments(r.data.assessments);
    } catch {
      toast.error("Failed to save bulk questions.");
    }
  };

  const basePath = `/dashboard/${role?.toLowerCase().replace("_", "")}`;
  const navigateToSubmissions = (id: string) =>
    navigate(`${basePath}/assessment/${id}/submissions`);
  const navigateToAnalytics = (id: string) => navigate(`${basePath}/assessment/${id}/analytics`);

  if (loading) return <Loader message="Loading assessments…" />;
  if (error)
    return (
      <div className="bg-red-50 text-red-600 rounded-2xl border border-red-100 p-6 text-sm">
        {error}
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2.5 rounded-xl">
            <ClipboardCheck className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Assessments</h2>
            <p className="text-xs text-gray-400">{assessments.length} assessments total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleCreateClick}
              className="px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-1.5"
            >
              <Plus size={15} /> New Assessment
            </button>
          )}
          <button
            onClick={() => setView(view === "table" ? "grid" : "table")}
            className="p-2 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500"
          >
            {view === "table" ? <LayoutGrid size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      {/* Table view */}
      {view === "table" ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/80">
                  {["Title", "Course", "Created By", "Created", "Submissions", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {assessments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      No assessments found.
                    </td>
                  </tr>
                ) : (
                  assessments.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewingAssessmentId(a.id)}
                          className="text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors text-left"
                        >
                          {a.title}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.course?.title}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {a.createdBy?.name || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">
                        {a._count?.submissions ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => navigateToSubmissions(a.id)} className={actionBtn}>
                            <FileText size={12} />
                            Submissions
                          </button>
                          <button onClick={() => navigateToAnalytics(a.id)} className={actionBtn}>
                            <BarChart3 size={12} />
                            Analytics
                          </button>
                          {canEdit && (
                            <>
                              <button onClick={() => handleEditClick(a)} className={actionBtn}>
                                <Pencil size={12} />
                                Edit
                              </button>
                              <button onClick={() => openBulkAddModal(a)} className={actionBtn}>
                                <Upload size={12} />
                                Bulk Add
                              </button>
                              <button
                                onClick={() => setAssigningToAssessmentId(a.id)}
                                className={actionBtn}
                              >
                                <UserPlus size={12} />
                                Assign
                              </button>
                              <button
                                onClick={() => handleDelete(a.id)}
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors inline-flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400">
              No assessments found.
            </div>
          ) : (
            assessments.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col"
              >
                <div className="p-5 flex-1 space-y-2">
                  <h3 className="text-sm font-bold text-gray-900">{a.title}</h3>
                  <p className="text-xs text-gray-400">{a.course?.title}</p>
                  <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
                    <span>By {a.createdBy?.name || "N/A"}</span>
                    <span>{a._count?.submissions ?? 0} submissions</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 p-4 border-t border-gray-100">
                  <button onClick={() => navigateToSubmissions(a.id)} className={actionBtn}>
                    <FileText size={12} />
                  </button>
                  <button onClick={() => navigateToAnalytics(a.id)} className={actionBtn}>
                    <BarChart3 size={12} />
                  </button>
                  {canEdit && (
                    <>
                      <button onClick={() => handleEditClick(a)} className={actionBtn}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => openBulkAddModal(a)} className={actionBtn}>
                        <Upload size={12} />
                      </button>
                      <button
                        onClick={() => setAssigningToAssessmentId(a.id)}
                        className={actionBtn}
                      >
                        <UserPlus size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h4 className="text-base font-bold text-gray-900">
                {editingAssessment ? "Edit Assessment" : "Create Assessment"}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <AssessmentForm
              courses={courses}
              initialData={editingAssessment || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}

      {isBulkModalOpen && selectedAssessmentForBulk && (
        <BulkAddAssessmentQuestionsModal
          onSave={handleBulkSave}
          onClose={() => {
            setIsBulkModalOpen(false);
            setSelectedAssessmentForBulk(null);
          }}
        />
      )}
      {viewingAssessmentId && (
        <AssessmentDetailsModal
          assessmentId={viewingAssessmentId}
          onClose={() => setViewingAssessmentId(null)}
        />
      )}
      {assigningToAssessmentId && (
        <AssignAssistantModal
          assessmentId={assigningToAssessmentId}
          onClose={() => setAssigningToAssessmentId(null)}
        />
      )}
    </div>
  );
};

export default AssessmentManagementPage;
