import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import AuthArtPanel from "@/components/AuthArtPanel";
import BrandLogo from "@/components/BrandLogo";
import OtpVerification, { type OtpChallenge } from "@/components/OtpVerification";
import api from "@/lib/api";
import { authPath } from "@/lib/postAuthIntent";
import { isProgrammeName, PROGRAMME_NAMES } from "@/lib/programmes";

type RegistrationForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  courseName: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  confirmAdult: boolean;
  website: string;
};

type TextField = "name" | "email" | "password" | "phone" | "website";
type ApiValidationIssue = { field?: string; message?: string };
type FieldErrors = Record<string, string>;

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProgramme = searchParams.get("programme");
  const loginPath = authPath("/login", `?${searchParams.toString()}`);

  const [form, setForm] = useState<RegistrationForm>({
    name: "",
    email: "",
    password: "",
    phone: "",
    courseName: isProgrammeName(requestedProgramme) ? requestedProgramme : "",
    acceptTerms: false,
    acceptPrivacy: false,
    confirmAdult: false,
    website: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Set after the account is created: sign-up then waits on the emailed code.
  const [otpChallenge, setOtpChallenge] = useState<OtpChallenge | null>(null);
  const [verified, setVerified] = useState(false);

  const setValue = <K extends keyof RegistrationForm>(field: K, value: RegistrationForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const update = (field: TextField) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValue(field, event.target.value);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setIsLoading(true);

    try {
      const response = await api.post("/auth/register", form);
      const data = response.data;

      if (data.success) {
        setOtpChallenge({
          challengeToken: data.challengeToken,
          maskedEmail: data.maskedEmail,
          expiresAt: data.expiresAt,
          resendAvailableAt: data.resendAvailableAt,
          codeLength: data.codeLength,
          otpDelivered: data.otpDelivered !== false,
        });
        toast.success(data.message || "Account created. Check your email for the code.");
      }
    } catch (error: unknown) {
      const apiError = error as {
        response?: {
          data?: { message?: string; errors?: ApiValidationIssue[] };
        };
      };
      const data = apiError.response?.data;
      const nextErrors: FieldErrors = {};
      for (const issue of data?.errors ?? []) {
        if (issue.field && issue.message && !nextErrors[issue.field]) {
          nextErrors[issue.field] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      toast.error(data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Verified state                                                     */
  /* ------------------------------------------------------------------ */
  if (verified) {
    return (
      <div className="flex min-h-screen bg-white">
        <AuthArtPanel
          headline="Your email is confirmed"
          sub="Your account is active. Sign in to start your programme — we will email a single-use code to confirm it is you."
        />

        <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_50%_40%,rgba(251,146,60,0.05),transparent)]"
          />

          <div className="relative z-10 w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Your email is confirmed
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              <span className="font-medium text-gray-700">{form.email}</span> is verified and your
              account is active. Sign in to get started.
            </p>

            <button
              onClick={() => navigate(loginPath)}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Email confirmation step                                            */
  /* ------------------------------------------------------------------ */
  if (otpChallenge) {
    return (
      <div className="flex min-h-screen bg-white">
        <AuthArtPanel
          headline="Confirm your email to activate your account"
          sub="We sent a single-use code to the address you signed up with. Entering it confirms the mailbox is yours."
        />

        <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_50%_40%,rgba(251,146,60,0.05),transparent)]"
          />

          <div className="relative z-10 w-full max-w-sm">
            <div className="mb-10 flex flex-col items-center lg:hidden">
              <BrandLogo className="justify-center" imageClassName="h-10 w-10" />
            </div>

            <OtpVerification
              challenge={otpChallenge}
              purpose="REGISTRATION"
              cancelLabel="Sign in instead"
              onCancel={() => navigate(loginPath)}
              onVerified={(data) => {
                setVerified(true);
                toast.success(data.message || "Email verified successfully.");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Art panel — hidden on mobile */}
      <AuthArtPanel
        headline="Start your CA learning journey today"
        sub="Join focused commerce learners with structured classes, practice tests, certificates, and progress tracking."
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

          {/* Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/40">
            <h2 className="text-center text-lg font-semibold text-gray-900">Create your account</h2>
            <p className="mt-1 text-center text-sm text-gray-400">It only takes a minute</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={update("name")}
                  required
                  maxLength={120}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                  placeholder="Enter your full name"
                  className={`w-full rounded-xl border bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:bg-white focus:ring-2 ${
                    fieldErrors.name
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                  }`}
                />
                {fieldErrors.name && (
                  <p id="name-error" role="alert" className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="reg-email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update("email")}
                  required
                  maxLength={254}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  placeholder="Enter your email"
                  className={`w-full rounded-xl border bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:bg-white focus:ring-2 ${
                    fieldErrors.email
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                  }`}
                />
                {fieldErrors.email && (
                  <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  Phone{" "}
                  <span className="normal-case tracking-normal text-gray-300">(optional)</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  maxLength={20}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? "phone-error" : "phone-help"}
                  placeholder="e.g. +91 98765 43210"
                  className={`w-full rounded-xl border bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:bg-white focus:ring-2 ${
                    fieldErrors.phone
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                  }`}
                />
                {fieldErrors.phone ? (
                  <p id="phone-error" role="alert" className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.phone}
                  </p>
                ) : (
                  <p id="phone-help" className="mt-1.5 text-xs text-gray-400">
                    Include the country code; spaces, +, and hyphens are allowed (maximum 20
                    characters).
                  </p>
                )}
              </div>

              {/* Programme */}
              <div>
                <label
                  htmlFor="programme"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  Programme
                </label>
                <select
                  id="programme"
                  value={form.courseName}
                  onChange={(event) => setValue("courseName", event.target.value)}
                  required
                  aria-invalid={Boolean(fieldErrors.courseName)}
                  aria-describedby={fieldErrors.courseName ? "programme-error" : undefined}
                  className={`w-full rounded-xl border bg-gray-50/60 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:bg-white focus:ring-2 ${
                    fieldErrors.courseName
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                  }`}
                >
                  <option value="">Select your programme</option>
                  {PROGRAMME_NAMES.map((programme) => (
                    <option key={programme} value={programme}>
                      {programme}
                    </option>
                  ))}
                </select>
                {fieldErrors.courseName && (
                  <p id="programme-error" role="alert" className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.courseName}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="reg-password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={update("password")}
                    required
                    minLength={8}
                    maxLength={128}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,128}"
                    title="Use 8–128 characters with uppercase, lowercase, and a number."
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-error" : "password-help"}
                    placeholder="Create a password"
                    className={`w-full rounded-xl border bg-gray-50/60 px-4 py-2.5 pr-10 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:bg-white focus:ring-2 ${
                      fieldErrors.password
                        ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                        : "border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-slate-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.password}
                  </p>
                ) : (
                  <p id="password-help" className="mt-1.5 text-xs text-gray-400">
                    Use 8–128 characters with uppercase, lowercase, and a number.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                <label className="flex items-start gap-2.5 text-xs leading-5 text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.confirmAdult}
                    onChange={(event) => setValue("confirmAdult", event.target.checked)}
                    required
                    aria-invalid={Boolean(fieldErrors.confirmAdult)}
                    aria-describedby={fieldErrors.confirmAdult ? "adult-error" : undefined}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-orange-500"
                  />
                  <span>
                    I am 18 or older. Accounts for minors must be created through a guardian or
                    authorized institute process.
                  </span>
                </label>
                {fieldErrors.confirmAdult && (
                  <p id="adult-error" role="alert" className="text-xs text-red-600">
                    {fieldErrors.confirmAdult}
                  </p>
                )}
                <label className="flex items-start gap-2.5 text-xs leading-5 text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(event) => setValue("acceptTerms", event.target.checked)}
                    required
                    aria-invalid={Boolean(fieldErrors.acceptTerms)}
                    aria-describedby={fieldErrors.acceptTerms ? "terms-error" : undefined}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-orange-500"
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="font-medium text-orange-600">
                      Terms of Service
                    </Link>
                    .
                  </span>
                </label>
                {fieldErrors.acceptTerms && (
                  <p id="terms-error" role="alert" className="text-xs text-red-600">
                    {fieldErrors.acceptTerms}
                  </p>
                )}
                <label className="flex items-start gap-2.5 text-xs leading-5 text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.acceptPrivacy}
                    onChange={(event) => setValue("acceptPrivacy", event.target.checked)}
                    required
                    aria-invalid={Boolean(fieldErrors.acceptPrivacy)}
                    aria-describedby={fieldErrors.acceptPrivacy ? "privacy-error" : undefined}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-orange-500"
                  />
                  <span>
                    I acknowledge the{" "}
                    <Link
                      to="/privacy-policy"
                      target="_blank"
                      className="font-medium text-orange-600"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {fieldErrors.acceptPrivacy && (
                  <p id="privacy-error" role="alert" className="text-xs text-red-600">
                    {fieldErrors.acceptPrivacy}
                  </p>
                )}
              </div>

              {fieldErrors._form && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {fieldErrors._form}
                </p>
              )}

              <input
                type="text"
                name="website"
                value={form.website}
                onChange={update("website")}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account…
                  </span>
                ) : (
                  "Create account"
                )}
              </button>
            </form>
          </div>

          {/* Bottom link */}
          <p className="mt-8 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              to={loginPath}
              className="font-medium text-orange-500 transition-colors hover:text-orange-600"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
