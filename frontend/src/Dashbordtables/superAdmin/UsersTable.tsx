import React, { useEffect, useState, useRef, useMemo } from "react";
import Loader from "@/components/Loader";
import { List, LayoutGrid, Loader2, X, Trash2, Pencil, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type User = {
  id: string;
  name: string;
  learnerId?: string;
  email: string;
  phone?: string;
  courseName?: string;
  Gender?: string;
  dateOfBirth?: string;
  address?: string;
  department?: string;
  year?: number;
  guardianPhone?: string;
  attendancePercentage?: number;
  grade?: string;
  feedback?: string;
  role: string;
  completedCourse?: boolean;
  isVerified: boolean;
  forcePasswordChange?: boolean;
  isSuspended: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
};

const UsersTable = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<Partial<User>>({
    name: "",
    email: "",
    phone: "",
    learnerId: "",
    courseName: "",
    Gender: "",
    dateOfBirth: "",
    address: "",
    department: "",
    year: undefined,
    guardianPhone: "",
    attendancePercentage: undefined,
    grade: "",
    feedback: "",
    completedCourse: false,
    isVerified: false,
    forcePasswordChange: false,
    isSuspended: false,
    isDeleted: false,
  });

  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Partial<Record<keyof User, string | boolean | undefined>>>(
    {},
  );
  const USERS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/all");
      const data = response.data;
      if (data.success) setUsers(data.users ?? []);
      else toast.error("Failed to fetch users.");
    } catch {
      toast.error("Error fetching users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!tableRef.current) return;
      const target = e.target as Node | null;
      if (target && !tableRef.current.contains(target)) setSelectedRow(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchMatch = Object.values(user).some((v) =>
        String(v).toLowerCase().includes(searchTerm.toLowerCase()),
      );
      const filterMatch = Object.entries(filters).every(([key, filterValue]) => {
        const userValue = user[key as keyof User];
        if (typeof filterValue === "boolean") return !!userValue === filterValue;
        return String(userValue).toLowerCase().includes(String(filterValue).toLowerCase());
      });
      return searchMatch && filterMatch;
    });
  }, [users, searchTerm, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      learnerId: u.learnerId || "",
      courseName: u.courseName || "",
      Gender: u.Gender || "",
      dateOfBirth: u.dateOfBirth || "",
      address: u.address || "",
      department: u.department || "",
      year: u.year ?? undefined,
      guardianPhone: u.guardianPhone || "",
      attendancePercentage: u.attendancePercentage ?? undefined,
      grade: u.grade || "",
      feedback: u.feedback || "",
      completedCourse: u.completedCourse ?? false,
      isVerified: u.isVerified,
      forcePasswordChange: u.forcePasswordChange ?? false,
      isSuspended: u.isSuspended,
      isDeleted: u.isDeleted ?? false,
    });
    setIsEditOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const target = e.target;
    const { name, value, type } = target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (target as HTMLInputElement).checked
          : type === "number"
            ? value === ""
              ? undefined
              : Number(value)
            : value,
    }));
  };

  const handleFilterChange = (key: keyof User, value: string | boolean | undefined) => {
    setFilters((prev) => {
      const n = { ...prev };
      if (value === "" || value === undefined) delete n[key];
      else n[key] = value;
      return n;
    });
  };

  const cleanPayload = (payload: Partial<User>) => {
    const cleaned: Partial<Record<keyof User, unknown>> = {};
    const optionalStringFields = [
      "phone",
      "learnerId",
      "courseName",
      "Gender",
      "dateOfBirth",
      "address",
      "department",
      "guardianPhone",
      "grade",
      "feedback",
    ];
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "string" && value.trim() === "") {
        cleaned[key as keyof User] = optionalStringFields.includes(key) ? undefined : value.trim();
      } else if (typeof value === "string") {
        cleaned[key as keyof User] = value.trim();
      } else {
        cleaned[key as keyof User] = value;
      }
    }
    return cleaned;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!form.name?.trim() || !form.email?.trim()) {
      toast.error("Name and Email are required.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = cleanPayload(form);
      const res = await api.put(`/admin/users/${editingUser.id}`, payload);
      const data = res.data;
      if (data.success) {
        await fetchUsers();
        setIsEditOpen(false);
        setEditingUser(null);
        toast.success("User updated successfully!");
      } else toast.error(data.message || "Failed to update user.");
    } catch {
      toast.error("An error occurred while updating the user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      const data = res.data;
      if (data.success) {
        await fetchUsers();
        toast.success("User deleted successfully!");
      } else toast.error(data.message || "Failed to delete user.");
    } catch {
      toast.error("An error occurred while deleting the user.");
    }
  };

  const fields: (keyof User)[] = [
    "name",
    "email",
    "phone",
    "role",
    "learnerId",
    "courseName",
    "Gender",
    "dateOfBirth",
    "address",
    "department",
    "year",
    "guardianPhone",
    "attendancePercentage",
    "grade",
    "feedback",
    "completedCourse",
    "isVerified",
    "forcePasswordChange",
    "isSuspended",
    "isDeleted",
    "createdAt",
    "updatedAt",
  ];

  const getFieldValue = (user: User, field: keyof User) => {
    const value = user[field];
    if (value === undefined || value === null) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (field === "createdAt" || field === "updatedAt" || field === "dateOfBirth") {
      try {
        return new Date(value as string).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const closeModal = () => {
    setIsEditOpen(false);
    setEditingUser(null);
  };

  const uniqueValues = useMemo(() => {
    const values: Record<string, Set<string | boolean | number>> = {};
    fields.forEach((f) => {
      values[f] = new Set();
    });
    users.forEach((u) => {
      fields.forEach((f) => {
        const v = u[f];
        if (v !== undefined && v !== null) values[f].add(v);
      });
    });
    return values;
  }, [users]);

  if (loading) return <Loader message="Loading users…" />;

  return (
    <div ref={tableRef} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2.5 rounded-xl">
            <Users className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Users</h2>
            <p className="text-xs text-gray-400">{filteredUsers.length} users found</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input
              type="text"
              placeholder="Search users…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
            className="p-2 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500"
          >
            {viewMode === "table" ? <LayoutGrid size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-3 bg-white rounded-2xl border border-gray-100">
        {(
          [
            { key: "role" as keyof User, label: "Role" },
            { key: "isVerified" as keyof User, label: "Verified" },
            { key: "isSuspended" as keyof User, label: "Suspended" },
            { key: "completedCourse" as keyof User, label: "Course Done" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {label}
            </label>
            <select
              value={
                filters[key] === true
                  ? "true"
                  : filters[key] === false
                    ? "false"
                    : String(filters[key] || "")
              }
              onChange={(e) => {
                const v = e.target.value;
                if (key === "role") handleFilterChange(key, v);
                else
                  handleFilterChange(key, v === "true" ? true : v === "false" ? false : undefined);
              }}
              className="rounded-lg border border-gray-200 text-xs py-1 px-2 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            >
              <option value="">All</option>
              {key === "role" ? (
                Array.from(uniqueValues.role || []).map((r) => (
                  <option key={String(r)} value={String(r)}>
                    {String(r)}
                  </option>
                ))
              ) : (
                <>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </>
              )}
            </select>
          </div>
        ))}
      </div>

      {/* Content */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No users match your criteria.</div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/80">
                  {fields.map((f) => (
                    <th
                      key={f}
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap border-b border-gray-100"
                    >
                      {f.replace(/([A-Z])/g, " $1").trim()}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u, idx) => {
                  const absIdx = startIndex + idx;
                  return (
                    <tr
                      key={u.id ?? absIdx}
                      onClick={() => setSelectedRow(absIdx)}
                      className={cn(
                        "cursor-pointer text-sm transition-colors border-b border-gray-50",
                        selectedRow === absIdx ? "bg-orange-50/60" : "hover:bg-orange-50/40",
                      )}
                    >
                      {fields.map((f) => (
                        <td
                          key={f}
                          className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs align-top"
                        >
                          {getFieldValue(u, f)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(u);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(u.id);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedUsers.map((u, idx) => {
            const absIdx = startIndex + idx;
            return (
              <div
                key={u.id ?? absIdx}
                onClick={() => setSelectedRow(absIdx)}
                className={cn(
                  "bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col max-h-64 overflow-hidden",
                  selectedRow === absIdx && "border-orange-200 bg-orange-50/30",
                )}
              >
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">{u.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{u.email}</p>
                  {fields.slice(3).map((f) => (
                    <p key={f} className="text-xs text-gray-500">
                      <span className="font-medium text-gray-600">
                        {f.replace(/([A-Z])/g, " $1").trim()}:
                      </span>{" "}
                      {getFieldValue(u, f)}
                    </p>
                  ))}
                </div>
                <div className="flex gap-2 p-3 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(u);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(u.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredUsers.length > USERS_PER_PAGE && (
        <div className="flex justify-center items-center gap-1.5 pt-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              currentPage === 1
                ? "text-gray-300 border-gray-100 cursor-not-allowed"
                : "text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50",
            )}
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-medium border transition-colors",
                currentPage === i + 1
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-orange-300",
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              currentPage === totalPages
                ? "text-gray-300 border-gray-100 cursor-not-allowed"
                : "text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50",
            )}
          >
            Next
          </button>
        </div>
      )}

      {/* Edit modal */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h4 className="text-base font-bold text-gray-900">Edit User: {editingUser.name}</h4>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Text fields */}
              {(
                [
                  { key: "name", label: "Name *", type: "text", required: true },
                  { key: "email", label: "Email *", type: "email", required: true },
                  { key: "phone", label: "Phone", type: "text" },
                  { key: "learnerId", label: "Just Easy ID", type: "text" },
                  { key: "courseName", label: "Course Name", type: "text" },
                  { key: "Gender", label: "Gender", type: "text" },
                  { key: "dateOfBirth", label: "Date of Birth", type: "date" },
                  { key: "department", label: "Department", type: "text" },
                  { key: "year", label: "Year", type: "number" },
                  { key: "guardianPhone", label: "Guardian Phone", type: "text" },
                  { key: "attendancePercentage", label: "Attendance %", type: "number" },
                  { key: "grade", label: "Grade", type: "text" },
                ] as const
              ).map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {field.label}
                  </span>
                  <input
                    name={field.key}
                    type={field.type}
                    value={String(form[field.key as keyof typeof form] ?? "")}
                    onChange={handleFormChange}
                    required={"required" in field && field.required}
                    className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
                  />
                </label>
              ))}

              {/* Textareas */}
              {(["address", "feedback"] as const).map((key) => (
                <label key={key} className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {key}
                  </span>
                  <textarea
                    name={key}
                    value={String(form[key] || "")}
                    onChange={handleFormChange}
                    rows={2}
                    className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors resize-none"
                  />
                </label>
              ))}

              {/* Checkboxes */}
              <div className="md:col-span-2 flex flex-wrap gap-x-5 gap-y-2">
                {(
                  [
                    "isVerified",
                    "isSuspended",
                    "forcePasswordChange",
                    "isDeleted",
                    "completedCourse",
                  ] as const
                ).map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      name={key}
                      type="checkbox"
                      checked={!!form[key]}
                      onChange={handleFormChange}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                    <span className="text-xs font-medium text-gray-600">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  </label>
                ))}
              </div>

              {/* Footer */}
              <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      Saving…
                    </span>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTable;
