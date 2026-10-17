import { useState, useEffect } from "react";
import axios from "axios";

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
}
interface Question {
  id: string;
  text: string;
  marks: number;
  options: Option[];
}
interface QuizDetails {
  title: string;
  description: string;
  course: { title: string };
  createdBy: { name: string; email: string };
  questions: Question[];
}

interface QuizDetailsModalProps {
  quizId: string;
  onClose: () => void;
}

const QuizDetailsModal = ({ quizId, onClose }: QuizDetailsModalProps) => {
  const [quizDetails, setQuizDetails] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.get(`/api/v1/quizzes/admin/${quizId}/details`, {
          withCredentials: true,
        });
        setQuizDetails(response.data.quiz);
      } catch (error) {
        console.error("Failed to fetch quiz details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [quizId]);

  const totalMarks = quizDetails?.questions.reduce((sum, q) => sum + q.marks, 0) || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col border-2 border-orange-500">
        {/* Header */}
        <div className="p-4 border-b border-orange-500 flex justify-between items-center bg-orange-500 text-white rounded-t-lg">
          <h3 className="text-lg font-semibold">Quiz Details</h3>
          <button onClick={onClose} className="text-white text-2xl font-bold hover:text-orange-200">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-gray-800">
          {loading && <p className="text-orange-500">Loading details...</p>}

          {!loading && quizDetails && (
            <>
              <h1 className="text-2xl font-bold text-orange-600">{quizDetails.title}</h1>
              <p className="text-gray-600 mb-4">{quizDetails.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <strong>Course:</strong> {quizDetails.course.title}
                </div>
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <strong>Total Marks:</strong> {totalMarks}
                </div>
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <strong>Created By:</strong> {quizDetails.createdBy.name}
                </div>
              </div>

              <h2 className="text-xl font-semibold text-orange-600 border-t border-orange-200 pt-4">
                Questions ({quizDetails.questions.length})
              </h2>

              <div className="space-y-4 mt-4">
                {quizDetails.questions.map((q, index) => (
                  <div key={q.id}>
                    <p className="font-semibold text-gray-800">
                      {index + 1}. {q.text} ({q.marks} marks)
                    </p>
                    <ul className="list-disc pl-5 mt-1">
                      {q.options.map((opt) => (
                        <li
                          key={opt.id}
                          className={
                            opt.isCorrect ? "text-green-600 font-semibold" : "text-gray-700"
                          }
                        >
                          {opt.text} {opt.isCorrect && "(Correct)"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizDetailsModal;
