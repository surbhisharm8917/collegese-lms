import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Loader from "@/components/Loader";
import api from "@/lib/api";
import { AxiosError } from "axios";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: "MCQ" | "TRUE_FALSE" | "SUBJECTIVE";
  options: Option[];
}

interface Answers {
  [questionId: string]: string;
}

const QuizAttemptPage = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { timeLimit, quizId } = (location.state || {}) as { timeLimit?: number; quizId: string };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(-1);
  const [submissionInProgress, setSubmissionInProgress] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (submissionInProgress) return;

    setSubmissionInProgress(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, value]) => {
        const question = questions.find((item) => item.id === questionId);
        return question?.type === "SUBJECTIVE"
          ? { questionId, writtenAnswer: value }
          : { questionId, selectedOptionId: value };
      });

      await api.post(
        `/quizzes/student/submissions/${submissionId}/submit`,
        { answers: formattedAnswers },
        { withCredentials: true },
      );
      navigate(`/dashboard/student/quiz/result/${submissionId}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      console.error("Failed to submit quiz:", axiosError);
      setError(axiosError.response?.data?.message || "Failed to submit quiz.");
      setSubmissionInProgress(false);
    }
  }, [answers, questions, submissionId, navigate, submissionInProgress]);

  useEffect(() => {
    if (!quizId) {
      setError("Quiz ID not found. Please start the quiz again from the list.");
      setLoading(false);
      return;
    }

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/quizzes/student/${quizId}/attempt`, {
          withCredentials: true,
        });
        setQuestions(response.data.questions);

        if (response.data.timeRemainingSeconds !== null) {
          setTimeLeft(response.data.timeRemainingSeconds);
        } else if (timeLimit) {
          setTimeLeft(timeLimit * 60);
        } else {
          setTimeLeft(Number.MAX_SAFE_INTEGER);
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        console.error("Failed to fetch questions:", axiosError);
        setError(axiosError.response?.data?.message || "Failed to load questions.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [quizId, timeLimit]);

  useEffect(() => {
    if (timeLeft < 0) return;
    if (timeLeft === 0) {
      handleSubmit();
      return;
    }
    if (timeLeft === Number.MAX_SAFE_INTEGER) return;

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, handleSubmit]);

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const formatTime = (seconds: number) => {
    if (seconds < 0) return "--:--";
    if (seconds === Number.MAX_SAFE_INTEGER) return "No time limit";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  if (loading) return <Loader message="Loading quiz…" />;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  const isTimeUp = timeLeft === 0;
  const isTimeCritical = timeLeft > 0 && timeLeft < 300;
  const hasTimeLimit = timeLeft !== Number.MAX_SAFE_INTEGER;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quiz Attempt</h1>
        {hasTimeLimit && (
          <div
            className={`px-4 py-2 rounded-lg font-mono text-xl ${
              isTimeCritical ? "bg-red-600 text-white" : "bg-gray-800 text-white"
            }`}
          >
            Time Left: {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {isTimeUp && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p>Time's up! Your quiz has been automatically submitted.</p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
            <p className="text-lg font-semibold mb-2">
              {index + 1}. {q.text}
            </p>
            {q.type === "MCQ" || q.type === "TRUE_FALSE" ? (
              <div className="space-y-2">
                {q.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={option.id}
                      onChange={() => handleAnswerChange(q.id, option.id)}
                      checked={answers[q.id] === option.id}
                      className="h-4 w-4 text-blue-600"
                      disabled={isTimeUp || submissionInProgress}
                    />
                    <span>{option.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full h-24 p-2 border rounded-md mt-2"
                placeholder="Type your answer here..."
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                value={answers[q.id] || ""}
                disabled={isTimeUp || submissionInProgress}
              />
            )}
          </div>
        ))}

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to leave? Your progress will be lost.")) {
                navigate(-1);
              }
            }}
            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            disabled={submissionInProgress}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isTimeUp || submissionInProgress}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {submissionInProgress ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizAttemptPage;
