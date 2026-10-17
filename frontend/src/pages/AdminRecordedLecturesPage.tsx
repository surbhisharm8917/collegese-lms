import { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { Film, Loader2, Play, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/useUser";
import api from "@/lib/api";

type Lecture = {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  order: number | null;
  createdAt: string;
  uploader: { id: string; name: string; email: string; role: string } | null;
  course: { id: string; title: string; category: string | null };
  subject: { id: string; title: string } | null;
  chapter: { id: string; title: string; order: number } | null;
};

type LecturesResponse = { success: boolean; lectures: Lecture[] };
type SignedUrlResponse = { signedUrl: string };

const errorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<{ message?: string; error?: string }>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
};

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds < 1) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const AdminRecordedLecturesPage = () => {
  const { role, isLoading: isUserLoading } = useUser();
  const canView = role === "ADMIN" || role === "SUPER_ADMIN";
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState("ALL");
  const [subjectId, setSubjectId] = useState("ALL");
  const [chapterId, setChapterId] = useState("ALL");
  const [serialOrder, setSerialOrder] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [watchingId, setWatchingId] = useState("");

  const fetchLectures = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get<LecturesResponse>("/reclec/admin/lectures");
      setLectures(data.lectures || []);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to load recorded lectures."));
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (isUserLoading) return;
    const initialFetch = window.setTimeout(() => void fetchLectures(), 0);
    return () => window.clearTimeout(initialFetch);
  }, [fetchLectures, isUserLoading]);

  const courses = useMemo(
    () =>
      Array.from(
        new Map(lectures.map((lecture) => [lecture.course.id, lecture.course])).values(),
      ).sort((a, b) => a.title.localeCompare(b.title)),
    [lectures],
  );
  const subjects = useMemo(
    () =>
      Array.from(
        new Map(
          lectures
            .filter((lecture) => lecture.subject)
            .map((lecture) => [lecture.subject!.id, lecture.subject!]),
        ).values(),
      ).sort((a, b) => a.title.localeCompare(b.title)),
    [lectures],
  );
  const chapters = useMemo(
    () =>
      Array.from(
        new Map(
          lectures
            .filter((lecture) => lecture.chapter)
            .map((lecture) => [lecture.chapter!.id, lecture.chapter!]),
        ).values(),
      ).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    [lectures],
  );

  const filteredLectures = useMemo(() => {
    const term = search.trim().toLowerCase();
    return lectures
      .filter((lecture) => courseId === "ALL" || lecture.course.id === courseId)
      .filter((lecture) => subjectId === "ALL" || lecture.subject?.id === subjectId)
      .filter((lecture) => chapterId === "ALL" || lecture.chapter?.id === chapterId)
      .filter((lecture) => serialOrder === "" || lecture.order === Number(serialOrder))
      .filter(
        (lecture) =>
          !term ||
          lecture.title.toLowerCase().includes(term) ||
          (lecture.description || "").toLowerCase().includes(term) ||
          lecture.id.toLowerCase().includes(term) ||
          lecture.uploader?.name.toLowerCase().includes(term) ||
          lecture.uploader?.email.toLowerCase().includes(term),
      )
      .sort(
        (a, b) =>
          a.course.title.localeCompare(b.course.title) ||
          (a.subject?.title || "").localeCompare(b.subject?.title || "") ||
          (a.chapter?.order ?? Number.MAX_SAFE_INTEGER) -
            (b.chapter?.order ?? Number.MAX_SAFE_INTEGER) ||
          (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
      );
  }, [chapterId, courseId, lectures, search, serialOrder, subjectId]);

  const watchLecture = async (lecture: Lecture) => {
    setWatchingId(lecture.id);
    try {
      const { data } = await api.get<SignedUrlResponse>(
        `/reclec/lectures/${encodeURIComponent(lecture.id)}/signed-url`,
      );
      if (!data.signedUrl) throw new Error("A playback URL was not returned.");
      setSelectedLecture(lecture);
      setSignedUrl(data.signedUrl);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to start lecture playback."));
    } finally {
      setWatchingId("");
    }
  };

  const closePlayer = () => {
    setSelectedLecture(null);
    setSignedUrl("");
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" /> Checking access
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="m-4 rounded-2xl border border-red-100 bg-red-50 p-8 text-center sm:m-6">
        <h1 className="text-xl font-bold text-red-800">Access denied</h1>
        <p className="mt-2 text-sm text-red-600">
          Recorded lecture administration is available only to administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">
            Learning library
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Recorded Lectures</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review lecture metadata and request secure playback only when needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLectures()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search lectures</span>
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, ID, or uploader"
            className="pl-9"
          />
        </label>
        <label>
          <span className="sr-only">Filter by course</span>
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="ALL">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by subject</span>
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="ALL">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by chapter</span>
          <select
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="ALL">All chapters</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.order}. {chapter.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by serial order</span>
          <Input
            type="number"
            min={0}
            step={1}
            value={serialOrder}
            onChange={(event) => setSerialOrder(event.target.value)}
            placeholder="Serial order"
          />
        </label>
      </section>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" /> Loading lectures
        </div>
      ) : filteredLectures.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500">
          <Film className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm">No recorded lectures match these filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Serial</th>
                  <th className="px-4 py-3">Lecture</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Chapter</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Uploader</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Playback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLectures.map((lecture) => (
                  <tr key={lecture.id} className="align-top text-slate-600 hover:bg-orange-50/30">
                    <td className="px-4 py-4 font-bold text-slate-900">{lecture.order ?? "—"}</td>
                    <td className="max-w-sm px-4 py-4">
                      <p className="font-semibold text-slate-900">{lecture.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5">
                        {lecture.description || "No description"}
                      </p>
                      <code className="mt-2 block text-[11px] text-slate-400">{lecture.id}</code>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{lecture.course.title}</p>
                      <p className="text-xs">{lecture.course.category}</p>
                      <code className="mt-1 block text-[11px] text-slate-400">
                        {lecture.course.id}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      {lecture.subject ? (
                        <>
                          <p className="font-medium text-slate-900">{lecture.subject.title}</p>
                          <code className="text-[11px] text-slate-400">{lecture.subject.id}</code>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {lecture.chapter ? (
                        <>
                          <p className="font-medium text-slate-900">
                            {lecture.chapter.order}. {lecture.chapter.title}
                          </p>
                          <code className="text-[11px] text-slate-400">{lecture.chapter.id}</code>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {formatDuration(lecture.duration)}
                    </td>
                    <td className="px-4 py-4">
                      {lecture.uploader ? (
                        <>
                          <p className="font-medium text-slate-900">{lecture.uploader.name}</p>
                          <p className="text-xs">{lecture.uploader.email}</p>
                          <p className="text-xs font-semibold text-orange-600">
                            {lecture.uploader.role}
                          </p>
                          <code className="text-[11px] text-slate-400">{lecture.uploader.id}</code>
                        </>
                      ) : (
                        "Uploader unavailable"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs">
                      {new Date(lecture.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => void watchLecture(lecture)}
                        disabled={watchingId === lecture.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#072A60] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {watchingId === lecture.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Watch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Showing {filteredLectures.length} of {lectures.length} lectures in serial order.
          </p>
        </div>
      )}

      <Dialog
        open={Boolean(selectedLecture && signedUrl)}
        onOpenChange={(open) => !open && closePlayer()}
      >
        <DialogContent className="w-[95vw] max-w-5xl overflow-hidden bg-black p-0 text-white">
          <DialogHeader className="bg-slate-950 px-6 py-4 pr-12">
            <DialogTitle>{selectedLecture?.title || "Recorded lecture"}</DialogTitle>
            {selectedLecture && (
              <p className="text-xs text-slate-400">
                {selectedLecture.course.title}
                {selectedLecture.subject ? ` · ${selectedLecture.subject.title}` : ""}
                {selectedLecture.chapter ? ` · ${selectedLecture.chapter.title}` : ""}
              </p>
            )}
          </DialogHeader>
          {signedUrl && (
            <video
              key={signedUrl}
              src={signedUrl}
              controls
              controlsList="nodownload"
              autoPlay
              className="max-h-[75vh] w-full bg-black"
            >
              Your browser does not support HTML video playback.
            </video>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecordedLecturesPage;
