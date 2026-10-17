import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Search,
  BarChart3,
  ClipboardList,
  Plus,
  Eye,
  Edit,
  Upload,
  Mail,
  Trash2,
  HelpCircle,
  X,
  FileText,
  Loader2,
  SendHorizontal,
} from "lucide-react";
import ExamForm from "@/components/exams/ExamForm";
import BulkUpload from "@/components/exams/BulkUpload";
import ExamStats from "./ExamStats";
import ExamDetail from "./ExamDetail";
import QuestionForm from "@/components/exams/QuestionForm";
import AllExamScores from "@/pages/AllExamScores";
import Loader from "@/components/Loader";
import { cn } from "@/lib/utils";

interface Option {
  id?: string;
  text: string;
  isCorrect?: boolean;
}
interface Question {
  id: string;
  text: string;
  options: Option[];
  marks?: number;
  maxMarks?: number;
  questionType: "MCQ" | "SUBJECTIVE";
  markingScheme?: string;
}
interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isDeleted: boolean;
  isPublished: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMins: number;
  totalMarks: number;
  passingMarks: number;
  courseId: string;
  course: Course;
  isFinalExam: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
interface PendingEvaluation {
  id: string;
  exam: { id: string; title: string };
  user: { name: string; email: string };
  completedAt: string;
}
type InlineView = "detail" | "stats" | "questions" | null;

const iconBtn =
  "p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors";

/* ─── Modal Shell ─── */
const ModalShell = ({
  onClose,
  width = "max-w-3xl",
  children,
}: {
  onClose: () => void;
  width?: string;
  children: React.ReactNode;
}) => (
  <div
    role="dialog"
    aria-modal="true"
    className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto relative",
        width,
      )}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors z-10"
      >
        <X size={18} />
      </button>
      {children}
    </div>
  </div>
);

