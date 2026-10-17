import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import {
  Video,
  List,
  LayoutGrid,
  BookOpen,
  User,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Loader from "@/components/Loader";

interface Course {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

interface Teacher {
  id: string;
  name: string;
  profilePic?: string;
}

interface Lecture {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  course?: Course;
  teacher?: Teacher;
  isActive?: boolean;
  status?: string;
}

type Status = "upcoming" | "ongoing" | "ended";

const statusStyles: Record<Status, string> = {
  upcoming: "bg-blue-50 text-blue-600",
  ongoing: "bg-emerald-50 text-emerald-600",
  ended: "bg-gray-100 text-gray-500",
};

const statusDot: Record<Status, string> = {
  upcoming: "bg-blue-500",
  ongoing: "bg-emerald-500",
  ended: "bg-gray-400",
};

const StudentLiveLecturesPage: React.FC = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const navigate = useNavigate();

  const totalPages = Math.ceil(lectures.length / itemsPerPage);
  const paginatedLectures = lectures.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    const fetchLectures = async () => {
      try {
        const res = await api.get<{ success: boolean; lectures: Lecture[] }>(
          "/live-lectures/student-live-lectures",
        );
        setLectures(
          res.data.lectures.sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          ),
        );
      } catch {
        setError("Failed to load live lectures. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };
    fetchLectures();
    // Refetch periodically so lectures that go LIVE appear without a manual reload.
    const refetch = setInterval(fetchLectures, 15000);
    const interval = setInterval(() => setLectures((prev) => [...prev]), 5000);
    return () => {
      clearInterval(interval);
      clearInterval(refetch);
    };
  }, []);

  const handleJoinLecture = (lectureId: string) => {
    navigate(`/live-classroom/${lectureId}`);
  };

  const getStatus = (lec: Lecture): Status => {
    // Persisted live state takes priority over the scheduled time window.
    if (lec.status === "LIVE") return "ongoing";
    if (lec.status === "ENDED") return "ended";
    return "upcoming";
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) return <Loader message="Loading live lectures…" />;

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-sm text-red-600 font-medium">{error}</p>
      </div>
    );

  if (lectures.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Video className="w-10 h-10 text-gray-200" />
        <p className="text-sm text-gray-400">No live lectures scheduled at this time.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2.5 rounded-xl">
            <Video className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Live Lectures</h1>
            <p className="text-xs text-gray-400">
              {lectures.length} lecture{lectures.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setView((v) => (v === "table" ? "grid" : "table"))}
          className="p-2 rounded-xl border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-all"
        >
          {view === "table" ? (
            <LayoutGrid className="w-4 h-4 text-gray-500" />
          ) : (
            <List className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Grid view */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedLectures.map((lec) => {
            const status = getStatus(lec);
            const isOngoing = status === "ongoing";
            return (
              <div
                key={lec.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all"
              >
                {lec.course?.thumbnailUrl && (
                  <img
                    src={lec.course.thumbnailUrl}
                    alt={lec.course.title}
                    className="w-full h-36 object-cover"
                  />
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{lec.title}</h3>
                    <span
                      className={`inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest ${statusStyles[status]}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`} />
                      {status}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {lec.course && (
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">{lec.course.title}</span>
                      </div>
                    )}
                    {lec.teacher && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{lec.teacher.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {fmt(lec.startTime)} — {fmt(lec.endTime)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinLecture(lec.id)}
                    disabled={!isOngoing}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isOngoing
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isOngoing ? "Join Now" : status === "upcoming" ? "Not Started" : "Ended"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["", "Title", "Course", "Teacher", "Start", "End", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-3 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedLectures.map((lec) => {
                  const status = getStatus(lec);
                  const isOngoing = status === "ongoing";
                  return (
                    <tr
                      key={lec.id}
                      className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {lec.course?.thumbnailUrl ? (
                          <img
                            src={lec.course.thumbnailUrl}
                            alt=""
                            className="w-14 h-10 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-14 h-10 bg-gray-100 rounded-lg" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{lec.title}</td>
                      <td className="px-4 py-3 text-gray-500">{lec.course?.title || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{lec.teacher?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {fmt(lec.startTime)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {fmt(lec.endTime)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest ${statusStyles[status]}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`} />
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleJoinLecture(lec.id)}
                          disabled={!isOngoing}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isOngoing
                              ? "bg-orange-500 text-white hover:bg-orange-600"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {isOngoing ? "Join" : "Closed"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                p === page
                  ? "bg-orange-500 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-orange-50"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentLiveLecturesPage;
