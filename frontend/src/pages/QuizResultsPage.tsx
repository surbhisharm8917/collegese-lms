import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import axios from "axios";
import Loader from "@/components/Loader";
import { Trophy, CheckCircle2, XCircle, AlertCircle, BarChart3 } from "lucide-react";

interface QuizResponse {
  questionText: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface Result {
  quizTitle: string;
  status: string;
  score: number | null;
  totalMarks: number | null;
  responses?: QuizResponse[] | null;
}

const QuizResultsPage = () => {
  const { submissionId } = useParams();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/quizzes/student/submissions/${submissionId}/result`);
        const resultData = response.data.result;
        if (resultData && resultData.totalMarks === null && resultData.responses?.length) {
          resultData.totalMarks = resultData.responses.length;
        }
        setResult(resultData);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || "Failed to load quiz results.");
        } else {
          setError("An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };
    if (submissionId) fetchResult();
  }, [submissionId]);

  if (loading) return <Loader message="Loading results…" />;

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-sm text-red-600 font-medium">{error}</p>
      </div>
    );

  if (!result)
    return (
      <div className="text-center py-20 text-sm text-gray-400">
        No results found for this submission.
      </div>
    );

  const percentage =
    result.score !== null && result.totalMarks
      ? Math.round((result.score / result.totalMarks) * 100)
      : null;
  const isPass = percentage !== null && percentage >= 50;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-50 p-2.5 rounded-xl">
          <Trophy className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quiz Results</h1>
          <p className="text-xs text-gray-400">{result.quizTitle}</p>
        </div>
      </div>

      {/* Score card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Status
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                result.status === "COMPLETED"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  result.status === "COMPLETED" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {result.status}
            </span>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Your Score
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {result.score !== null ? result.score : "—"}
              <span className="text-base font-normal text-gray-400">
                /{result.totalMarks || "?"}
              </span>
            </p>
          </div>
          {percentage !== null && (
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                Percentage
              </p>
              <p className={`text-3xl font-bold ${isPass ? "text-emerald-600" : "text-red-500"}`}>
                {percentage}%
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {percentage !== null && (
          <div className="mt-5">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isPass ? "bg-emerald-500" : "bg-red-400"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Question details */}
      {result.responses && result.responses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900">Question Details</h2>
          </div>
          {result.responses.map((response, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl border p-5 transition-all ${
                response.isCorrect ? "border-emerald-100" : "border-red-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${response.isCorrect ? "bg-emerald-50" : "bg-red-50"}`}
                >
                  {response.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {index + 1}. {response.questionText}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                        Your Answer
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          response.isCorrect ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {response.yourAnswer || "Not answered"}
                      </p>
                    </div>
                    {!response.isCorrect && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                          Correct Answer
                        </p>
                        <p className="text-sm font-medium text-emerald-600">
                          {response.correctAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.responses === null && (
        <div className="bg-orange-50 rounded-2xl border border-orange-100 p-5 text-sm text-orange-700">
          Detailed answers are not available at this time.
        </div>
      )}
    </div>
  );
};

export default QuizResultsPage;
