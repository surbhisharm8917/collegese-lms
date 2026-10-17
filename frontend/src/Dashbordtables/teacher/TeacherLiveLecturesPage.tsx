import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, BookOpen, CalendarClock, Play, Radio, RefreshCw, Video } from "lucide-react";
import api from "@/lib/api";
import { useUser } from "@/context/useUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/Loader";
import { cn } from "@/lib/utils";

interface Lecture {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  course?: { id: string; title: string } | null;
}

const statusStyle: Record<Lecture["status"], string> = {
  SCHEDULED: "border-blue-200 bg-blue-50 text-blue-700",
  LIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ENDED: "border-gray-200 bg-gray-100 text-gray-600",
};

const TeacherLiveLecturesPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLectures = useCallback(
    async (background = false) => {
      if (!user?.id) return;
      if (background) setRefreshing(true);
      try {
        const response = await api.get<{ lectures: Lecture[] }>(
          `/live-lectures/teacher/${user.id}`,
        );
        setLectures(response.data.lectures ?? []);
        setError(null);
      } catch {
        setError("We could not load your scheduled live classes.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void fetchLectures();
    const interval = window.setInterval(() => void fetchLectures(true), 20_000);
    return () => window.clearInterval(interval);
  }, [fetchLectures]);

  const orderedLectures = useMemo(
    () =>
      [...lectures].sort((a, b) => {
        const rank = { LIVE: 0, SCHEDULED: 1, ENDED: 2 };
        return rank[a.status] - rank[b.status] || Date.parse(a.startTime) - Date.parse(b.startTime);
      }),
    [lectures],
  );

  const openClassroom = async (lecture: Lecture) => {
    setStartingId(lecture.id);
    setError(null);
    try {
      if (lecture.status === "SCHEDULED") {
        await api.post(`/live-lectures/start/${lecture.id}`);
      }
      navigate(`/live-classroom/${lecture.id}`);
    } catch (requestError) {
      const message =
        requestError && typeof requestError === "object" && "response" in requestError
          ? ((requestError as { response?: { data?: { message?: string } } }).response?.data
              ?.message ?? "The classroom could not be started.")
          : "The classroom could not be started.";
      setError(message);
      setStartingId(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-orange-600">
            <Radio className="h-4 w-4" /> Faculty studio
          </div>
          <h1 className="text-2xl font-bold text-gray-950">Live classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Start a scheduled class or re-enter a session already in progress.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchLectures(true)} disabled={refreshing}>
          <RefreshCw className={cn(refreshing && "animate-spin")} /> Refresh
        </Button>
      </header>

      {error && (
        <div
          className="flex items-start gap-3 border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {orderedLectures.length === 0 ? (
        <section className="grid min-h-72 place-items-center border border-dashed border-gray-300 bg-white p-8 text-center">
          <div>
            <CalendarClock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <h2 className="font-semibold text-gray-800">No classes scheduled</h2>
            <p className="mt-1 text-sm text-gray-500">
              An administrator can schedule a class and assign it to you.
            </p>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {orderedLectures.map((lecture) => (
            <article
              key={lecture.id}
              className={cn(
                "flex min-h-64 flex-col border bg-white p-5 shadow-sm",
                lecture.status === "LIVE" ? "border-emerald-300" : "border-gray-200",
                lecture.status === "ENDED" && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#071b3f] text-white">
                  {lecture.status === "LIVE" ? (
                    <Radio className="h-5 w-5" />
                  ) : (
                    <Video className="h-5 w-5" />
                  )}
                </span>
                <Badge variant="outline" className={statusStyle[lecture.status]}>
                  {lecture.status === "LIVE" ? "Live now" : lecture.status.toLowerCase()}
                </Badge>
              </div>

              <h2 className="mt-5 line-clamp-2 text-lg font-semibold text-gray-950">
                {lecture.title}
              </h2>
              <div className="mt-3 space-y-2 text-sm text-gray-500">
                <p className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-orange-500" />
                  <span className="truncate">{lecture.course?.title ?? "Course"}</span>
                </p>
                <p className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-600" />
                  <span>{new Date(lecture.startTime).toLocaleString()}</span>
                </p>
              </div>

              <div className="mt-auto pt-5">
                <Button
                  className={cn(
                    "w-full",
                    lecture.status === "LIVE"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-orange-600 text-white hover:bg-orange-700",
                  )}
                  disabled={lecture.status === "ENDED" || startingId === lecture.id}
                  onClick={() => void openClassroom(lecture)}
                >
                  <Play />
                  {startingId === lecture.id
                    ? "Opening classroom..."
                    : lecture.status === "LIVE"
                      ? "Re-enter live class"
                      : lecture.status === "ENDED"
                        ? "Class ended"
                        : "Start live class"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherLiveLecturesPage;
