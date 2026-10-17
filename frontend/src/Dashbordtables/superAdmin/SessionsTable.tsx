import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import Loader from "@/components/Loader";
import { CalendarClock, Trash2, Monitor, Globe, Search, LayoutGrid, List } from "lucide-react";

interface Session {
  id: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  expiresAt: string;
  userId: string;
  user?: { name: string; email: string };
}

const SessionsTable: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/v1/admin/sessions", { withCredentials: true });
      setSessions(res.data.sessions || []);
    } catch {
      toast.error("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      await axios.delete(`/api/v1/user/sessions/${sessionId}`, { withCredentials: true });
      toast.success("Session terminated");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      toast.error("Failed to terminate session");
    }
  };

  const filtered = sessions.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.user?.name?.toLowerCase().includes(term) ||
      s.user?.email?.toLowerCase().includes(term) ||
      s.ipAddress?.toLowerCase().includes(term) ||
      s.userAgent?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) return <Loader message="Loading sessions…" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Active Sessions</h2>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} sessions found</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none w-full sm:w-64 transition-colors"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            {viewMode === "table" ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CalendarClock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No sessions found</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Device
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Login Time
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-orange-50/40 border-b border-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.user?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {session.user?.email || session.userId}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">{session.ipAddress || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600 max-w-[180px] truncate">
                          {session.userAgent || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(session.loginTime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(session.expiresAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {isExpired(session.expiresAt) ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-600">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleLogoutSession(session.id)}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {session.user?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-400">{session.user?.email || session.userId}</p>
                </div>
                {isExpired(session.expiresAt) ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-600">
                    Expired
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                    Active
                  </span>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Globe className="h-3.5 w-3.5 text-gray-400" />
                  <span>{session.ipAddress || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Monitor className="h-3.5 w-3.5 text-gray-400" />
                  <span className="truncate">{session.userAgent || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
                  <span>{new Date(session.loginTime).toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => handleLogoutSession(session.id)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                Terminate Session
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentPage === i + 1
                  ? "bg-orange-500 text-white border border-orange-500"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionsTable;
