import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  LayoutGrid,
  List,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Activity,
} from "lucide-react";

type Session = {
  id: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  expiresAt: string;
  userId: string;
  user: { id: string; name: string; email: string };
};

/* ── Helpers ───────────────────────────────────────────────── */

const parseDevice = (ua: string): { label: string; isMobile: boolean } => {
  if (!ua) return { label: "Unknown device", isMobile: false };
  const mobile = /mobile|android|iphone|ipad/i.test(ua);
  let browser = "Browser";
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/edg/i.test(ua)) browser = "Edge";

  let os = "";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";

  return { label: `${browser}${os ? ` on ${os}` : ""}`, isMobile: mobile };
};

const isActive = (expiresAt: string) => new Date(expiresAt) > new Date();

const formatTime = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

/* ── Component ─────────────────────────────────────────────── */

const UserSessionsTable = ({ userId }: { userId: string }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [loggingOut, setLoggingOut] = useState<string | null>(null);
  const pageSize = 6;
  const totalPages = Math.ceil(sessions.length / pageSize);
  const paginatedSessions = sessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeSessions = sessions.filter((s) => isActive(s.expiresAt)).length;

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${userId}/sessions`);
      if (data.success) {
        setSessions(data.sessions ?? []);
      } else {
        toast.error(data.message || "Failed to fetch sessions");
      }
    } catch {
      toast.error("Error fetching sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleSessionLogoutById = async (sessionId: string) => {
    if (!window.confirm("End this session? The device will be logged out.")) return;
    setLoggingOut(sessionId);
    try {
      const { data } = await api.delete(`/user/sessions/${sessionId}`);
      if (data.success) {
        fetchSessions();
        toast.success("Session ended");
      } else {
        toast.error("Failed to end session");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoggingOut(null);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  /* ── Loading ──────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  /* ── Main ─────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Login Activity</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your active sessions and devices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              fetchSessions();
            }}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView(view === "table" ? "grid" : "table")}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title={view === "table" ? "Grid view" : "Table view"}
          >
            {view === "table" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Total
              </p>
              <p className="text-xl font-bold text-gray-900">{sessions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Active
              </p>
              <p className="text-xl font-bold text-gray-900">{activeSessions}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all hidden sm:block">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Expired
              </p>
              <p className="text-xl font-bold text-gray-900">{sessions.length - activeSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No sessions found</h3>
          <p className="text-sm text-gray-400">Login activity will appear here</p>
        </div>
      ) : view === "table" ? (
        /* ── Table view ─────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/60">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 py-3 pl-6">
                    Device
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 py-3">
                    IP Address
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 py-3">
                    Login Time
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 py-3">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 py-3 pr-6 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSessions.map((s) => {
                  const device = parseDevice(s.userAgent);
                  const active = isActive(s.expiresAt);
                  return (
                    <TableRow
                      key={s.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                            {device.isMobile ? (
                              <Smartphone className="w-4 h-4 text-gray-500" />
                            ) : (
                              <Monitor className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {device.label}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">
                              {s.user.name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-3.5 h-3.5 text-gray-400" />
                          <code className="text-xs bg-gray-50 px-2 py-0.5 rounded text-gray-600">
                            {s.ipAddress || "—"}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div>
                          <p className="text-sm text-gray-900">{timeAgo(s.loginTime)}</p>
                          <p className="text-xs text-gray-400">{formatTime(s.loginTime)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            Expired
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <button
                          onClick={() => handleSessionLogoutById(s.id)}
                          disabled={loggingOut === s.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                        >
                          {loggingOut === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          End
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* ── Grid view ──────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedSessions.map((s) => {
            const device = parseDevice(s.userAgent);
            const active = isActive(s.expiresAt);
            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      {device.isMobile ? (
                        <Smartphone className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Monitor className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{device.label}</p>
                      <p className="text-xs text-gray-400 truncate">{s.user.name}</p>
                    </div>
                  </div>
                  {active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      Expired
                    </span>
                  )}
                </div>

                {/* Card details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <Wifi className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <code className="text-xs bg-gray-50 px-2 py-0.5 rounded text-gray-600">
                      {s.ipAddress || "—"}
                    </code>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-gray-600">{timeAgo(s.loginTime)}</span>
                      <span className="text-xs text-gray-300 mx-1.5">·</span>
                      <span className="text-xs text-gray-400">{formatTime(s.loginTime)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500">Expires {formatTime(s.expiresAt)}</span>
                  </div>
                </div>

                {/* Card action */}
                <button
                  onClick={() => handleSessionLogoutById(s.id)}
                  disabled={loggingOut === s.id}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {loggingOut === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  End Session
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 text-xs font-medium rounded-xl transition-colors ${
                  currentPage === i + 1
                    ? "bg-orange-500 text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSessionsTable;
