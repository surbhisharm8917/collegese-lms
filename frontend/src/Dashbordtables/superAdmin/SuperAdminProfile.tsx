import React, { useState, useEffect, useRef } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Building,
  Calendar,
  IdCard,
  Camera,
  AlertTriangle,
  Save,
} from "lucide-react";
import { useUser } from "@/context/useUser";

/* ─── helpers ─── */
const getAvatarSrc = (pic?: string | null): string | undefined => {
  if (!pic) return undefined;
  if (pic.startsWith("http") || pic.startsWith("/") || pic.startsWith("data:")) return pic;
  return `data:image/jpeg;base64,${pic}`;
};

/* ─── Types ─── */
interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  profilePic?: string;
  learnerId?: string;
  courseName?: string;
  department?: string;
  year?: number;
  createdAt: string;
  updatedAt: string;
}

/* ─── InfoRow ─── */
const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
}> = ({ icon, label, value, mono }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      {mono ? (
        <code className="text-sm text-gray-900 bg-gray-50 px-2 py-0.5 rounded mt-1 inline-block">
          {value || "—"}
        </code>
      ) : (
        <p className="text-sm text-gray-900 mt-0.5">{value || "Not provided"}</p>
      )}
    </div>
  </div>
);

const inputCls =
  "block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors outline-none";

/* ─── Main ─── */
const SuperAdminProfile: React.FC = () => {
  const { updateUser } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/v1/user/profile", { withCredentials: true });
        const user = res.data.user;
        if (user) {
          setProfile(user);
          setFormData({
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            profilePic: user.profilePic,
          });
          setPreview(user.profilePic || null);
        } else {
          setError("User data not found");
        }
      } catch {
        setError("Failed to fetch profile");
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5 MB");
      return;
    }
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    toast.success("Image selected");
  };

  const handleUpdate = async () => {
    if (!profile) return;
    if (!formData.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.email?.trim()) {
      toast.error("Email is required");
      return;
    }

    setUpdating(true);
    const form = new FormData();
    form.append("name", formData.name.trim());
    form.append("email", formData.email.trim());
    form.append("phone", formData.phone?.trim() || "");
    form.append("address", formData.address?.trim() || "");
    if (file) form.append("profilePic", file);

    try {
      const res = await axios.put("/api/v1/user/profile", form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      const user = res.data.user;
      if (user) {
        setProfile(user);
        setFormData({
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          profilePic: user.profilePic,
        });
        setPreview(user.profilePic || null);
        updateUser({ name: user.name, email: user.email, profilePic: user.profilePic });
      }
      setIsDialogOpen(false);
      setFile(null);
      toast.success("Profile updated");
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        profilePic: profile.profilePic,
      });
      setPreview(profile.profilePic || null);
    }
    setFile(null);
    setIsDialogOpen(false);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Error Loading Profile</h3>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const avatarSrc = getAvatarSrc(profile.profilePic);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Super Admin Profile</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your account information and preferences
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors duration-200"
        >
          <Edit className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

      {/* Profile card + info grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — avatar card */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="relative mx-auto w-fit mb-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-orange-500 ring-4 ring-orange-100">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white font-bold text-2xl">
                    {getInitials(profile.name)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
            <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-lg bg-orange-50 text-[11px] font-semibold uppercase tracking-wider text-orange-600">
              {profile.role}
            </span>
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <IdCard className="w-3.5 h-3.5 text-gray-400" />
                <code className="text-xs bg-gray-50 px-2 py-0.5 rounded text-gray-700">
                  {profile.id.slice(-8)}
                </code>
              </div>
              {profile.email && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate max-w-[14rem] text-xs">{profile.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — info sections */}
        <div className="xl:col-span-2 space-y-6">
          {/* Personal */}
          <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="flex items-center gap-3 px-6 pt-6 pb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <User className="w-4 h-4 text-orange-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Personal Information
              </h3>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow
                  icon={<User className="w-4 h-4 text-orange-500" />}
                  label="Full Name"
                  value={profile.name}
                />
                <InfoRow
                  icon={<Mail className="w-4 h-4 text-orange-500" />}
                  label="Email"
                  value={profile.email}
                />
                <InfoRow
                  icon={<Phone className="w-4 h-4 text-orange-500" />}
                  label="Phone"
                  value={profile.phone}
                />
                <InfoRow
                  icon={<MapPin className="w-4 h-4 text-orange-500" />}
                  label="Address"
                  value={profile.address}
                />
              </div>
            </div>
          </div>

          {/* Academic */}
          <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="flex items-center gap-3 px-6 pt-6 pb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-orange-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Academic Information
              </h3>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow
                  icon={<IdCard className="w-4 h-4 text-orange-500" />}
                  label="Just Easy ID"
                  value={profile.learnerId}
                  mono
                />
                <InfoRow
                  icon={<GraduationCap className="w-4 h-4 text-orange-500" />}
                  label="Course"
                  value={profile.courseName}
                />
                <InfoRow
                  icon={<Building className="w-4 h-4 text-orange-500" />}
                  label="Department"
                  value={profile.department}
                />
                <InfoRow
                  icon={<Calendar className="w-4 h-4 text-orange-500" />}
                  label="Academic Year"
                  value={profile.year ? `Year ${profile.year}` : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Edit className="w-4 h-4 text-orange-500" />
              Edit Profile
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-orange-500 ring-4 ring-orange-100">
                  {(preview ? getAvatarSrc(preview) : avatarSrc) ? (
                    <img
                      src={(preview ? getAvatarSrc(preview) : avatarSrc)!}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white font-bold text-2xl">
                      {getInitials(formData.name || profile.name)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center hover:bg-orange-600 border-2 border-white transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-[10px] text-gray-400">Max 5 MB &middot; JPG, PNG, GIF</p>
              {file && (
                <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                  {file.name}
                </p>
              )}
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Full Name *
                </span>
                <input
                  id="name"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder="Enter your full name"
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
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  placeholder="Enter your email"
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
                  id="phone"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Address
                </span>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  className={`${inputCls} mt-1 min-h-[80px] resize-none`}
                />
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={handleCancel}
              disabled={updating}
              className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={updating || !formData.name?.trim() || !formData.email?.trim()}
              className="px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center gap-1.5 min-w-[120px] justify-center"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminProfile;
