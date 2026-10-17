import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthArtPanel from "@/components/AuthArtPanel";
import BrandLogo from "@/components/BrandLogo";
import api from "@/lib/api";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing password reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        newPassword,
        confirmPassword,
      });

      setMessage(data.message || "Password has been reset successfully.");
      setIsLoading(true);
      setTimeout(() => {
        navigate("/login?reset=success");
      }, 3000);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg =
        (err as any).response?.data?.message || "Failed to reset password. Please try again.";
      setError(msg);
      setIsLoading(false);
    }
  };

  if (error && !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <BrandLogo className="mb-6 justify-center" imageClassName="h-10 w-10" />
          <h1 className="text-lg font-semibold text-slate-950">Reset link unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600"
          >
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <BrandLogo className="mb-6 justify-center" imageClassName="h-10 w-10" />
          <h1 className="text-lg font-semibold text-slate-950">Token is missing</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Please request a fresh password reset link from your Just Easy CA Classes account.
          </p>
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600"
          >
            Request reset link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AuthArtPanel
        headline="Create a fresh password"
        sub="Protect your Just Easy CA Classes account and keep your learning progress secure."
      />

      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_50%_40%,rgba(7,42,96,0.06),transparent)]"
        />

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <BrandLogo className="justify-center" imageClassName="h-10 w-10" />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/40">
            <h2 className="text-center text-lg font-semibold text-gray-900">Reset password</h2>
            <p className="mt-1 text-center text-sm text-gray-400">
              Choose a strong password for your learning account
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  New password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Create a new password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  Confirm password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Confirm your new password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Resetting..." : "Reset password"}
              </button>
            </form>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            {message && (
              <p
                className={`mt-4 text-sm ${
                  message.includes("success") ? "text-green-600" : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate("/login")}
                className="text-sm font-medium text-gray-400 transition-colors hover:text-orange-500"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
