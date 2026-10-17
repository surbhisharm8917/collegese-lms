import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FaUserGraduate } from "react-icons/fa";

interface Passer {
  userId: string;
  name: string;
  score: number;
}

interface ExamStatsData {
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  averageScore: number;
}

interface ExamStatsProps {
  id: string;
}

const ExamStats: React.FC<ExamStatsProps> = ({ id }) => {
  const [stats, setStats] = useState<ExamStatsData | null>(null);
  const [passers, setPassers] = useState<Passer[]>([]);
  const [failedStudents, setFailedStudents] = useState<Passer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, passersRes, failedRes] = await Promise.all([
          axios.get(`/api/v1/exams/${id}/stats`),
          axios.get(`/api/v1/exams/${id}/passed-users`),
          axios.get(`/api/v1/exams/${id}/failed-users`),
        ]);
        setStats(statsRes.data);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedPassers = passersRes.data.map((attempt: any) => ({
          userId: attempt.userId,
          name: attempt.user.name,
          score: attempt.score,
        }));
        setPassers(formattedPassers);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedFailed = failedRes.data.map((attempt: any) => ({
          userId: attempt.userId,
          name: attempt.user.name,
          score: attempt.score,
        }));
        setFailedStudents(formattedFailed);
      } catch (err) {
        toast.error("Failed to fetch exam statistics.");
        console.error("Error fetching exam stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [id]);

  if (loading)
    return (
      <div className="p-6 bg-white shadow-md rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 w-1/3 mb-4 rounded"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );

  if (!stats) return <p>No stats available.</p>;

  const passFailData = [
    { name: "Passed", count: stats.passedCount, fill: "#16a34a" },
    { name: "Failed", count: stats.failedCount, fill: "#dc2626" },
  ];

  return (
    <div className="p-4 md:p-6 bg-white shadow-lg rounded-2xl">
      <h2 className="text-lg md:text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        📊 Exam Statistics
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-blue-50 rounded-xl shadow hover:shadow-md transition">
          <p className="text-sm text-gray-500">Total Attempts</p>
          <p className="text-lg md:text-xl font-bold text-blue-700">{stats.totalAttempts}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-xl shadow hover:shadow-md transition">
          <p className="text-sm text-gray-500">Passed</p>
          <p className="text-lg md:text-xl font-bold text-green-700">{stats.passedCount}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-xl shadow hover:shadow-md transition">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-lg md:text-xl font-bold text-red-700">{stats.failedCount}</p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-xl shadow hover:shadow-md transition">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="text-lg md:text-xl font-bold text-yellow-700">
            {stats.averageScore.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl shadow hover:shadow-md transition col-span-2 md:col-span-1">
          <p className="text-sm text-gray-500">Pass Rate</p>
          <p className="text-lg md:text-xl font-bold text-purple-700">
            {stats.passRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <h3 className="text-md md:text-lg font-semibold mb-3 text-gray-800">
        Pass/Fail Distribution
      </h3>
      <div className="w-full h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={passFailData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count">
              {passFailData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Passed Students */}
      <div className="mt-8">
        <h3 className="text-md md:text-lg font-semibold flex items-center gap-2 mb-3 text-green-700">
          <FaUserGraduate /> Passed Students ({passers.length})
        </h3>
        {passers.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-64 md:max-h-80 overflow-y-auto rounded-lg border">
            {passers.map((passer) => (
              <li
                key={passer.userId}
                className="p-3 flex justify-between items-center hover:bg-green-50 transition"
              >
                <span className="font-medium text-gray-700">{passer.name}</span>
                <span className="font-bold text-green-600">{passer.score}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No students have passed this exam yet.</p>
        )}
      </div>

      {/* Failed Students */}
      <div className="mt-8">
        <h3 className="text-md md:text-lg font-semibold flex items-center gap-2 mb-3 text-red-700">
          <FaUserGraduate /> Failed Students ({failedStudents.length})
        </h3>
        {failedStudents.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-64 md:max-h-80 overflow-y-auto rounded-lg border">
            {failedStudents.map((failer) => (
              <li
                key={failer.userId}
                className="p-3 flex justify-between items-center hover:bg-red-50 transition"
              >
                <span className="font-medium text-gray-700">{failer.name}</span>
                <span className="font-bold text-red-600">{failer.score}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No students have failed this exam yet.</p>
        )}
      </div>
    </div>
  );
};

export default ExamStats;