const ManageExams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [openExamForm, setOpenExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [openBulk, setOpenBulk] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [openInline, setOpenInline] = useState<{ id: string | null; view: InlineView }>({
    id: null,
    view: null,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [openQuestionForm, setOpenQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [pendingEvaluations, setPendingEvaluations] = useState<PendingEvaluation[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [openScoresModal, setOpenScoresModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSendingResults, setIsSendingResults] = useState<string | null>(null);
  const [publishingExamId, setPublishingExamId] = useState<string | null>(null);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/v1/exams");
      setExams(res.data);
    } catch {
      toast.error("Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  };
  const fetchQuestions = async (examId: string) => {
    try {
      setLoadingQuestions(true);
      const res = await axios.get(`/api/v1/exams/${examId}/questions`);
      setQuestions(res.data);
    } catch {
      toast.error("Failed to fetch questions");
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };
  const fetchPendingEvaluations = async () => {
    try {
      setLoadingEvaluations(true);
      const res = await axios.get("/api/v1/exams/pending-evaluations");
      setPendingEvaluations(res.data.pendingAttempts || []);
    } catch {
      toast.error("Failed to fetch pending evaluations");
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const sendResultsForExam = async (examId: string) => {
    if (isSendingResults) return;
    try {
      setIsSendingResults(examId);
      const res = await axios.post("/api/v1/exams/send-results", { examId });
      toast.success(res.data.message || "Results sent!");
      fetchPendingEvaluations();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send results");
    } finally {
      setIsSendingResults(null);
    }
  };

  const handleExamDelete = async (id: string) => {
    if (
      window.confirm("Are you sure you want to delete this exam? This action cannot be undone.")
    ) {
      try {
        await axios.delete(`/api/v1/exams/${id}`);
        toast.success("Exam deleted");
        setExams((prev) => prev.filter((e) => e.id !== id));
        if (openInline.id === id) setOpenInline({ id: null, view: null });
      } catch {
        toast.error("Failed to delete exam");
      }
    }
  };

  const handleQuestionDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await axios.delete(`/api/v1/exams/questions/${id}`);
        toast.success("Question deleted");
        setQuestions((prev) => prev.filter((q) => q.id !== id));
      } catch {
        toast.error("Failed to delete question");
      }
    }
  };

  const publishExam = async (id: string) => {
    setPublishingExamId(id);
    try {
      await axios.put(`/api/v1/exams/${id}/publish`);
      toast.success("Exam published to enrolled learners");
      await fetchExams();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to publish exam");
    } finally {
      setPublishingExamId(null);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchPendingEvaluations();
  }, []);
  useEffect(() => {
    if (openInline.id && openInline.view === "questions") fetchQuestions(openInline.id);
    else setQuestions([]);
  }, [openInline.id, openInline.view]);

  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.course.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2.5 rounded-xl">
            <FileText className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Exams</h2>
            <p className="text-xs text-gray-400">{exams.length} exams total</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input
              type="text"
              placeholder="Search exams…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-56 pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
            />
          </div>
          <button
            onClick={() => setOpenScoresModal(true)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-1.5"
          >
            <BarChart3 size={15} /> Scores
          </button>
          <button
            onClick={fetchPendingEvaluations}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-1.5"
          >
            <ClipboardList size={15} /> Pending
          </button>
          <button
            onClick={() => {
              setEditingExam(null);
              setOpenExamForm(true);
            }}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Exam
          </button>
        </div>
      </div>

      {/* Exam table */}
      {loading ? (
        <Loader message="Loading exams…" />
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">
            {searchTerm
              ? `No exams match "${searchTerm}"`
              : "Get started by creating your first exam"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/80">
                  {["Exam Title", "Status", "Duration", "Course", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{exam.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                          exam.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {exam.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{exam.durationMins} min</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{exam.course.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <button
                          className={iconBtn}
                          onClick={() =>
                            setOpenInline((p) =>
                              p.id === exam.id && p.view === "detail"
                                ? { id: null, view: null }
                                : { id: exam.id, view: "detail" },
                            )
                          }
                          title="Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className={iconBtn}
                          onClick={() => {
                            setEditingExam(exam);
                            setOpenExamForm(true);
                          }}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className={iconBtn}
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setOpenBulk(true);
                          }}
                          title="Bulk Upload"
                        >
                          <Upload size={14} />
                        </button>
                        <button
                          className={cn(iconBtn, "disabled:opacity-50")}
                          onClick={() => sendResultsForExam(exam.id)}
                          title="Send Results"
                          disabled={isSendingResults === exam.id}
                        >
                          {isSendingResults === exam.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Mail size={14} />
                          )}
                        </button>
                        <button
                          className={iconBtn}
                          onClick={() =>
                            setOpenInline((p) =>
                              p.id === exam.id && p.view === "stats"
                                ? { id: null, view: null }
                                : { id: exam.id, view: "stats" },
                            )
                          }
                          title="Stats"
                        >
                          <BarChart3 size={14} />
                        </button>
                        <button
                          className={iconBtn}
                          onClick={() =>
                            setOpenInline((p) =>
                              p.id === exam.id && p.view === "questions"
                                ? { id: null, view: null }
                                : { id: exam.id, view: "questions" },
                            )
                          }
                          title="Questions"
                        >
                          <HelpCircle size={14} />
                        </button>
                        {exam.status === "DRAFT" && (
                          <button
                            className={cn(iconBtn, "text-emerald-500 disabled:opacity-50")}
                            onClick={() => publishExam(exam.id)}
                            title="Publish exam"
                            disabled={publishingExamId === exam.id}
                          >
                            {publishingExamId === exam.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <SendHorizontal size={14} />
                            )}
                          </button>
                        )}
                        <button
                          className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                          onClick={() => handleExamDelete(exam.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inline modals: Detail */}
      {openInline.id && openInline.view === "detail" && (
        <ModalShell onClose={() => setOpenInline({ id: null, view: null })}>
          <div className="p-6">
            <ExamDetail id={openInline.id!} />
          </div>
        </ModalShell>
      )}

      {/* Inline modals: Stats */}
      {openInline.id && openInline.view === "stats" && (
        <ModalShell onClose={() => setOpenInline({ id: null, view: null })}>
          <div className="p-6">
            <ExamStats id={openInline.id!} />
          </div>
        </ModalShell>
      )}

      {/* Inline modals: Questions */}
      {openInline.id && openInline.view === "questions" && (
        <ModalShell onClose={() => setOpenInline({ id: null, view: null })}>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900">
                Questions for {exams.find((e) => e.id === openInline.id!)?.title}
              </h3>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setOpenQuestionForm(true);
                }}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-1.5 mr-8"
              >
                <Plus size={15} /> Add Question
              </button>
            </div>

            {loadingQuestions ? (
              <Loader message="Loading questions…" />
            ) : questions.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">
                No questions found for this exam.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                          Question
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                          Marks
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((q) => (
                        <tr
                          key={q.id}
                          className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                            <div className="truncate">{q.text}</div>
                            {q.questionType === "SUBJECTIVE" && q.markingScheme && (
                              <div className="text-[10px] text-gray-400 mt-0.5 italic">
                                Rubric: {q.markingScheme.substring(0, 50)}…
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                q.questionType === "MCQ"
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-emerald-50 text-emerald-600",
                              )}
                            >
                              {q.questionType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {q.maxMarks || q.marks}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button
                                className={iconBtn}
                                onClick={() => {
                                  setEditingQuestion(q);
                                  setOpenQuestionForm(true);
                                }}
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                                onClick={() => handleQuestionDelete(q.id)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* Pending evaluations */}
      {pendingEvaluations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2.5 rounded-xl">
              <ClipboardList className="h-5 w-5 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Pending Evaluations</h3>
          </div>
          {loadingEvaluations ? (
            <Loader message="Loading…" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80">
                      {["Exam Title", "Student", "Submitted", "Actions"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEvaluations.map((ev) => (
                      <tr
                        key={ev.id}
                        className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {ev.exam.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{ev.user.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(ev.completedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => sendResultsForExam(ev.exam.id)}
                            disabled={isSendingResults === ev.exam.id}
                            className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                          >
                            {isSendingResults === ev.exam.id ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                Sending…
                              </>
                            ) : (
                              <>
                                <Mail size={12} />
                                Send Scores
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* External modals */}
      {openExamForm && (
        <ExamForm
          open={openExamForm}
          onClose={() => setOpenExamForm(false)}
          exam={editingExam}
          onSuccess={fetchExams}
        />
      )}
      {openBulk && selectedExamId && (
        <BulkUpload
          open={openBulk}
          onClose={() => setOpenBulk(false)}
          examId={selectedExamId}
          onSuccess={fetchExams}
        />
      )}
      {openQuestionForm && openInline.id && openInline.view === "questions" && (
        <QuestionForm
          open={openQuestionForm}
          onClose={() => setOpenQuestionForm(false)}
          examId={openInline.id}
          question={editingQuestion ?? undefined}
          onSuccess={() => fetchQuestions(openInline.id!)}
        />
      )}
      {openScoresModal && (
        <ModalShell onClose={() => setOpenScoresModal(false)} width="max-w-5xl">
          <div className="p-6">
            <AllExamScores />
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default ManageExams;
