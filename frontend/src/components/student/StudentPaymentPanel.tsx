import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  Clock3,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { useUser } from "@/context/useUser";
import { getProgramme } from "@/lib/programmes";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  category?: string | null;
  priceInPaise: number;
  currency: string;
}
type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED";
interface PaymentRequest {
  id: string;
  amountInPaise: number;
  currency: string;
  status: PaymentStatus;
  rejectionReason?: string | null;
  createdAt: string;
  course: Pick<Course, "id" | "title" | "category" | "thumbnailUrl">;
}
interface PaymentSettings {
  paymentAccountName?: string;
  paymentAccountNumber?: string;
  paymentIfsc?: string;
  paymentUpi?: string;
  paymentInstructions?: string;
}
interface PaymentQr {
  qrDataUrl: string;
  upiUri: string;
  amountInPaise: number;
  currency: string;
  payeeName: string;
}

const statusStyles: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};
const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
const messageFrom = (error: unknown, fallback: string) =>
  error instanceof AxiosError ? error.response?.data?.message || fallback : fallback;

const StudentPaymentPanel = () => {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCourseId = searchParams.get("courseId") || "";
  const [courses, setCourses] = useState<Course[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [settings, setSettings] = useState<PaymentSettings>({});
  const [paymentQr, setPaymentQr] = useState<PaymentQr | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    const results = await Promise.allSettled([
      api.get("/public/courses"),
      api.get("/payment-requests/me"),
      api.get("/payment-requests/settings"),
      api.get("/courses/my-courses"),
    ]);
    if (results[0].status === "fulfilled") setCourses(results[0].value.data.courses || []);
    if (results[1].status === "fulfilled") setRequests(results[1].value.data.requests || []);
    if (results[2].status === "fulfilled") setSettings(results[2].value.data.settings || {});
    if (results[3].status === "fulfilled") {
      setEnrolledCourseIds(
        (results[3].value.data.courses || []).map((course: { id: string }) => course.id),
      );
    }
    if (results.some((result) => result.status === "rejected")) {
      setLoadError("Some enrollment information could not be loaded. Refresh before paying.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const matchingCourses = courses;
  const payableCourses = useMemo(
    () =>
      courses.filter(
        (course) =>
          !enrolledCourseIds.includes(course.id) &&
          !requests.some(
            (request) =>
              request.course.id === course.id &&
              (request.status === "PENDING" || request.status === "APPROVED"),
          ),
      ),
    [courses, enrolledCourseIds, requests],
  );
  const selectedCourse =
    payableCourses.find((course) => course.id === selectedId) ||
    payableCourses.find((course) => course.id === requestedCourseId) ||
    payableCourses.find((course) => course.category === user?.courseName) ||
    payableCourses[0];
  const hasMatchingEnrollment = courses.some((course) => enrolledCourseIds.includes(course.id));
  const paymentReady = Boolean(
    settings.paymentAccountName && (settings.paymentAccountNumber || settings.paymentUpi),
  );

  useEffect(() => {
    if (!selectedCourse?.id || !settings.paymentUpi) {
      setPaymentQr(null);
      return;
    }
    const controller = new AbortController();
    setQrLoading(true);
    setPaymentQr(null);
    api
      .get("/payment-requests/qr", {
        params: { courseId: selectedCourse.id },
        signal: controller.signal,
      })
      .then(({ data }) => setPaymentQr(data))
      .catch(() => {
        if (!controller.signal.aborted) setPaymentQr(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setQrLoading(false);
      });
    return () => controller.abort();
  }, [selectedCourse?.id, settings.paymentUpi]);

  useEffect(() => {
    if (!modalOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setModalOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [modalOpen]);

  const selectCourse = (courseId: string) => {
    setSelectedId(courseId);
    setFile(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("courseId", courseId);
    nextParams.set("payment", "1");
    setSearchParams(nextParams, { replace: true });
  };

  const resendVerification = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      const { data } = await api.post("/auth/resend-verification", { email: user.email });
      toast.success(data.message);
    } catch (error) {
      toast.error(messageFrom(error, "Unable to resend the verification email."));
    } finally {
      setResending(false);
    }
  };

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] || null;
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      toast.error("Choose a JPEG, PNG or WebP image.");
      event.target.value = "";
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      toast.error("Payment proof must be 10MB or smaller.");
      event.target.value = "";
      return;
    }
    setFile(next);
  };

  const submit = async () => {
    if (!selectedCourse || !file || !paymentReady) return;
    setSubmitting(true);
    try {
      const prepared = await api.post("/payment-requests/prepare-upload", {
        courseId: selectedCourse.id,
        contentType: file.type,
        fileSize: file.size,
      });
      await axios.put(prepared.data.uploadUrl, file, {
        headers: prepared.data.headers,
        withCredentials: false,
      });
      await api.post("/payment-requests/submit", {
        courseId: selectedCourse.id,
        uploadReceipt: prepared.data.uploadReceipt,
      });
      toast.success("Payment proof submitted for approval.");
      setModalOpen(false);
      setFile(null);
      await load();
    } catch (error) {
      toast.error(messageFrom(error, "Payment proof could not be submitted."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />;

  return (
    <section className="space-y-4">
      {!user?.isVerified && (
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-sky-600" />
            <div>
              <p className="font-bold">Email verification is recommended</p>
              <p className="mt-0.5 text-sky-700">
                Your learning and payment access is active. Verify your email when convenient to
                keep your account secure.
              </p>
            </div>
          </div>
          <button
            onClick={resendVerification}
            disabled={resending}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-sky-700 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
            Resend email
          </button>
        </div>
      )}

      {loadError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 flex-none" />
          <p>{loadError}</p>
          <button onClick={() => void load()} className="ml-auto font-bold underline">
            Refresh
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">
              Admissions & payment
            </p>
            <h2 className="mt-2 text-xl font-black text-[#072A60]">Course checkout</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose your course, pay using the details below, and upload the payment screenshot.
            </p>
          </div>
          {selectedCourse && (
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-100"
            >
              Open payment window
            </button>
          )}
        </div>

        {selectedCourse && (
          <div className="mt-6 space-y-5">
            {payableCourses.length > 1 && (
              <label className="block text-sm font-semibold text-slate-700">
                Course name
                <select
                  value={selectedCourse.id}
                  onChange={(event) => selectCourse(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  {payableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} — {inr(course.priceInPaise)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div
              className={`overflow-hidden rounded-2xl bg-gradient-to-br ${getProgramme(selectedCourse.category)?.gradient || "from-[#072A60] to-orange-500"} p-5 text-white`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                {selectedCourse.category || "Published course"}
              </p>
              <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <h3 className="text-xl font-black">{selectedCourse.title}</h3>
                <p className="text-3xl font-black">{inr(selectedCourse.priceInPaise)}</p>
              </div>
            </div>

            {paymentReady ? (
              <div className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Account name", settings.paymentAccountName],
                  ["Account number", settings.paymentAccountNumber],
                  ["IFSC code", settings.paymentIfsc],
                  ["UPI ID", settings.paymentUpi],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                        {label}
                      </p>
                      <p className="mt-1 break-all font-mono font-bold text-blue-950">{value}</p>
                    </div>
                  ))}
                {settings.paymentInstructions && (
                  <p className="whitespace-pre-line text-xs leading-5 text-blue-700 sm:col-span-2 lg:col-span-4">
                    {settings.paymentInstructions}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-bold">Payment details are not configured yet</p>
                <p className="mt-1">
                  An administrator must add an account name with an account number or UPI ID before
                  payment proof can be submitted.
                </p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-stretch">
              <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center transition hover:border-orange-400 hover:bg-orange-50/40">
                <UploadCloud className="h-7 w-7 text-orange-500" />
                <span className="mt-2 text-sm font-bold text-slate-800">
                  {file ? file.name : "Upload payment screenshot"}
                </span>
                <span className="mt-1 text-xs text-slate-400">
                  JPEG, PNG or WebP · maximum 10MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={chooseFile}
                  className="sr-only"
                />
              </label>
              <button
                onClick={submit}
                disabled={!file || !paymentReady || submitting || Boolean(loadError)}
                className="flex min-w-48 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Submit for approval
                  </>
                )}
              </button>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              After submission, the status will show as Pending. Admin approval automatically
              assigns this selected course to your account.
            </p>
          </div>
        )}
        {requests.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {requests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{request.course.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {inr(request.amountInPaise)} ·{" "}
                      {new Date(request.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[request.status]}`}
                  >
                    {request.status}
                  </span>
                </div>
                {request.status === "REJECTED" && request.rejectionReason && (
                  <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                    Reason: {request.rejectionReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : hasMatchingEnrollment ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <BadgeCheck className="h-5 w-5" />
            <p className="text-sm font-semibold">
              You are enrolled. Your approved courses are ready in Enrolled Courses.
            </p>
          </div>
        ) : matchingCourses.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-bold">No matching published batch yet</p>
            <p className="mt-1">
              Ask an administrator to publish a course in the “
              {user?.courseName || "selected programme"}” category, or review the public catalogue.
            </p>
            <a href="/courses" className="mt-3 inline-flex items-center gap-1 font-bold">
              View catalogue <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-slate-600">
            <Clock3 className="h-5 w-5" />
            <p className="text-sm">
              A matching batch is available. Submit your payment proof for approval.
            </p>
          </div>
        )}
      </div>

      {modalOpen && selectedCourse && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">
                  Secure enrollment request
                </p>
                <h3 className="mt-1 text-xl font-black text-[#072A60]">Submit payment proof</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close payment window"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6 p-6">
              {payableCourses.length > 1 && (
                <label className="block text-sm font-semibold text-slate-700">
                  Select batch
                  <select
                    value={selectedCourse.id}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    {payableCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div
                className={`overflow-hidden rounded-2xl bg-gradient-to-br ${getProgramme(selectedCourse.category)?.gradient || "from-[#072A60] to-orange-500"} p-5 text-white`}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-white/65">
                  {selectedCourse.category}
                </p>
                <h4 className="mt-2 text-xl font-black">{selectedCourse.title}</h4>
                <p className="mt-4 text-3xl font-black">{inr(selectedCourse.priceInPaise)}</p>
              </div>
              {!paymentReady ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-bold">Payment details need administrator setup</p>
                  <p className="mt-1">
                    Ask an administrator to add an account name with a bank account number or UPI ID
                    in System Settings before submitting proof.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                    <Banknote className="h-5 w-5 text-orange-600" />
                    Academy payment details
                  </div>
                  {settings.paymentUpi && (
                    <div className="mb-5 grid items-center gap-5 rounded-2xl bg-indigo-50 p-4 sm:grid-cols-[176px_1fr]">
                      <div className="flex aspect-square w-44 items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-white p-2 shadow-sm">
                        {qrLoading ? (
                          <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />
                        ) : paymentQr ? (
                          <img
                            src={paymentQr.qrDataUrl}
                            alt={`UPI QR code for ${selectedCourse.title}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <p className="px-3 text-center text-xs font-semibold text-slate-500">
                            QR code is temporarily unavailable. Use the UPI ID below.
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.16em] text-indigo-700">
                          Scan with any UPI app
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          The amount and selected course are included automatically. Confirm the
                          payee and amount in your payment app before proceeding.
                        </p>
                        {paymentQr && (
                          <a
                            href={paymentQr.upiUri}
                            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-indigo-800 px-4 text-sm font-bold text-white hover:bg-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                          >
                            Open UPI app
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    {[
                      ["Account name", settings.paymentAccountName],
                      ["Account number", settings.paymentAccountNumber],
                      ["IFSC", settings.paymentIfsc],
                      ["UPI ID", settings.paymentUpi],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-xs uppercase tracking-wider text-slate-400">
                            {label}
                          </dt>
                          <dd className="mt-1 break-all font-bold text-slate-800">{value}</dd>
                        </div>
                      ))}
                  </dl>
                  {settings.paymentInstructions && (
                    <p className="mt-5 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      {settings.paymentInstructions}
                    </p>
                  )}
                </div>
              )}
              <label className="block rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-orange-400">
                <UploadCloud className="mx-auto h-8 w-8 text-orange-500" />
                <span className="mt-2 block text-sm font-bold text-slate-800">
                  {file ? file.name : "Choose payment screenshot"}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  JPEG, PNG or WebP · maximum 10MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={chooseFile}
                  className="sr-only"
                />
              </label>
              <button
                onClick={submit}
                disabled={!file || !paymentReady || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Uploading securely…
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Submit for approval
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default StudentPaymentPanel;
