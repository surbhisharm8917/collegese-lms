import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ExamScore {
  id: string;
  examId: string;
  userId: string;
  score: number;
  isPassed: boolean;
  completedAt: string;
  videoRecordingKey?: string;
  exam: {
    id: string;
    title: string;
    totalMarks: number;
    course?: {
      id: string;
      title: string;
    };
  };
  user: {
    id: string;
    name: string;
    email: string;
    learnerId?: string;
    year?: number;
    department?: string;
  };
}

const AllExamScores: React.FC = () => {
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [filteredScores, setFilteredScores] = useState<ExamScore[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const fetchScores = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/superadmin/exams/scores", {
        withCredentials: true,
      });

      setScores(res.data.scores);
      setFilteredScores(res.data.scores);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load scores");
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoUrl = async (videoRecordingKey: string) => {
    try {
      const res = await axios.get("/api/v1/exams/recordings/presigned-url", {
        params: { key: videoRecordingKey },
        withCredentials: true,
      });
      return res.data.presignedUrl;
    } catch (err) {
      console.error("Failed to get presigned URL:", err);
      toast.error("Failed to load video recording");
      return null;
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  useEffect(() => {
    let result = scores;

    if (search.trim()) {
      result = result.filter(
        (s) =>
          s.user.name.toLowerCase().includes(search.toLowerCase()) ||
          s.user.email.toLowerCase().includes(search.toLowerCase()) ||
          s.exam.title.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (courseFilter !== "all") {
      result = result.filter((s) => s.exam.course?.title === courseFilter);
    }

    if (yearFilter !== "all") {
      result = result.filter((s) => String(s.user.year) === yearFilter);
    }

    if (departmentFilter !== "all") {
      result = result.filter((s) => s.user.department === departmentFilter);
    }

    setFilteredScores(result);
  }, [search, courseFilter, yearFilter, departmentFilter, scores]);

  if (loading) return <Loader message="Loading exam scores…" />;

  const uniqueCourses = Array.from(
    new Set(scores.map((s) => s.exam.course?.title).filter(Boolean)),
  );
  const uniqueYears = Array.from(new Set(scores.map((s) => s.user.year).filter(Boolean))).sort();
  const uniqueDepartments = Array.from(
    new Set(scores.map((s) => s.user.department).filter(Boolean)),
  ).sort();

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-orange-200">
        <CardTitle className="text-xl font-bold text-orange-600">
          All Exam Scores ({filteredScores.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            placeholder="Search by name, email, or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {uniqueCourses.map((c) => (
                <SelectItem key={c} value={c!}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {uniqueYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {uniqueDepartments.map((d) => (
                <SelectItem key={d} value={d!}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredScores.length === 0 ? (
          <p className="text-center text-gray-500">No exam scores found</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-orange-200 shadow-md">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-orange-500 text-white">
                <tr>
                  {[
                    "Student Name",
                    "Email",
                    "Just Easy ID",
                    "Year",
                    "Department",
                    "Exam",
                    "Course",
                    "Score",
                    "Total Marks",
                    "Result",
                    "Completed At",
                    "Actions",
                  ].map((head) => (
                    <th key={head} className="px-4 py-2 font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {filteredScores.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`${
                      i % 2 === 0 ? "bg-white" : "bg-orange-50"
                    } hover:bg-orange-100/70 transition`}
                  >
                    <td className="px-4 py-2">{s.user.name}</td>
                    <td className="px-4 py-2">{s.user.email}</td>
                    <td className="px-4 py-2">{s.user.learnerId || "-"}</td>
                    <td className="px-4 py-2">{s.user.year || "-"}</td>
                    <td className="px-4 py-2">{s.user.department || "-"}</td>
                    <td className="px-4 py-2">{s.exam.title}</td>
                    <td className="px-4 py-2">{s.exam.course?.title || "-"}</td>
                    <td className="px-4 py-2 font-semibold text-orange-700">{s.score}</td>
                    <td className="px-4 py-2">{s.exam.totalMarks}</td>
                    <td
                      className={`px-4 py-2 font-semibold ${
                        s.isPassed ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {s.isPassed ? "Passed" : "Failed"}
                    </td>
                    <td className="px-4 py-2">{new Date(s.completedAt).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {s.videoRecordingKey ? (
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={async () => {
                            const url = await fetchVideoUrl(s.videoRecordingKey!);
                            if (url) {
                              window.open(url, "_blank");
                            }
                          }}
                        >
                          View Video
                        </Button>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={fetchScores} className="bg-orange-500 hover:bg-orange-600 text-white">
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AllExamScores;
