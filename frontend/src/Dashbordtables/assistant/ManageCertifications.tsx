import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api";
import axios from "axios";
import { toast } from "sonner";
import {
  Award,
  ShieldCheck,
  Trash2,
  X,
  Eye,
  Users,
  List,
  Plus,
  Download,
  Search,
  BookOpen,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import Loader from "@/components/Loader";
import { cn } from "@/lib/utils";

interface CourseProgress {
  id: string;
  title: string;
  description: string;
  enrollmentId: string;
  progress: number;
  completedLectures: number;
  submittedQuizzes: number;
  totalLectures: number;
  totalQuizzes: number;
  userId: string;
  userName: string;
  userEmail: string;
  certificateUrl?: string;
}
interface CertificateModel {
  id: string;
  title: string;
  certificateUrl: string;
  issuedAt?: string | Date;
  user?: { id: string; name: string; email?: string | null } | null;
  course?: { id: string; title: string } | null;
  issuedBy?: { id: string; name?: string | null; email?: string | null } | null;
}
interface VerifyResponse {
  valid: boolean;
  certificate: CertificateModel;
}
interface GenerateCertificateRequest {
  userId: string;
  courseId: string;
  issuedById?: string;
  issuedBy?: string;
}
type CertMap = Record<string, Record<string, { cert: CertificateModel; presignedUrl?: string }>>;
type ViewMode = "progress" | "all-certificates" | "generate" | "verify-single";

/* ─── Tiny reusables ─── */
const inputCls =
  "block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors";
const iconBtn =
  "p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors";

const StatCard = ({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: React.ElementType;
  color: string;
  value: number;
  label: string;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 p-5 flex items-center gap-4">
    <div className={cn("p-2.5 rounded-xl", `bg-${color}-50`)}>
      <Icon className={cn("h-5 w-5", `text-${color}-500`)} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
    </div>
  </div>
);

const ManageCertifications: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("progress");
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [allCertificates, setAllCertificates] = useState<CertificateModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [revoking, setRevoking] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [certificatesMap, setCertificatesMap] = useState<CertMap>({});
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyData, setVerifyData] = useState<CertificateModel | null>(null);
  const [generateForm, setGenerateForm] = useState({ userId: "", courseId: "", issuedById: "" });
  const [singleVerifyForm, setSingleVerifyForm] = useState({ certificateId: "" });
  const [userCertificates, setUserCertificates] = useState<CertificateModel[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  /* ─── Fetch helpers ─── */
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<CourseProgress[]>("/certificates/all-users/courses-progress");
      setCourses(data);
    } catch {
      setError("Failed to fetch courses.");
      toast.error("Failed to fetch courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllCertificates = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<CertificateModel[]>("/certificates");
      setAllCertificates(data);
    } catch {
      setError("Failed to fetch certificates.");
      toast.error("Failed to fetch certificates.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserCertificates = useCallback(async (userId: string) => {
    if (!userId.trim()) {
      setUserCertificates([]);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get<CertificateModel[]>(`/certificates/user/${userId}`);
      setUserCertificates(data);
    } catch {
      toast.error("Failed to fetch user certificates.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExistingCertificates = useCallback(async (userIds: string[]) => {
    try {
      const results = await Promise.all(
        userIds.map((uid) =>
          api
            .get<CertificateModel[]>(`/certificates/user/${uid}`)
            .then((r) => ({ userId: uid, data: r.data }))
            .catch(() => ({ userId: uid, data: [] as CertificateModel[] })),
        ),
      );
      const nextMap: CertMap = {};
      results.forEach(({ userId, data }) => {
        if (!nextMap[userId]) nextMap[userId] = {};
        data.forEach((cert) => {
          if (cert.course?.id) {
            const cached = localStorage.getItem(`cert-${userId}-${cert.course.id}`);
            nextMap[userId][cert.course.id] = { cert, presignedUrl: cached || undefined };
          }
        });
      });
      setCertificatesMap(nextMap);
    } catch (e) {
      console.error("Failed to fetch existing certificates map", e);
    }
  }, []);

  useEffect(() => {
    setError("");
    if (viewMode === "progress") fetchCourses();
    else if (viewMode === "all-certificates") fetchAllCertificates();
  }, [viewMode, fetchCourses, fetchAllCertificates]);
  useEffect(() => {
    if (!loading && courses.length && viewMode === "progress") {
      fetchExistingCertificates(Array.from(new Set(courses.map((c) => c.userId))));
    }
  }, [loading, courses, viewMode, fetchExistingCertificates]);

  /* ─── Certificate actions ─── */
  const handleGenerateCertificate = async (
    courseId: string,
    userId: string,
    issuedById?: string,
  ) => {
    const uid = `${userId}-${courseId}`;
    setGenerating((p) => new Set(p).add(uid));
    const toastId = toast.loading("Generating certificate…");
    try {
      const payload: GenerateCertificateRequest = { userId, courseId };
      if (issuedById?.trim()) payload.issuedById = issuedById;
      const { data } = await api.post("/certificates/generate", payload);
      const presignedDownloadUrl: string | undefined = data.downloadUrl;
      const certificate: CertificateModel | undefined = data.certificate;
      if (!certificate) throw new Error("Certificate payload missing.");
      if (presignedDownloadUrl)
        localStorage.setItem(
          `cert-${userId}-${certificate.course?.id || ""}`,
          presignedDownloadUrl,
        );
      setCertificatesMap((prev) => {
        const next = new Map(Object.entries(prev));
        if (!next.has(userId)) next.set(userId, {});
        next.get(userId)![courseId] = { cert: certificate, presignedUrl: presignedDownloadUrl };
        return Object.fromEntries(next);
      });
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId && c.userId === userId
            ? { ...c, certificateUrl: presignedDownloadUrl || c.certificateUrl }
            : c,
        ),
      );
      toast.success("Certificate generated!", { id: toastId });
      if (presignedDownloadUrl) {
        const link = document.createElement("a");
        link.href = presignedDownloadUrl;
        link.download = `${certificate.title || "certificate"}.pdf`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setGenerateForm({ userId: "", courseId: "", issuedById: "" });
    } catch (err: unknown) {
      const msg =
        (axios.isAxiosError(err) && err.response?.data?.error) ||
        (err instanceof Error ? err.message : "") ||
        "Generation failed.";
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating((p) => {
        const n = new Set(p);
        n.delete(uid);
        return n;
      });
    }
  };

  const getPresignedOrWarn = async (userId: string, courseId: string): Promise<string | null> => {
    const entry = certificatesMap[userId]?.[courseId];
    if (entry?.presignedUrl) return entry.presignedUrl;
    if (entry?.cert?.id) {
      try {
        const { data } = await api.get(`/certificates/${entry.cert.id}`);
        if (data?.downloadUrl) {
          localStorage.setItem(`cert-${userId}-${courseId}`, data.downloadUrl);
          setCertificatesMap((prev) => {
            const next = { ...prev };
            if (next[userId]?.[courseId])
              next[userId][courseId] = { ...entry, presignedUrl: data.downloadUrl };
            return next;
          });
          return data.downloadUrl;
        }
      } catch {
        /* */
      }
    }
    toast.info("No valid download URL available.");
    return null;
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleDownload = async (courseId: string, userId: string) => {
    const url = await getPresignedOrWarn(userId, courseId);
    if (!url) return;
    downloadFile(
      url,
      certificatesMap[userId]?.[courseId]?.cert?.title?.trim()
        ? `${certificatesMap[userId][courseId].cert.title}.pdf`
        : "certificate.pdf",
    );
  };
  const handleDownloadCertificate = async (cert: CertificateModel) => {
    try {
      const { data } = await api.get(`/certificates/${cert.id}`);
      if (data?.downloadUrl) downloadFile(data.downloadUrl, `${cert.title || "certificate"}.pdf`);
      else toast.info("No download URL available.");
    } catch {
      toast.error("Failed to get download URL.");
    }
  };

  const handleVerify = async (certId: string) => {
    const toastId = toast.loading("Verifying…");
    try {
      const { data } = await api.post<VerifyResponse>(`/certificates/verify/${certId}`);
      toast.dismiss(toastId);
      if (!data?.valid) {
        toast.error("Certificate is invalid or revoked.");
        return;
      }
      setVerifyData(data.certificate);
      setVerifyOpen(true);
    } catch {
      toast.error("Failed to verify certificate.");
    }
  };

  const handleSingleVerify = async () => {
    if (!singleVerifyForm.certificateId.trim()) {
      toast.error("Please enter a certificate ID.");
      return;
    }
    await handleVerify(singleVerifyForm.certificateId);
    setSingleVerifyForm({ certificateId: "" });
  };

  const revokeCertificate = async (certId: string, userId: string, courseId?: string) => {
    if (!window.confirm("Are you sure you want to revoke this certificate?")) return;
    setRevoking((p) => new Set(p).add(certId));
    try {
      await api.delete(`/certificates/${certId}`);
      toast.success("Certificate revoked.");
      setAllCertificates((p) => p.filter((c) => c.id !== certId));
      setUserCertificates((p) => p.filter((c) => c.id !== certId));
      if (userId && courseId) {
        setCertificatesMap((p) => {
          const n = { ...p };
          if (n[userId]?.[courseId]) delete n[userId][courseId];
          return n;
        });
        localStorage.removeItem(`cert-${userId}-${courseId}`);
        setCourses((p) =>
          p.map((c) =>
            c.id === courseId && c.userId === userId ? { ...c, certificateUrl: undefined } : c,
          ),
        );
      }
    } catch {
      toast.error("Failed to revoke certificate.");
    } finally {
      setRevoking((p) => {
        const n = new Set(p);
        n.delete(certId);
        return n;
      });
    }
  };

  /* ─── Derived data ─── */
  const coursesByUser = useMemo(() => {
    const filtered = courses.filter(
      (c) =>
        c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.userEmail.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    return filtered.reduce<Record<string, CourseProgress[]>>((acc, c) => {
      const k = c.userId;
      if (!acc[k]) acc[k] = [];
      acc[k].push(c);
      return acc;
    }, {});
  }, [courses, searchTerm]);

  const filteredCertificates = useMemo(
    () =>
      allCertificates.filter(
        (c) =>
          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.course?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.id.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [allCertificates, searchTerm],
  );
  const filteredUserCertificates = useMemo(
    () =>
      userCertificates.filter(
        (c) =>
          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.course?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.id.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [userCertificates, searchTerm],
  );

  const allFlat = Object.values(coursesByUser).flat();

  if (loading) return <Loader message="Loading…" />;

  const viewModes: { key: ViewMode; icon: React.ElementType; label: string }[] = [
    { key: "progress", icon: Users, label: "Progress" },
    { key: "all-certificates", icon: List, label: "All Certs" },
    { key: "generate", icon: Plus, label: "Generate" },
    { key: "verify-single", icon: ShieldCheck, label: "Verify" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2.5 rounded-xl">
            <Award className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Certificate Management</h2>
            <p className="text-xs text-gray-400">{allCertificates.length} certificates issued</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {viewModes.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5",
                viewMode === key
                  ? "bg-orange-50 text-orange-600 border border-orange-200"
                  : "border border-gray-200 text-gray-500 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600",
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
        <input
          type="text"
          placeholder={
            viewMode === "progress" ? "Search by name or email…" : "Search certificates…"
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* ══════ PROGRESS VIEW ══════ */}
      {viewMode === "progress" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Award}
              color="orange"
              value={allCertificates.length}
              label="Total Certificates"
            />
            <StatCard
              icon={BookOpen}
              color="emerald"
              value={allFlat.filter((c) => c.progress === 100).length}
              label="Completed"
            />
            <StatCard
              icon={Clock}
              color="amber"
              value={allFlat.filter((c) => c.progress > 0 && c.progress < 100).length}
              label="In Progress"
            />
            <StatCard
              icon={XCircle}
              color="gray"
              value={allFlat.filter((c) => c.progress === 0).length}
              label="Not Started"
            />
          </div>

          {/* Course cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allFlat.map((course) => {
              const pct = course.progress;
              const barColor =
                pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : "bg-gray-300";
              const badgeCls =
                pct === 100
                  ? "bg-emerald-50 text-emerald-600"
                  : pct > 0
                    ? "bg-amber-50 text-amber-600"
                    : "bg-gray-100 text-gray-500";
              const badgeText = pct === 100 ? "Completed" : pct > 0 ? "In Progress" : "Not Started";

              return (
                <div
                  key={course.enrollmentId}
                  className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col"
                >
                  <div className="p-5 flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {course.userName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-gray-700 truncate">
                        {course.title}
                      </h4>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          badgeCls,
                        )}
                      >
                        {badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{course.description}</p>
                    {/* Progress bar */}
                    <div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn("h-1.5 rounded-full transition-all duration-500", barColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-400">
                          Lectures {course.completedLectures}/{course.totalLectures} | Quizzes{" "}
                          {course.submittedQuizzes}/{course.totalQuizzes}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500">{pct}%</span>
                      </div>
                    </div>
                  </div>
                  {/* Actions (only for 100% completed) */}
                  {pct === 100 && (
                    <div className="flex gap-1.5 p-4 border-t border-gray-100">
                      {(() => {
                        const entry = certificatesMap[course.userId]?.[course.id];
                        if (entry)
                          return (
                            <>
                              <button
                                onClick={() => handleDownload(course.id, course.userId)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
                              >
                                <Download size={12} />
                                Download
                              </button>
                              <button
                                onClick={() => handleVerify(entry.cert.id)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1"
                              >
                                <ShieldCheck size={12} />
                                Verify
                              </button>
                              <button
                                onClick={() =>
                                  revokeCertificate(entry.cert.id, course.userId, course.id)
                                }
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                Revoke
                              </button>
                            </>
                          );
                        return (
                          <button
                            onClick={() => handleGenerateCertificate(course.id, course.userId)}
                            disabled={generating.has(`${course.userId}-${course.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors flex items-center gap-1.5"
                          >
                            {generating.has(`${course.userId}-${course.id}`) ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                Generating…
                              </>
                            ) : (
                              "Generate"
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════ ALL CERTIFICATES VIEW ══════ */}
      {viewMode === "all-certificates" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">All Certificates</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredCertificates.length} certificates
            </p>
          </div>
          {filteredCertificates.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No certificates found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/80">
                    {["Certificate", "User", "Course", "Issued", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{cert.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{cert.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{cert.user?.name || "—"}</p>
                        <p className="text-xs text-gray-400">{cert.user?.email || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {cert.course?.title || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleDownloadCertificate(cert)}
                            className={iconBtn}
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handleVerify(cert.id)}
                            className={iconBtn}
                            title="Verify"
                          >
                            <ShieldCheck size={14} />
                          </button>
                          <button
                            onClick={() => revokeCertificate(cert.id, "")}
                            disabled={revoking.has(cert.id)}
                            className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Revoke"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════ GENERATE VIEW ══════ */}
      {viewMode === "generate" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900">Generate New Certificate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  User ID *
                </span>
                <input
                  type="text"
                  value={generateForm.userId}
                  onChange={(e) => setGenerateForm((p) => ({ ...p, userId: e.target.value }))}
                  placeholder="Enter user ID"
                  className={cn(inputCls, "mt-1")}
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Course ID *
                </span>
                <input
                  type="text"
                  value={generateForm.courseId}
                  onChange={(e) => setGenerateForm((p) => ({ ...p, courseId: e.target.value }))}
                  placeholder="Enter course ID"
                  className={cn(inputCls, "mt-1")}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Issued By ID (optional)
              </span>
              <input
                type="text"
                value={generateForm.issuedById}
                onChange={(e) => setGenerateForm((p) => ({ ...p, issuedById: e.target.value }))}
                placeholder="Enter issuer ID"
                className={cn(inputCls, "mt-1")}
              />
            </label>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() =>
                  handleGenerateCertificate(
                    generateForm.courseId,
                    generateForm.userId,
                    generateForm.issuedById || undefined,
                  )
                }
                disabled={
                  !generateForm.userId.trim() ||
                  !generateForm.courseId.trim() ||
                  generating.has(`${generateForm.userId}-${generateForm.courseId}`)
                }
                className="px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                {generating.has(`${generateForm.userId}-${generateForm.courseId}`) ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Award size={15} />
                    Generate
                  </>
                )}
              </button>
              <button
                onClick={() => setGenerateForm({ userId: "", courseId: "", issuedById: "" })}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* View user certificates */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">View User Certificates</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder="Enter user ID"
                className={cn(inputCls, "flex-1")}
              />
              <button
                onClick={() => fetchUserCertificates(selectedUserId)}
                disabled={!selectedUserId.trim()}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                <Eye size={15} />
                View
              </button>
            </div>
            {filteredUserCertificates.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredUserCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cert.title}</p>
                      <p className="text-xs text-gray-400">
                        Course: {cert.course?.title || "—"} | ID: {cert.id}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleDownloadCertificate(cert)}
                        className={iconBtn}
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleVerify(cert.id)}
                        className={iconBtn}
                        title="Verify"
                      >
                        <ShieldCheck size={14} />
                      </button>
                      <button
                        onClick={() => revokeCertificate(cert.id, "")}
                        disabled={revoking.has(cert.id)}
                        className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Revoke"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ VERIFY VIEW ══════ */}
      {viewMode === "verify-single" && (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900">Verify Certificate</h3>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Certificate ID
              </span>
              <input
                type="text"
                value={singleVerifyForm.certificateId}
                onChange={(e) => setSingleVerifyForm({ certificateId: e.target.value })}
                placeholder="Enter certificate ID"
                className={cn(inputCls, "mt-1")}
              />
            </label>
            <button
              onClick={handleSingleVerify}
              disabled={!singleVerifyForm.certificateId.trim()}
              className="w-full px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck size={15} />
              Verify
            </button>
          </div>
        </div>
      )}

      {/* ══════ VERIFY RESULT MODAL ══════ */}
      {verifyOpen && verifyData && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setVerifyOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative"
          >
            <button
              onClick={() => setVerifyOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              <h4 className="text-base font-bold text-gray-900">Certificate Verified</h4>
            </div>
            <div className="px-6 py-5 space-y-3">
              {(
                [
                  ["Certificate ID", verifyData.id],
                  ["Title", verifyData.title],
                  ["Course", verifyData.course?.title || "—"],
                  ["Issued To", verifyData.user?.name || "—"],
                  ...(verifyData.user?.email ? [["Email", verifyData.user.email]] : []),
                  [
                    "Issued At",
                    verifyData.issuedAt ? new Date(verifyData.issuedAt).toLocaleString() : "—",
                  ],
                  ["Authorized By", verifyData.issuedBy?.name || verifyData.issuedBy?.id || "—"],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">{label}</span>
                  <span className="text-gray-900 text-right max-w-[60%] break-all">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={() => setVerifyOpen(false)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadCertificate(verifyData)}
                className="px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-1.5"
              >
                <Download size={15} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCertifications;
