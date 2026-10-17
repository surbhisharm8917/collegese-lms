import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

interface Attempt {
  id: string;
  exam: {
    title: string;
    totalMarks: number;
  };
  score?: number;
  yourScore?: number;
  isPassed?: boolean;
  evaluationStatus: string;
  startedAt: string;
  completedAt: string;
}

const MyAttempts: React.FC = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const fetchAttempts = async () => {
    try {
      const res = await axios.get("/api/v1/exams/attempts/me");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedAttempts: Attempt[] = res.data.map((attempt: any) => ({
        ...attempt,
        yourScore: attempt.score,
      }));

      setAttempts(mappedAttempts);
    } catch {
      toast.error("Failed to fetch exam attempts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
    const interval = setInterval(fetchAttempts, 5000); // poll every 5 sec
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return <p className="text-center text-gray-500 mt-10">Loading your exam attempts...</p>;

  if (attempts.length === 0)
    return <p className="text-center text-gray-500 mt-10">You have not taken any exams yet.</p>;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-black">My Exam Attempts</h2>
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
          {attempts.map((attempt) => {
            const released = attempt.evaluationStatus === "COMPLETED";
            return (
              <Card key={attempt.id} className="border-gray-300 rounded-xl shadow-sm flex flex-col">
                <CardHeader>
                  <CardTitle className="text-gray-900 text-base sm:text-lg">
                    {attempt.exam.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">
                    Score: {released ? attempt.exam.totalMarks : "Pending"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">
                    Your Score: {released ? (attempt.yourScore ?? "-") : "Pending"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">
                    Completed: {new Date(attempt.completedAt).toLocaleString()}
                  </p>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold self-start mt-auto
                      ${
                        released
                          ? attempt.isPassed
                            ? "bg-green-200 text-green-800"
                            : "bg-red-200 text-red-800"
                          : "bg-yellow-200 text-yellow-800"
                      }`}
                  >
                    {released ? (attempt.isPassed ? "Passed" : "Failed") : "Pending"}
                  </span>
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
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Exam</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Score</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Your Score</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Status</th>
                <th className="px-3 sm:px-4 py-2 text-left border border-gray-200">Completed At</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => {
                const released = attempt.evaluationStatus === "COMPLETED";
                return (
                  <tr key={attempt.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2">{attempt.exam.title}</td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">
                      {released ? attempt.exam.totalMarks : "Pending"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">
                      {released ? (attempt.yourScore ?? "-") : "Pending"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 border border-gray-200">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold
                          ${
                            released
                              ? attempt.isPassed
                                ? "bg-green-200 text-green-800"
                                : "bg-red-200 text-red-800"
                              : "bg-yellow-200 text-yellow-800"
                          }`}
                      >
                        {released ? (attempt.isPassed ? "Passed" : "Failed") : "Pending"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                      {new Date(attempt.completedAt).toLocaleString()}
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

export default MyAttempts;
