import { useState, useEffect, useMemo, useRef } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import Loader from "../components/Loader";
import { ChevronDown, X, Shield, Users, Loader2, Save, Landmark } from "lucide-react";
import api from "@/lib/api";
import { useUser } from "@/context/useUser";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Settings {
  [key: string]: string;
}

interface ApiErrorResponse {
  message?: string;
}

const PAYMENT_FIELDS = [
  { key: "paymentAccountName", label: "Account holder name" },
  { key: "paymentAccountNumber", label: "Account number" },
  { key: "paymentIfsc", label: "IFSC code" },
  { key: "paymentUpi", label: "UPI ID" },
  { key: "paymentInstructions", label: "Payment instructions" },
] as const;

const SystemSettingsPage = () => {
  const { role } = useUser();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [settings, setSettings] = useState<Settings>(() =>
    Object.fromEntries(PAYMENT_FIELDS.map(({ key }) => [key, ""])),
  );
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [promoteSearchTerm, setPromoteSearchTerm] = useState<string>("");
  const [isPromoteUserDropdownOpen, setIsPromoteUserDropdownOpen] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);
  const [whitelist, setWhitelist] = useState<User[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [whitelistSearchTerm, setWhitelistSearchTerm] = useState<string>("");
  const [isWhitelistDropdownOpen, setIsWhitelistDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const promoteUserDropdownRef = useRef<HTMLDivElement>(null);
  const whitelistDropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const promoteUserRef = useRef<User | null>(null);

  const availableRoles = [
    { value: "STUDENT", label: "Student" },
    { value: "TEACHER", label: "Teacher" },
    { value: "ASSISTANT", label: "Assistant" },
    { value: "ADMIN", label: "Admin" },
    { value: "SUPER_ADMIN", label: "Super Admin" },
  ];

  const filteredWhitelistUsers = useMemo(() => {
    if (!whitelistSearchTerm) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(whitelistSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(whitelistSearchTerm.toLowerCase()),
    );
  }, [users, whitelistSearchTerm]);

  const filteredPromoteUsers = useMemo(() => {
    if (!promoteSearchTerm) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(promoteSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(promoteSearchTerm.toLowerCase()),
    );
  }, [users, promoteSearchTerm]);

  const selectedWhitelistUser = useMemo(
    () => users.find((u) => u.id === selectedUser),
    [users, selectedUser],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const settingsResponse = await api.get("/superadmin/settings/system");
        const loadedSettings = settingsResponse.data.settings || {};
        setSettings((previous) => ({ ...previous, ...loadedSettings }));
        setIsMaintenanceMode(loadedSettings.isMaintenanceMode === "true");

        if (isSuperAdmin) {
          const usersResponse = await api.get("/superadmin/users");
          const allUsers = usersResponse.data.users || [];
          setUsers(allUsers);
          if (loadedSettings.maintenanceAllowedUsers) {
            try {
              const allowedUserIds: string[] = JSON.parse(loadedSettings.maintenanceAllowedUsers);
              setWhitelist(allUsers.filter((u: User) => allowedUserIds.includes(u.id)));
            } catch {
              setWhitelist([]);
            }
          }
        }
      } catch {
        toast.error("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [isSuperAdmin]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        whitelistDropdownRef.current &&
        !whitelistDropdownRef.current.contains(event.target as Node)
      )
        setIsWhitelistDropdownOpen(false);
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node))
        setIsRoleDropdownOpen(false);
      if (
        promoteUserDropdownRef.current &&
        !promoteUserDropdownRef.current.contains(event.target as Node)
      )
        setIsPromoteUserDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const paymentSettings = Object.fromEntries(
        PAYMENT_FIELDS.map(({ key }) => [key, settings[key] || ""]),
      );
      await api.put("/superadmin/settings/system", paymentSettings);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handlePromoteUser = async () => {
    if (!promoteUserRef.current || !selectedRole) {
      toast.error("Please select both a user and a role.");
      return;
    }
    try {
      setPromoteLoading(true);
      await api.post(`/superadmin/users/${promoteUserRef.current.id}/promote`, {
        role: selectedRole,
      });
      toast.success("User role updated successfully");
      const usersResponse = await api.get("/superadmin/users");
      setUsers(usersResponse.data.users || []);
      setSelectedRole("");
      setPromoteSearchTerm("");
      promoteUserRef.current = null;
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.message || "Failed to promote user");
    } finally {
      setPromoteLoading(false);
    }
  };

  const handlePromoteUserSelect = (user: User) => {
    promoteUserRef.current = user;
    setPromoteSearchTerm(user.name);
    setIsPromoteUserDropdownOpen(false);
  };

  const handleRoleSelect = (roleValue: string) => {
    setSelectedRole(roleValue);
    setIsRoleDropdownOpen(false);
  };

  const handleMaintenanceToggle = async () => {
    const newMaintenanceState = !isMaintenanceMode;
    setIsSavingMaintenance(true);
    try {
      await api.put("/superadmin/settings/maintenance", { isMaintenanceMode: newMaintenanceState });
      setIsMaintenanceMode(newMaintenanceState);
      toast.success(`Maintenance mode ${newMaintenanceState ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to toggle maintenance mode");
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  const handleWhitelistUpdate = async (userIds: string[]) => {
    try {
      setWhitelistLoading(true);
      await api.put("/superadmin/settings/maintenance/whitelist", { userIds });
      setWhitelist(users.filter((u) => userIds.includes(u.id)));
      toast.success("Whitelist updated");
    } catch {
      toast.error("Failed to update whitelist");
    } finally {
      setWhitelistLoading(false);
    }
  };

  const removeFromWhitelist = (id: string) => {
    const newWhitelist = whitelist.filter((u) => u.id !== id);
    handleWhitelistUpdate(newWhitelist.map((u) => u.id));
  };

  const addToWhitelist = () => {
    if (!selectedWhitelistUser) return;
    if (whitelist.some((u) => u.id === selectedWhitelistUser.id)) {
      toast.error("User is already in whitelist.");
      return;
    }
    handleWhitelistUpdate([...whitelist.map((u) => u.id), selectedWhitelistUser.id]);
    setSelectedUser("");
    setWhitelistSearchTerm("");
  };

  const handleWhitelistUserSelect = (user: User) => {
    setSelectedUser(user.id);
    setWhitelistSearchTerm(user.name);
    setIsWhitelistDropdownOpen(false);
  };

  const inputCls =
    "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-colors";

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage maintenance mode, user roles, and system-wide configurations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Card 1: Maintenance Mode ─── */}
        {isSuperAdmin && (
          <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="flex items-center gap-3 px-6 pt-6 pb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-orange-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Maintenance Mode
              </h2>
            </div>
            <div className="px-6 pb-6 space-y-5">
              <p className="text-xs text-gray-500">
                Control application access for all users except admins and whitelisted users.
              </p>

              <button
                onClick={handleMaintenanceToggle}
                disabled={isSavingMaintenance}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                  isMaintenanceMode
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                }`}
              >
                {isSavingMaintenance
                  ? "Updating…"
                  : isMaintenanceMode
                    ? "Disable Maintenance"
                    : "Enable Maintenance"}
              </button>

              {/* Whitelist */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Whitelisted Users
                </p>
                {whitelist.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No users whitelisted</p>
                ) : (
                  <ul className="space-y-1.5 mb-3">
                    {whitelist.map((user) => (
                      <li
                        key={user.id}
                        className="flex items-center justify-between bg-amber-50 px-3 py-2 rounded-lg text-xs"
                      >
                        <span className="text-amber-800 truncate max-w-[160px]">
                          {user.name} ({user.email})
                        </span>
                        <button
                          onClick={() => removeFromWhitelist(user.id)}
                          className="text-red-400 hover:text-red-600 transition-colors ml-2 flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div ref={whitelistDropdownRef} className="relative mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                    Add to Whitelist
                  </p>
                  <input
                    type="text"
                    value={whitelistSearchTerm}
                    onChange={(e) => {
                      setWhitelistSearchTerm(e.target.value);
                      setIsWhitelistDropdownOpen(true);
                      if (!e.target.value) setSelectedUser("");
                    }}
                    onFocus={() => setIsWhitelistDropdownOpen(true)}
                    placeholder="Search by name or email…"
                    className={inputCls}
                  />
                  {isWhitelistDropdownOpen && filteredWhitelistUsers.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                      {filteredWhitelistUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleWhitelistUserSelect(user)}
                          className="px-3 py-2 cursor-pointer hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 text-xs">{user.name}</div>
                          <div className="text-[10px] text-gray-400">
                            {user.email} &middot; {user.role}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedWhitelistUser && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-amber-800">
                          {selectedWhitelistUser.name}
                        </div>
                        <div className="text-[10px] text-amber-600">
                          {selectedWhitelistUser.email}
                        </div>
                      </div>
                      <button
                        disabled={whitelistLoading}
                        onClick={addToWhitelist}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                      >
                        {whitelistLoading ? "Adding…" : "Add"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Card 2: Promote User ─── */}
        {isSuperAdmin && (
          <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="flex items-center gap-3 px-6 pt-6 pb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-orange-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Promote User
              </h2>
            </div>
            <div className="px-6 pb-6 space-y-4">
              {/* User search */}
              <div ref={promoteUserDropdownRef} className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  Select User
                </p>
                <input
                  type="text"
                  value={promoteSearchTerm}
                  onChange={(e) => {
                    setPromoteSearchTerm(e.target.value);
                    setIsPromoteUserDropdownOpen(true);
                    if (!e.target.value) promoteUserRef.current = null;
                  }}
                  onFocus={() => setIsPromoteUserDropdownOpen(true)}
                  placeholder="Search users…"
                  className={inputCls}
                />
                {isPromoteUserDropdownOpen && filteredPromoteUsers.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                    {filteredPromoteUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handlePromoteUserSelect(user)}
                        className="px-3 py-2 cursor-pointer hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 text-xs">{user.name}</div>
                        <div className="text-[10px] text-gray-400">
                          {user.email} &middot; Current: {user.role}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {promoteUserRef.current && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="text-xs font-medium text-blue-800">
                      {promoteUserRef.current.name}
                    </div>
                    <div className="text-[10px] text-blue-600">
                      {promoteUserRef.current.email} &middot; {promoteUserRef.current.role}
                    </div>
                  </div>
                )}
              </div>

              {/* Role select */}
              <div ref={roleDropdownRef} className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  Select Role
                </p>
                <div
                  className={`${inputCls} cursor-pointer flex items-center justify-between`}
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setIsRoleDropdownOpen(!isRoleDropdownOpen);
                  }}
                  role="button"
                  aria-expanded={isRoleDropdownOpen}
                >
                  <span className={selectedRole ? "text-gray-900" : "text-gray-400"}>
                    {selectedRole || "Choose role…"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${isRoleDropdownOpen ? "rotate-180" : ""}`}
                  />
                </div>
                {isRoleDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {availableRoles.map((role) => (
                      <div
                        key={role.value}
                        onClick={() => handleRoleSelect(role.value)}
                        className="px-3 py-2 cursor-pointer hover:bg-orange-50 text-sm text-gray-700 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        {role.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handlePromoteUser}
                disabled={promoteLoading || !promoteUserRef.current || !selectedRole}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                {promoteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Promoting…
                  </>
                ) : (
                  "Promote User"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── Card 3: Payment & System Settings ─── */}
        <div
          className={`bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 ${isSuperAdmin ? "" : "lg:col-span-3"}`}
        >
          <div className="flex items-center gap-3 px-6 pt-6 pb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Payment Settings
            </h2>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <p className="text-xs leading-5 text-gray-500">
              These academy payment details appear in the student enrollment modal. Add an account
              name and either an account number or UPI ID before accepting payment requests.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {PAYMENT_FIELDS.map(({ key, label }) => (
                <label
                  key={key}
                  className={key === "paymentInstructions" ? "block md:col-span-2" : "block"}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {label}
                  </span>
                  {key === "paymentInstructions" ? (
                    <textarea
                      name={key}
                      value={settings[key] || ""}
                      onChange={handleChange}
                      rows={4}
                      className={`${inputCls} mt-1 resize-y`}
                      placeholder="Include transfer reference or screenshot instructions…"
                    />
                  ) : (
                    <input
                      type="text"
                      name={key}
                      value={settings[key] || ""}
                      onChange={handleChange}
                      className={`${inputCls} mt-1`}
                    />
                  )}
                </label>
              ))}
            </div>
            <button
              onClick={handleSave}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Payment Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
