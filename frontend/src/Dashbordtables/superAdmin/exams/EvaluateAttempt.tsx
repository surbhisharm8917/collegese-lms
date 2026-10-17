/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import Loader from "@/components/Loader";
import { FileCheck, User, CheckCircle2, MessageSquare, Send } from "lucide-react";

interface Option {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  text: string;
  options?: Option[];
  questionType: "MCQ" | "SUBJECTIVE";
  marks?: number;
  maxMarks?: number;
}

interface Answer {
  id: string;
  questionId: string;
  answerText?: string;
  selectedOptionId?: string;
  obtainedMarks?: number;
}

interface Attempt {
  id: string;
  exam: { title: string };
  user: { name: string; email: string };
  answers: Answer[];
  questions?: Question[];
}

const EvaluateAttempt = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/exams/attempt/${attemptId}`);
      const data: Attempt = {
        ...res.data,
        answers: res.data.answers || [],
        questions: res.data.questions || [],
      };
      setAttempt(data);
    } catch (err) {
      toast.error("Failed to fetch attempt details");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (answerId: string, value: number) => {
    if (!attempt) return;
    setAttempt({
      ...attempt,
      answers: attempt.answers.map((a) => (a.id === answerId ? { ...a, obtainedMarks: value } : a)),
    });
  };

  const submitEvaluation = async () => {
    if (!attempt) return;
    try {
      await api.post(`/exams/attempt/${attemptId}/evaluate`, {
        answers: attempt.answers.map((a) => ({
          id: a.id,
          obtainedMarks: a.obtainedMarks || 0,
        })),
      });
      toast.success("Evaluation submitted");
      navigate("/admin/exams");
    } catch {
      toast.error("Failed to submit evaluation");
    }
  };

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  if (loading) return <Loader message="Loading attempt details\u2026" />;

  if (!attempt)
    return <div className="text-center py-20 text-sm text-gray-400">No attempt found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-50 p-2.5 rounded-xl">
          <FileCheck className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Evaluate Attempt</h1>
          <p className="text-xs text-gray-400">{attempt.exam.title}</p>
        </div>
      </div>

      {/* Student info card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2 rounded-lg">
            <User className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Student
            </p>
            <p className="text-sm font-bold text-gray-900">{attempt.user.name}</p>
            <p className="text-xs text-gray-400">{attempt.user.email}</p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {attempt.questions?.map((q, idx) => {
          const answer = attempt.answers.find((a) => a.questionId === q.id);
          return (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="bg-orange-50 text-orange-500 text-[10px] font-bold w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                    {q.questionType === "MCQ" ? "Multiple Choice" : "Subjective"}
                  </p>
                  <h3 className="text-sm font-medium text-gray-900">{q.text}</h3>
                </div>
              </div>

              {q.questionType === "MCQ" && (
                <div className="ml-9 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Correct:{" "}
                    <span className="font-medium text-emerald-600">
                      {q.options?.find((o) => o.isCorrect)?.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    Selected:{" "}
                    <span
                      className={`font-medium ${
                        q.options?.find((o) => o.id === answer?.selectedOptionId)?.isCorrect
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {q.options?.find((o) => o.id === answer?.selectedOptionId)?.text ||
                        "No answer"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-700">
                    Marks: {answer?.obtainedMarks ?? 0} / {q.marks ?? 0}
                  </p>
                </div>
              )}

              {q.questionType === "SUBJECTIVE" && (
                <div className="ml-9 space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Answer
                    </p>
                    <p className="text-xs text-gray-700 whitespace-pre-line">
                      {answer?.answerText || "No answer provided"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      Marks
                    </label>
                    <input
                      type="number"
                      className="w-20 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                      placeholder="0"
                      value={answer?.obtainedMarks ?? ""}
                      onChange={(e) => handleMarkChange(answer?.id || "", Number(e.target.value))}
                    />
                    <span className="text-xs text-gray-400">/ {q.maxMarks ?? 0}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={submitEvaluation}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          <Send className="w-3.5 h-3.5" /> Submit Evaluation
        </button>
      </div>
    </div>
  );
};

export default EvaluateAttempt;
