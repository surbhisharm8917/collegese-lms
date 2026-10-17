import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import QuizForm from "@/components/QuizForm";
import { useUser } from "@/context/useUser";
import QuizDetailsModal from "@/components/QuizDetailsModal";
import QuizSubmissionsModal from "@/components/QuizSubmissionsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LayoutGrid,
  List,
  Plus,
  Pencil,
  Trash2,
  Send,
  BarChart3,
  HelpCircle,
  FileText,
  ClipboardList,
  X,
} from "lucide-react";
import Loader from "@/components/Loader";
import { cn } from "@/lib/utils";

interface UserInfo {
  id: string;
  name: string;
  email: string;
}
interface Quiz {
  id: string;
  title: string;
  description: string;
  status: string;
  courseId: string;
  createdAt: string;
  originalQuizId?: string;
  createdBy?: UserInfo;
  _count?: { submissions: number };
}
interface Course {
  id: string;
  title: string;
}

const actionBtn =
  "px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors inline-flex items-center gap-1";

const QuizManagementPage = () => {
  const { role } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [viewingQuizId, setViewingQuizId] = useState<string | null>(null);
  const [viewingSubmissionsQuizId, setViewingSubmissionsQuizId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<"delete" | "publish" | null>(null);
  const [dialogQuizId, setDialogQuizId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const quizzesPerPage = 5;
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const canEdit = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TEACHER";
  const showCreator = role === "SUPER_ADMIN" || role === "ADMIN" || role === "TEACHER";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let quizEndpoint = "/api/v1/quizzes/admin/my-quizzes";
        let courseEndpoint = "/api/v1/admin/courses/teacher/my-assigned";
        if (role === "ADMIN" || role === "SUPER_ADMIN") {
          quizEndpoint = "/api/v1/quizzes/admin/audit/all";
          courseEndpoint = "/api/v1/admin/courses/dashboard/all";
        } else if (role === "ASSISTANT") {
          quizEndpoint = "/api/v1/quizzes/assistant/all";
        }
        const quizRes = await axios.get(quizEndpoint, { withCredentials: true });
        setQuizzes(quizRes.data.quizzes || []);
        if (role !== "ASSISTANT") {
          const courseRes = await axios.get(courseEndpoint, { withCredentials: true });
          setCourses(courseRes.data.courses || []);
        }
      } catch (err) {
        setError("Failed to fetch necessary data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role]);

  const handleCreateClick = () => {
    if (courses.length === 0) {
      toast.error("No courses exist. An Admin must create a course first.");
      return;
    }
    setEditingQuiz(null);
    setIsFormModalOpen(true);
  };
  const handleEditClick = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setIsFormModalOpen(true);
  };
  const handleActionConfirm = (action: "delete" | "publish", quizId: string) => {
    setDialogAction(action);
    setDialogQuizId(quizId);
    setShowConfirmDialog(true);
  };

  const executeDialogAction = async () => {
    if (!dialogQuizId || !dialogAction) return;
    try {
      if (dialogAction === "delete") {
        await axios.delete(`/api/v1/quizzes/admin/${dialogQuizId}/delete`, {
          withCredentials: true,
        });
        setQuizzes((prev) => prev.filter((q) => q.id !== dialogQuizId));
        toast.success("Quiz deleted successfully.");
      } else {
        await axios.put(
          `/api/v1/quizzes/admin/${dialogQuizId}/publish`,
          {},
          { withCredentials: true },
        );
        setQuizzes((prev) =>
          prev.map((q) => (q.id === dialogQuizId ? { ...q, status: "PUBLISHED" } : q)),
        );
        toast.success("Quiz published successfully.");
      }
    } catch (err) {
      console.error(`Failed to ${dialogAction} quiz:`, err);
      toast.error(`Failed to ${dialogAction} quiz.`);
    } finally {
      setShowConfirmDialog(false);
      setDialogAction(null);
      setDialogQuizId(null);
    }
  };

  const handleFormSubmit = async (quizData: {
    title: string;
    description: string;
    courseId: string;
    timeLimit: number;
  }) => {
    try {
      if (editingQuiz) {
        const res = await axios.put(`/api/v1/quizzes/admin/${editingQuiz.id}/update`, quizData, {
          withCredentials: true,
        });
        setQuizzes((prev) => prev.map((q) => (q.id === editingQuiz.id ? res.data.quiz : q)));
        toast.success("Quiz updated successfully.");
      } else {
        const res = await axios.post("/api/v1/quizzes/admin/create", quizData, {
          withCredentials: true,
        });
        setQuizzes((prev) => [...prev, res.data.quiz]);
        toast.success("Quiz created successfully.");
      }
      setIsFormModalOpen(false);
      setEditingQuiz(null);
    } catch (err) {
      console.error("Failed to save quiz:", err);
      toast.error("Failed to save quiz.");
    }
  };

  const getBasePath = () => {
    if (role === "SUPER_ADMIN") return "/dashboard/superadmin";
    if (role === "ADMIN") return "/dashboard/admin";
    if (role === "ASSISTANT") return "/dashboard/assistant";
    return "/dashboard/teacher";
  };

  const totalPages = Math.max(1, Math.ceil(quizzes.length / quizzesPerPage));
  const startIndex = (currentPage - 1) * quizzesPerPage;
  const currentQuizzes = quizzes.slice(startIndex, startIndex + quizzesPerPage);

  if (loading) return <Loader message="Loading quizzes…" />;
  if (error)
    return (
      <div className="bg-red-50 text-red-600 rounded-2xl border border-red-100 p-6 text-sm">
        {error}
      </div>
    );

  const Pagination = () =>
    quizzes.length > quizzesPerPage && totalPages > 1 ? (
      <div className="flex justify-center items-center gap-1.5 pt-4">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage(i + 1)}
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
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
            <ClipboardList className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Quizzes</h2>
            <p className="text-xs text-gray-400">{quizzes.length} quizzes total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleCreateClick}
              className="px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-1.5"
            >
              <Plus size={15} /> New Quiz
            </button>
          )}
          <button
            onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
            className="p-2 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500"
          >
            {viewMode === "table" ? <LayoutGrid size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      {/* Table view */}
      {viewMode === "table" ? (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 min-w-[14rem]">
                      Title
                    </th>
                    {showCreator && (
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 min-w-[12rem]">
                        Created By
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      Submissions
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 min-w-[14rem]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentQuizzes.length > 0 ? (
                    currentQuizzes.map((quiz) => (
                      <tr
                        key={quiz.id}
                        className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <span
                            onClick={() => setViewingQuizId(quiz.id)}
                            className="text-sm font-semibold text-gray-900 hover:text-orange-600 cursor-pointer transition-colors"
                          >
                            {quiz.title}
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                            {quiz.description}
                          </p>
                        </td>
                        {showCreator && (
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-medium text-gray-700">
                              {quiz.createdBy?.name || "N/A"}
                            </p>
                            <p className="text-xs text-gray-400">{quiz.createdBy?.email}</p>
                          </td>
                        )}
                        <td className="px-4 py-3 align-top text-xs text-gray-500 whitespace-nowrap">
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              quiz.status === "PUBLISHED"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600",
                            )}
                          >
                            {quiz.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center align-top text-sm font-medium text-gray-700">
                          {quiz._count?.submissions || 0}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap justify-end gap-1">
                            {canEdit && (
                              <button onClick={() => handleEditClick(quiz)} className={actionBtn}>
                                <Pencil size={12} />
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`${getBasePath()}/quiz/${quiz.id}/questions`)}
                              className={actionBtn}
                            >
                              <HelpCircle size={12} />
                              Questions
                            </button>
                            <button
                              onClick={() => navigate(`${getBasePath()}/quiz/${quiz.id}/analytics`)}
                              className={actionBtn}
                            >
                              <BarChart3 size={12} />
                              Analytics
                            </button>
                            <button
                              onClick={() => setViewingSubmissionsQuizId(quiz.id)}
                              className={actionBtn}
                            >
                              <FileText size={12} />
                              Submissions
                            </button>
                            {quiz.status !== "PUBLISHED" && canEdit && (
                              <button
                                onClick={() => handleActionConfirm("publish", quiz.id)}
                                className={actionBtn}
                              >
                                <Send size={12} />
                                Publish
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleActionConfirm("delete", quiz.id)}
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors inline-flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                        No quizzes found.
                      </td>
                    </tr>
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
            {currentQuizzes.length > 0 ? (
              currentQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col"
                >
                  <div className="p-5 flex-1 space-y-2">
                    <span
                      onClick={() => setViewingQuizId(quiz.id)}
                      className="text-sm font-bold text-gray-900 hover:text-orange-600 cursor-pointer transition-colors"
                    >
                      {quiz.title}
                    </span>
                    <p className="text-xs text-gray-400 line-clamp-2">{quiz.description}</p>
                    {showCreator && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-600">
                          {quiz.createdBy?.name || "N/A"}
                        </span>
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          quiz.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600",
                        )}
                      >
                        {quiz.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {quiz._count?.submissions || 0} submissions
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(quiz.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-4 border-t border-gray-100">
                    {canEdit && (
                      <button onClick={() => handleEditClick(quiz)} className={actionBtn}>
                        <Pencil size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`${getBasePath()}/quiz/${quiz.id}/questions`)}
                      className={actionBtn}
                    >
                      <HelpCircle size={12} />
                    </button>
                    <button
                      onClick={() => navigate(`${getBasePath()}/quiz/${quiz.id}/analytics`)}
                      className={actionBtn}
                    >
                      <BarChart3 size={12} />
                    </button>
                    <button
                      onClick={() => setViewingSubmissionsQuizId(quiz.id)}
                      className={actionBtn}
                    >
                      <FileText size={12} />
                    </button>
                    {quiz.status !== "PUBLISHED" && canEdit && (
                      <button
                        onClick={() => handleActionConfirm("publish", quiz.id)}
                        className={actionBtn}
                      >
                        <Send size={12} />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleActionConfirm("delete", quiz.id)}
                        className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-16 text-gray-400 col-span-full">No quizzes found.</p>
            )}
          </div>
          <Pagination />
        </>
      )}

      {/* Form modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h4 className="text-base font-bold text-gray-900">
                {editingQuiz ? "Edit Quiz" : "Create New Quiz"}
              </h4>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <QuizForm
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormModalOpen(false)}
                initialData={editingQuiz || undefined}
                courses={courses}
              />
            </div>
          </div>
        </div>
      )}

      {viewingQuizId && (
        <QuizDetailsModal quizId={viewingQuizId ?? ""} onClose={() => setViewingQuizId(null)} />
      )}
      {viewingSubmissionsQuizId && (
        <QuizSubmissionsModal
          quizId={viewingSubmissionsQuizId ?? ""}
          onClose={() => setViewingSubmissionsQuizId(null)}
        />
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white rounded-2xl border border-gray-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              This action cannot be undone. This will permanently{" "}
              {dialogAction === "delete" ? "delete the quiz." : "publish the quiz."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDialogAction}
              className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
            >
              {dialogAction === "delete" ? "Delete" : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuizManagementPage;
