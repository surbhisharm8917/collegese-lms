import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import AuthArtPanel from "@/components/AuthArtPanel";
import BrandLogo from "@/components/BrandLogo";
import Loader from "@/components/Loader";
import { useUser } from "@/context/useUser";
import api from "@/lib/api";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, isLoading, logout } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <Loader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      logout();
      toast.success("Password changed. Sign in again on this device.");
      navigate("/login", { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to change your password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthArtPanel
        headline="Secure your classroom account"
        sub="Choose a private password before opening your courses, classes, and assessments."
      />
      <main className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo imageClassName="h-10 w-10" />
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/40">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <KeyRound className="h-5 w-5 text-orange-600" />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Change password</h1>
                <p className="text-sm text-gray-400">Required before continuing</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                New password
                <span className="relative mt-1.5 block">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,128}"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <p className="text-xs leading-5 text-gray-400">
                Use 8 or more characters with uppercase, lowercase, and a number.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {submitting ? "Updating password..." : "Update password"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
