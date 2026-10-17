import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

interface QuestionDifficulty {
  questionText: string;
  difficulty: number;
}
interface CohortPerformance {
  cohort: string | null;
  averageScore: number;
  numberOfStudents: number;
}
interface AnalyticsData {
  questionDifficulty: QuestionDifficulty[];
  cohortPerformance: CohortPerformance[];
}

const QuizAnalyticsPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`/api/v1/quizzes/admin/${quizId}/analytics`, {
          withCredentials: true,
        });
        setAnalytics(response.data.analytics);
      } catch (error) {
        toast.error("Failed to load quiz analytics.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [quizId]);

  if (loading)
    return (
      <div className="text-center py-10 text-orange-500 font-semibold">Loading analytics...</div>
    );
  if (!analytics)
    return (
      <div className="text-center py-10 text-red-500 font-semibold">
        Could not load analytics data.
      </div>
    );

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-orange-500">📊 Quiz Analytics</h1>

      {/* Question Difficulty */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Question Difficulty (Incorrect Answer Rate)
        </h2>
        <div className="space-y-5">
          {analytics.questionDifficulty.map((q, index) => (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{q.questionText}</span>
                <span className="text-sm font-medium text-orange-600">
                  {q.difficulty.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-orange-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${q.difficulty}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cohort Performance */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Performance by Cohort (Department)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-orange-500 text-white">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Cohort / Department
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Average Score
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Students Submitted
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.cohortPerformance.map((c, index) => (
                <tr
                  key={index}
                  className={`${
                    index % 2 === 0 ? "bg-white" : "bg-orange-50"
                  } hover:bg-orange-100 transition`}
                >
                  <td className="px-5 py-4 text-sm text-gray-700 font-medium border-b">
                    {c.cohort || "N/A"}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 border-b">
                    {c.averageScore.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 border-b">{c.numberOfStudents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuizAnalyticsPage;
