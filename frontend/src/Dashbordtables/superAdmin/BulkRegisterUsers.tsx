import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  UserPlus,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  Mail,
  Phone,
  FileText,
  Eye,
  EyeOff,
  GraduationCap,
  IdCard,
  KeyRound,
} from "lucide-react";
import { useUser } from "@/context/useUser";
import type { Role } from "@/context/userTypes";
import api from "@/lib/api";
import { PROGRAMME_NAMES } from "@/lib/programmes";

interface BulkRegistrationResponse {
  summary?: {
    totalProcessed: number;
    registeredCount: number;
    skippedCount: number;
    failedEmailCount: number;
  };
  details?: {
    registered?: string[];
    skipped?: string[];
    failed?: { email: string; error: string }[];
  };
}

interface SingleRegistrationResponse {
  message?: string;
  user?: {
    name: string;
    email: string;
    learnerId?: string | null;
    role?: Role;
  };
}

const inputCls =
  "block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors outline-none";

const passwordValidationError = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (password.length > 128) return "Password must be at most 128 characters long";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
};

const UserRegistration: React.FC = () => {
  const { role: currentRole } = useUser();
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // Single user state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [userRole, setUserRole] = useState<Role>("STUDENT");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [learnerId, setLearnerId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResponse, setSingleResponse] = useState<SingleRegistrationResponse | null>(null);

  // Bulk state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResponse, setBulkResponse] = useState<BulkRegistrationResponse | null>(null);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (isSuperAdmin) {
      const passwordError = passwordValidationError(password);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (learnerId.trim() && !/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(learnerId.trim())) {
        toast.error(
          "Learner ID must be 3–64 characters using letters, numbers, hyphens, or underscores",
        );
        return;
      }
    }

    setSingleLoading(true);
    setSingleResponse(null);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role: userRole,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        ...(isSuperAdmin
          ? {
              password,
              learnerId: learnerId.trim() || undefined,
              courseName: courseName || undefined,
            }
          : {}),
      };
      const res = await api.post<SingleRegistrationResponse>("/admin/users", payload);
      setSingleResponse(res.data);
      toast.success(res.data.message || "User registered successfully");
      setName("");
      setEmail("");
      setPhone("");
      setBio("");
      setUserRole("STUDENT");
      setPassword("");
      setConfirmPassword("");
      setLearnerId("");
      setCourseName("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Registration failed");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSingleLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select an Excel file");
      return;
    }
    setBulkLoading(true);
    setBulkResponse(null);
    try {
      const formData = new FormData();
      formData.append("excel_file", selectedFile);
      const res = await axios.post("/api/v1/admin/register/bulk", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBulkResponse(res.data);
      toast.success("Bulk registration complete");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Bulk registration failed");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const getRegisteredUsers = () => bulkResponse?.details?.registered || [];
  const getSkippedUsers = () => bulkResponse?.details?.skipped || [];
  const getFailedUsers = () => bulkResponse?.details?.failed || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">User Registration</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Register users individually or in bulk via Excel upload
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("single")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "single"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Single User
        </button>
        <button
          onClick={() => setActiveTab("bulk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "bulk"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload className="h-4 w-4" />
          Bulk Upload
        </button>
      </div>

      {/* Single User Form */}
      {activeTab === "single" && (
        <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="bg-orange-50 p-2 rounded-xl">
              <UserPlus className="h-4 w-4 text-orange-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Register New User</h3>
          </div>
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Full Name *
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className={`${inputCls} mt-1`}
                  required
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email *
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className={`${inputCls} mt-1`}
                  required
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Phone
                </span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Account role
                </span>
                <select
                  value={userRole}
                  onChange={(event) => setUserRole(event.target.value as Role)}
                  className={`${inputCls} mt-1 bg-white`}
                >
                  <option value="STUDENT">Student</option>
                  <option value="ASSISTANT">Assistant</option>
                  <option value="TEACHER">Teacher</option>
                  {isSuperAdmin && <option value="ADMIN">Administrator</option>}
                  {isSuperAdmin && <option value="SUPER_ADMIN">Super administrator</option>}
                </select>
              </label>

              {isSuperAdmin && (
                <>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                      <IdCard className="w-3 h-3" />
                      Learner ID
                    </span>
                    <input
                      type="text"
                      value={learnerId}
                      onChange={(event) => setLearnerId(event.target.value)}
                      placeholder="Optional, e.g. JECA-STUDENT-001"
                      className={`${inputCls} mt-1 uppercase`}
                      maxLength={64}
                    />
                    <span className="mt-1 block text-[11px] text-gray-400">
                      Leave blank to generate an ID automatically.
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      Programme
                    </span>
                    <select
                      value={courseName}
                      onChange={(event) => setCourseName(event.target.value)}
                      className={`${inputCls} mt-1 bg-white`}
                    >
                      <option value="">No programme selected</option>
                      {PROGRAMME_NAMES.map((programme) => (
                        <option key={programme} value={programme}>
                          {programme}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      Password *
                    </span>
                    <span className="relative mt-1 block">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Create a strong password"
                        className={`${inputCls} pr-10`}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </span>
                    <span className="mt-1 block text-[11px] text-gray-400">
                      At least 8 characters with uppercase, lowercase, and a number.
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      Confirm password *
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat the password"
                      className={`${inputCls} mt-1`}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                </>
              )}
            </div>

            <div
              className={`rounded-xl border p-4 text-xs leading-5 ${
                isSuperAdmin
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              {isSuperAdmin ? (
                <>
                  The account can sign in immediately with the password you create. Email
                  verification remains available but does not block login. The password is never
                  emailed or returned—communicate it securely to the user.
                </>
              ) : (
                <>
                  The user receives a private 24-hour account setup link and chooses their own
                  password. Passwords are never sent by email.
                </>
              )}
            </div>

            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Bio
              </span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Enter bio"
                className={`${inputCls} mt-1 min-h-[80px] resize-none`}
              />
            </label>
            <button
              type="submit"
              disabled={singleLoading}
              className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {singleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create User
                </>
              )}
            </button>
          </form>

          {singleResponse && (
            <div className="px-6 pb-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">{singleResponse.message}</p>
                  {singleResponse.user && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {singleResponse.user.name} — {singleResponse.user.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Upload */}
      {activeTab === "bulk" && (
        <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="bg-orange-50 p-2 rounded-xl">
              <Upload className="h-4 w-4 text-orange-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Bulk Registration via Excel</h3>
          </div>
          <form onSubmit={handleBulkSubmit} className="p-6 space-y-5">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-orange-300 transition-colors">
              <Upload className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <label htmlFor="excel-file" className="cursor-pointer">
                <span className="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 text-sm font-medium hover:bg-orange-100 transition-colors inline-block">
                  Choose Excel File
                </span>
              </label>
              <input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-400 mt-3">
                {selectedFile ? selectedFile.name : "Accepts .xlsx and .xls files"}
              </p>
            </div>
            <button
              type="submit"
              disabled={bulkLoading || !selectedFile}
              className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Register Users
                </>
              )}
            </button>
          </form>

          {/* Results */}
          {bulkResponse && (
            <div className="px-6 pb-6 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Registration Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {bulkResponse.summary?.totalProcessed || 0}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-1">
                    Processed
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-emerald-600">
                    {bulkResponse.summary?.registeredCount || 0}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 mt-1">
                    Registered
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-amber-600">
                    {bulkResponse.summary?.skippedCount || 0}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 mt-1">
                    Skipped
                  </p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-red-600">
                    {bulkResponse.summary?.failedEmailCount || 0}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500 mt-1">
                    Failed
                  </p>
                </div>
              </div>

              {getRegisteredUsers().length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm font-medium text-emerald-800">
                      Successfully Registered ({getRegisteredUsers().length})
                    </p>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {getRegisteredUsers().map((email, i) => (
                      <p key={i} className="text-xs text-emerald-700">
                        {email}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {getSkippedUsers().length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-medium text-amber-800">
                      Skipped ({getSkippedUsers().length})
                    </p>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {getSkippedUsers().map((item, i) => (
                      <p key={i} className="text-xs text-amber-700">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {getFailedUsers().length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-medium text-red-800">
                      Failed ({getFailedUsers().length})
                    </p>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {getFailedUsers().map((user, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium text-red-800">{user.email}</span>
                        <span className="text-red-600 ml-2">— {user.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserRegistration;
