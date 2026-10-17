import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TakeExam from "./TakeExam";
import { LayoutGrid, List, Play } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMins: number;
  totalMarks: number;
  passingMarks: number;
  course: {
    title: string;
    thumbnailUrl?: string;
  };
  maxAttempts: number;
  attempts: { id: string; status: string; attemptNumber: number }[];
}

const AvailableExams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await axios.get("/api/v1/exams");
        setExams(res.data);
      } catch {
        toast.error("Failed to fetch available exams.");
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const handleStartExam = (examId: string) => {
    setActiveExamId(examId);
  };

  const handleExamEnd = (examId: string) => {
    setExams((current) =>
      current.map((exam) =>
        exam.id === examId
          ? {
              ...exam,
              attempts: [
                ...(exam.attempts || []),
                { id: `completed-${Date.now()}`, status: "COMPLETED", attemptNumber: 1 },
              ],
            }
          : exam,
      ),
    );
    setActiveExamId(null);
  };

  if (activeExamId) {
    return <TakeExam examId={activeExamId} onExamEnd={() => handleExamEnd(activeExamId)} />;
  }

  if (loading) {
    return <p className="text-center text-gray-500 mt-10">Loading available exams...</p>;
  }

  if (exams.length === 0) {
    return <p className="text-center text-gray-500 mt-10">No exams are currently available.</p>;
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-black">Available Exams</h2>
        <div className="flex gap-2 self-end sm:self-auto">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={viewMode === "table" ? "Switch to Grid View" : "Switch to Table View"}
            onClick={() => setViewMode((v) => (v === "table" ? "grid" : "table"))}
            className="rounded-full border-2 border-white text-black bg-white
                        hover:bg-orange-500 hover:text-white transition shadow-sm"
          >
            {viewMode === "table" ? <LayoutGrid size={24} /> : <List size={24} />}
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const attempted = (exam.attempts?.length || 0) >= exam.maxAttempts;
            return (
              <Card key={exam.id} className="border-gray-300 rounded-xl shadow-sm flex flex-col">
                <CardHeader>
                  <CardTitle className="text-black text-sm sm:text-lg">{exam.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {exam.course.thumbnailUrl && (
                    <img
                      src={exam.course.thumbnailUrl}
                      alt={exam.course.title}
                      className="w-full h-32 sm:h-40 object-cover rounded-xl mb-3"
                    />
                  )}
                  <p className="text-sm text-gray-600 mb-2">Course: {exam.course.title}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-4">
                    Duration: {exam.durationMins} mins | Total Marks: {exam.totalMarks} | Passing
                    Marks: {exam.passingMarks}
                  </p>
                  <div className="mt-auto">
                    {attempted ? (
                      <p className="text-red-600 font-medium text-sm">Already attempted</p>
                    ) : (
                      <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white w-full"
                        onClick={() => handleStartExam(exam.id)}
                      >
                        <Play className="mr-2 h-4 w-4" /> Start Exam
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm sm:text-base">
            <thead className="bg-orange-500 text-white">
              <tr>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Thumbnail</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Title</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Course</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Duration</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Total Marks</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">
                  Passing Marks
                </th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Action</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => {
                const attempted = (exam.attempts?.length || 0) >= exam.maxAttempts;
                return (
                  <tr key={exam.id} className="border-b">
                    <td className="px-3 sm:px-4 py-2">
                      {exam.course.thumbnailUrl ? (
                        <img
                          src={exam.course.thumbnailUrl}
                          alt={exam.course.title}
                          className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded"
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">{exam.title}</td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">
                      {exam.course.title}
                    </td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">
                      {exam.durationMins} mins
                    </td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">{exam.totalMarks}</td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">
                      {exam.passingMarks}
                    </td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">
                      {attempted ? (
                        <span className="text-red-600 font-medium text-sm">Already attempted</span>
                      ) : (
                        <Button
                          className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
                          onClick={() => handleStartExam(exam.id)}
                        >
                          <Play className="mr-1 h-4 w-4" /> Start
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AvailableExams;
