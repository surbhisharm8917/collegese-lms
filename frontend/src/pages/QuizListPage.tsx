import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { AxiosError } from "axios";
import Loader from "@/components/Loader";

interface Quiz {
  id: string;
  title: string;
  description: string;
  timeLimit?: number;
}

interface StartQuizResponse {
  submissionId: string;
  timeLimit?: number;
}

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ quizzes: Quiz[] }>("/quizzes/student/available", {
          withCredentials: true,
        });
        setQuizzes(response.data.quizzes);
      } catch (err) {
        console.error("Failed to fetch quizzes:", err);
        setError("Failed to load quizzes. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  const handleStartQuiz = async (quiz: Quiz) => {
    try {
      const response = await api.post<StartQuizResponse>(
        `/quizzes/student/${quiz.id}/start`,
        {},
        { withCredentials: true },
      );
      const { submissionId, timeLimit } = response.data;
      navigate(`/dashboard/student/quiz/attempt/${submissionId}`, {
        state: { timeLimit, quizId: quiz.id },
      });
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      console.error("Failed to start quiz:", error);
      setError(error.response?.data?.message || "Failed to start quiz.");
    }
  };

  if (loading) return <Loader message="Loading quizzes…" />;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Available Quizzes</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2">{quiz.title}</h2>
            <p className="text-gray-600 mb-4">{quiz.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Time Limit: {quiz.timeLimit ?? "N/A"} mins
              </span>
              <button
                onClick={() => handleStartQuiz(quiz)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Start Quiz
              </button>
            </div>
          </div>
        ))}
      </div>
      {quizzes.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-8">No quizzes available.</p>
      )}
    </div>
  );
};

export default QuizListPage;
