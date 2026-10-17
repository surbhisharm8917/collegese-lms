import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

interface ExamResultProps {
  attemptId: string;
}

interface Result {
  score: number;
  totalMarks: number;
  isPassed: boolean;
  exam: {
    title: string;
    totalMarks: number;
    passingMarks: number;
  };
}

const ExamResult: React.FC<ExamResultProps> = ({ attemptId }) => {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await axios.get(`/api/v1/exams/attempts/${attemptId}`);
        setResult(res.data);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        toast.error("Failed to fetch exam results.");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [attemptId]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading your exam results...</p>;
  }

  if (!result) {
    return <p className="text-center text-red-500">Could not find exam results.</p>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Exam Result</h2>
      <div className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4">
          {result.isPassed ? (
            <FaCheckCircle className="text-green-500 text-6xl" />
          ) : (
            <FaTimesCircle className="text-red-500 text-6xl" />
          )}
          <h3 className="text-xl font-semibold">
            You {result.isPassed ? "Passed" : "Failed"} the Exam!
          </h3>
          <p className="text-gray-600 text-center">
            You have successfully completed the exam for **{result.exam.title}
            **.
          </p>
          <div className="w-full space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded-md">
              <span className="font-medium">Your Score:</span>
              <span className="text-lg font-bold">
                {result.score} / {result.exam.totalMarks}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded-md">
              <span className="font-medium">Passing Marks:</span>
              <span className="text-lg font-bold">{result.exam.passingMarks}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamResult;
