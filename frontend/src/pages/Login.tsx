import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import AuthArtPanel from "@/components/AuthArtPanel";
import BrandLogo from "@/components/BrandLogo";
import OtpVerification, { type OtpChallenge } from "@/components/OtpVerification";
import api from "@/lib/api";
import { authPath, postAuthPath } from "@/lib/postAuthIntent";
import { useUser } from "@/context/useUser";
import type { Role, User } from "@/context/userTypes";

const dashboardPath: Record<Role, string> = {
  STUDENT: "/dashboard/student/dashboard",
  TEACHER: "/dashboard/teacher/dashboardTeacher",
  ADMIN: "/dashboard/admin/dashboard",
  ASSISTANT: "/dashboard/assistant/assistant",
  SUPER_ADMIN: "/dashboard/superadmin/superAdminDash",
};

/** How the user chose to prove who they are. Staff accounts may only use PASSWORD. */
type LoginMethod = "PASSWORD" | "OTP";

const methodTabs: { value: LoginMethod; label: string }[] = [
  { value: "PASSWORD", label: "Password" },
  { value: "OTP", label: "Email code" },
];

function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [method, setMethod] = useState<LoginMethod>("PASSWORD");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Set when the learner asked for an emailed code: sign-in then waits on it.
  const [otpChallenge, setOtpChallenge] = useState<OtpChallenge | null>(null);
  const { user: currentUser, login, isLoading: isChecking } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("reset") === "success") {
      toast.success("Password reset successfully. You can now log in.");
    }
  }, [location]);

  useEffect(() => {
    if (isChecking || !currentUser) return;
    const destination = postAuthPath(
      currentUser.role,
      location.search,
      dashboardPath[currentUser.role],
    );
    navigate(currentUser.forcePasswordChange ? "/change-password" : destination, {
      replace: true,
    });
  }, [currentUser, isChecking, location.search, navigate]);

  useEffect(() => {
    localStorage.removeItem("rememberedEmail");
  }, []);

  /** Shared tail end of a completed sign-in, whichever step finished it. */
  const completeSignIn = useCallback(
    (user: User, message?: string) => {
      login(user);
      toast.success(message || "Logged in successfully.");

      if (user.forcePasswordChange) {
        navigate("/change-password", { replace: true });
        return;
      }

      navigate(postAuthPath(user.role, location.search, dashboardPath[user.role]), {
        replace: true,
      });
    },
    [login, location.search, navigate],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        method,
        // Left out entirely for the code route, which never asks for a password.
        ...(method === "PASSWORD" ? { password } : {}),
      });
      const data = response.data;

      if (!data.success) return;

      // Code route: the account exists and is eligible, now prove mailbox control.
      if (data.otpRequired) {
        setOtpChallenge({
          challengeToken: data.challengeToken,
          maskedEmail: data.maskedEmail,
          expiresAt: data.expiresAt,
          resendAvailableAt: data.resendAvailableAt,
          codeLength: data.codeLength,
          otpDelivered: data.otpDelivered !== false,
        });
        toast.success(data.message || "We sent you a sign-in code.");
        return;
      }

      // Password route: the session is already live.
      completeSignIn(data.user as User, data.message);
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "Login failed. Please try again.";
      console.error("Login error:", message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#072A60]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Art panel — hidden on mobile */}
      <AuthArtPanel
        headline={
          otpChallenge
            ? "One more step to keep your account safe"
            : "Welcome back to your commerce classroom"
        }
        sub={
          otpChallenge
            ? "The code is single-use and expires shortly, so nobody can reuse it to reach your account."
            : "Pick up right where you left off. Your CA classes, practice work, and progress reports are waiting for you."
        }
      />

      {/* Form side */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        {/* Subtle glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_50%_40%,rgba(251,146,60,0.05),transparent)]"
        />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo — hidden on lg */}
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <BrandLogo className="justify-center" imageClassName="h-10 w-10" />
          </div>

          {/* Step 2: emailed one-time code */}
          {otpChallenge ? (
            <OtpVerification
              challenge={otpChallenge}
              purpose="LOGIN"
              cancelLabel="Back to sign in"
              onCancel={() => {
                setOtpChallenge(null);
                setPassword("");
              }}
              onVerified={(data) => completeSignIn(data.user as User, data.message)}
            />
          ) : (
            /* Step 1: credentials */
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/40">
              <h2 className="text-center text-lg font-semibold text-gray-900">Sign in</h2>
              <p className="mt-1 text-center text-sm text-gray-400">
                {method === "PASSWORD"
                  ? "Enter your credentials to continue"
                  : "We will email you a single-use code"}
              </p>

              {/* Students pick either route. Staff accounts are password-only and
                  the server rejects the code route for them. */}
              <div
                role="tablist"
                aria-label="Sign-in method"
                className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1"
              >
                {methodTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    id={`login-method-${tab.value}`}
                    aria-selected={method === tab.value}
                    aria-controls="login-method-panel"
                    onClick={() => setMethod(tab.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      method === tab.value
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div
                id="login-method-panel"
                role="tabpanel"
                aria-labelledby={`login-method-${method}`}
              >
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200"
                    />
                  </div>

                  {/* Password — only on the password route */}
                  {method === "PASSWORD" ? (
                    <>
                      <div>
                        <label
                          htmlFor="password"
                          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                        >
                          Password
                        </label>
                        <input
                          type="password"
                          id="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Enter your password"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Link
                          to="/forgot-password"
                          className="text-sm font-medium text-orange-500 transition-colors hover:text-orange-600"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed text-gray-500">
                      Enter the email on your student account and we will send a 6-digit code. Staff
                      accounts sign in with a password.
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {method === "PASSWORD" ? "Signing in…" : "Sending code…"}
                      </span>
                    ) : method === "PASSWORD" ? (
                      "Sign in"
                    ) : (
                      "Email me a code"
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Bottom link */}
          {!otpChallenge && (
            <p className="mt-8 text-center text-sm text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                to={authPath("/register", location.search)}
                className="font-medium text-orange-500 transition-colors hover:text-orange-600"
              >
                Create one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
