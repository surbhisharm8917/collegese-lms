import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import api from "@/lib/api";

type VerificationState = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerificationState>(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Verifying your email address..." : "This verification link is incomplete.",
  );
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    api
      .get("/auth/verify-email", { params: { token } })
      .then((response) => {
        setState("success");
        setMessage(response.data.message || "Your email has been verified.");
      })
      .catch((error) => {
        setState("error");
        setMessage(
          error.response?.data?.message || "This verification link is invalid or expired.",
        );
      });
  }, [token]);

  const resendVerification = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsResending(true);
    setResendMessage("");
    try {
      const response = await api.post("/auth/resend-verification", { email });
      setDeliveryEnabled(response.data.verificationEmailEnabled !== false);
      setResendMessage(
        response.data.message ||
          "If an unverified account with that email exists, a new link has been sent.",
      );
    } catch {
      setResendMessage("Unable to request another link right now. You can still try signing in.");
    } finally {
      setIsResending(false);
    }
  };

  const Icon =
    state === "loading" ? LoaderCircle : state === "success" ? CheckCircle2 : CircleAlert;
  const iconColor =
    state === "loading"
      ? "text-orange-500"
      : state === "success"
        ? "text-green-600"
        : "text-red-500";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-8 text-center shadow-xl shadow-gray-200/50">
        <BrandLogo className="mb-8 justify-center" imageClassName="h-11 w-11" />
        <Icon
          aria-hidden="true"
          className={`mx-auto h-12 w-12 ${iconColor} ${state === "loading" ? "animate-spin" : ""}`}
        />
        <h1 className="mt-5 text-xl font-semibold text-gray-900">
          {state === "loading"
            ? "Verifying email"
            : state === "success"
              ? "Email verified"
              : "Verification link unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500" aria-live="polite">
          {message}
        </p>

        {state === "error" && (
          <div className="mt-6 border-t border-gray-100 pt-6 text-left">
            <p className="text-sm leading-6 text-gray-600">
              Email verification does not block account access. You can continue to login
              {deliveryEnabled ? ", or request a fresh link below." : "."}
            </p>
            {deliveryEnabled && (
              <form onSubmit={resendVerification} className="mt-4 space-y-3">
                <label
                  htmlFor="verification-email"
                  className="block text-xs font-medium text-gray-600"
                >
                  Account email
                </label>
                <input
                  id="verification-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setResendMessage("");
                  }}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="submit"
                  disabled={isResending}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-orange-200 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                  {isResending ? "Requesting link…" : "Send a new verification link"}
                </button>
              </form>
            )}
            {resendMessage && (
              <p className="mt-3 text-sm leading-6 text-gray-600" role="status">
                {resendMessage}
              </p>
            )}
          </div>
        )}

        {state !== "loading" && (
          <div className="mt-7 flex flex-col items-center gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              Continue to login
            </Link>
            {state === "error" && (
              <Link
                to="/register"
                className="text-sm font-medium text-gray-500 hover:text-orange-600"
              >
                Create a different account
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
