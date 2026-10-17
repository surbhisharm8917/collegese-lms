import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaEnvelope } from "react-icons/fa";
import AuthArtPanel from "@/components/AuthArtPanel";
import BrandLogo from "@/components/BrandLogo";
import api from "@/lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data.message || "Password reset link sent to your email.");
      setSent(true);
      setTimeout(() => {
        navigate("/login?resetLinkSent=true");
      }, 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Password reset failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Art panel — hidden on mobile */}
      <AuthArtPanel
        headline="Forgot your password? No worries."
        sub="We'll send you a secure reset link so you can get back to your CA classes quickly."
      />

      {/* Form side */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_50%_40%,rgba(251,146,60,0.05),transparent)]"
        />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <BrandLogo className="justify-center" imageClassName="h-10 w-10" />
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/40">
            {sent ? (
              /* ---- Success state ---- */
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                  <FaCheckCircle className="h-7 w-7 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Check your inbox</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  We sent a reset link to <span className="font-medium text-gray-600">{email}</span>
                  .{message && <span className="mt-2 block text-green-600">{message}</span>}
                </p>
                <p className="mt-4 text-xs text-gray-300">Redirecting to login…</p>
              </div>
            ) : (
              /* ---- Form state ---- */
              <>
                <div className="mb-6 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                    <FaEnvelope className="h-5 w-5 text-orange-500" />
                  </div>
                </div>

                <h2 className="text-center text-lg font-semibold text-gray-900">Reset password</h2>
                <p className="mt-1 text-center text-sm text-gray-400">
                  Enter your email and we'll send reset instructions
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label
                      htmlFor="fp-email"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="fp-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={isLoading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Sending…
                      </span>
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Back to login */}
          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-orange-500"
            >
              <FaArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
