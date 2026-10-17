import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CircleAlert, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import api from "@/lib/api";

/**
 * Second step of registration and sign-in: the user types the code we emailed.
 *
 * The `challengeToken` returned by /auth/register or /auth/login is what binds
 * this step to the first one, so it travels with every submission. The code
 * itself is never stored anywhere on the client.
 */

export type OtpChallenge = {
  challengeToken: string;
  maskedEmail: string;
  expiresAt: string;
  resendAvailableAt: string;
  codeLength: number;
  otpDelivered: boolean;
};

export type OtpPurpose = "REGISTRATION" | "LOGIN";

type VerifyResponse = {
  success: boolean;
  message?: string;
  purpose: OtpPurpose;
  authenticated: boolean;
  user?: unknown;
};

type Props = {
  challenge: OtpChallenge;
  purpose: OtpPurpose;
  /** Called once the server accepts the code. */
  onVerified: (data: VerifyResponse) => void;
  /** Back to the previous step (edit email / password). */
  onCancel: () => void;
  cancelLabel?: string;
};

const secondsUntil = (iso: string): number =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));

const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const apiMessage = (error: unknown, fallback: string): string => {
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || fallback;
};

export default function OtpVerification({
  challenge,
  purpose,
  onVerified,
  onCancel,
  cancelLabel = "Use a different email",
}: Props) {
  const length = challenge.codeLength || 6;

  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    challenge.otpDelivered ? "" : "We could not send the code. Please request a new one.",
  );
  const [expiresIn, setExpiresIn] = useState(() => secondsUntil(challenge.expiresAt));
  const [resendIn, setResendIn] = useState(() => secondsUntil(challenge.resendAvailableAt));

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const tokenRef = useRef(challenge.challengeToken);
  // Guards against the auto-submit effect firing twice for the same code.
  const submittedRef = useRef("");

  const code = useMemo(() => digits.join(""), [digits]);
  const isComplete = code.length === length && !digits.includes("");

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setExpiresIn(secondsUntil(challenge.expiresAt));
      setResendIn(secondsUntil(challenge.resendAvailableAt));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [challenge.expiresAt, challenge.resendAvailableAt]);

  const reset = useCallback(() => {
    setDigits(Array(length).fill(""));
    submittedRef.current = "";
    inputsRef.current[0]?.focus();
  }, [length]);

  const submit = useCallback(
    async (value: string) => {
      setIsVerifying(true);
      setError("");
      setNotice("");
      try {
        const response = await api.post("/auth/otp/verify", {
          challengeToken: tokenRef.current,
          code: value,
        });
        onVerified(response.data as VerifyResponse);
      } catch (caught) {
        setError(apiMessage(caught, "We could not verify that code. Please try again."));
        reset();
      } finally {
        setIsVerifying(false);
      }
    },
    [onVerified, reset],
  );

  // Submitting as soon as the last digit lands removes a click for the common
  // case (typing or pasting the full code); the button remains for keyboard use.
  useEffect(() => {
    if (!isComplete || isVerifying || submittedRef.current === code) return;
    submittedRef.current = code;
    void submit(code);
  }, [code, isComplete, isVerifying, submit]);

  const writeDigits = (next: string[], focusIndex?: number) => {
    setDigits(next);
    setError("");
    if (focusIndex !== undefined) {
      inputsRef.current[Math.min(focusIndex, length - 1)]?.focus();
    }
  };

  const handleChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value.replace(/\D/g, "");
    if (!typed) {
      const next = [...digits];
      next[index] = "";
      writeDigits(next);
      return;
    }

    // Spread multi-character input (autofill or paste into one box) across cells.
    const next = [...digits];
    let cursor = index;
    for (const character of typed) {
      if (cursor >= length) break;
      next[cursor] = character;
      cursor += 1;
    }
    writeDigits(next, cursor);
  };

  const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        writeDigits(next);
      } else if (index > 0) {
        next[index - 1] = "";
        writeDigits(next, index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(length).fill("");
    for (let index = 0; index < pasted.length; index += 1) next[index] = pasted[index];
    writeDigits(next, pasted.length);
  };

  const resend = async () => {
    setIsResending(true);
    setError("");
    setNotice("");
    try {
      const response = await api.post("/auth/otp/resend", {
        challengeToken: tokenRef.current,
      });
      const next = response.data as OtpChallenge & { message?: string };
      tokenRef.current = next.challengeToken;
      setExpiresIn(secondsUntil(next.expiresAt));
      setResendIn(secondsUntil(next.resendAvailableAt));
      setNotice(next.message || "A new code is on its way.");
      reset();
    } catch (caught) {
      setError(apiMessage(caught, "We could not send another code right now."));
    } finally {
      setIsResending(false);
    }
  };

  const heading = purpose === "LOGIN" ? "Verify your sign-in" : "Confirm your email";
  const isExpired = expiresIn === 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/40">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
        {purpose === "LOGIN" ? (
          <ShieldCheck className="h-7 w-7 text-orange-500" />
        ) : (
          <MailCheck className="h-7 w-7 text-orange-500" />
        )}
      </div>

      <h2 className="text-center text-lg font-semibold text-gray-900">{heading}</h2>
      <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
        We sent a {length}-digit code to{" "}
        <span className="font-medium text-gray-800">{challenge.maskedEmail}</span>. Enter it below
        to continue.
      </p>

      <div className="mt-7">
        <div
          role="group"
          aria-label={`Enter the ${length}-digit verification code`}
          aria-describedby={error ? "otp-error" : "otp-hint"}
          className="flex justify-center gap-2"
          onPaste={handlePaste}
        >
          {digits.map((digit, index) => (
            <input
              // Index is a stable identity here: the cell count is fixed by
              // codeLength and cells are never reordered or removed.
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              // Lets iOS/Android and password managers offer the code from the
              // SMS/mail app instead of forcing the user to switch apps.
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${index + 1} of ${length}`}
              maxLength={length}
              value={digit}
              disabled={isVerifying || isExpired}
              onChange={handleChange(index)}
              onKeyDown={handleKeyDown(index)}
              onFocus={(event) => event.currentTarget.select()}
              className={`h-14 w-11 rounded-xl border bg-gray-50/60 text-center font-mono text-xl font-semibold text-gray-900 outline-none transition focus:bg-white focus:ring-2 disabled:opacity-60 sm:w-12 ${
                error
                  ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                  : "border-gray-200 focus:border-orange-300 focus:ring-orange-200"
              }`}
            />
          ))}
        </div>

        {error ? (
          <p
            id="otp-error"
            role="alert"
            className="mt-4 flex items-start justify-center gap-1.5 text-center text-xs text-red-600"
          >
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : (
          <p id="otp-hint" className="mt-4 text-center text-xs text-gray-400">
            {isExpired
              ? "This code has expired. Request a new one below."
              : `Code expires in ${formatDuration(expiresIn)}`}
          </p>
        )}

        {notice && !error && (
          <p role="status" className="mt-2 text-center text-xs font-medium text-orange-600">
            {notice}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={!isComplete || isVerifying || isExpired}
        onClick={() => void submit(code)}
        className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isVerifying ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Verifying…
          </span>
        ) : purpose === "LOGIN" ? (
          "Verify and sign in"
        ) : (
          "Verify email"
        )}
      </button>

      <div className="mt-5 flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={isResending || (resendIn > 0 && !isExpired)}
          onClick={resend}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
          {resendIn > 0 && !isExpired ? `Resend code in ${resendIn}s` : "Send a new code"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {cancelLabel}
        </button>
      </div>

      <p className="mt-6 border-t border-gray-100 pt-4 text-center text-xs leading-relaxed text-gray-400">
        Not seeing the email? Check your spam or promotions folder. Never share this code with
        anyone.
      </p>
    </div>
  );
}
