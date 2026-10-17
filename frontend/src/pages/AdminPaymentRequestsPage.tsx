import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { BadgeCheck, Eye, IndianRupee, RefreshCw, ShieldCheck, X, XCircle } from "lucide-react";
import api from "@/lib/api";

const STATUSES = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];
interface RequestRow {
  id: string;
  amountInPaise: number;
  currency: string;
  status: Exclude<Status, "ALL">;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  proofViewUrl: string;
  student: { id: string; name: string; email: string; learnerId?: string | null };
  course: {
    id: string;
    title: string;
    category?: string | null;
    priceInPaise: number;
    currency: string;
  };
  reviewer?: { name: string; email: string } | null;
}

const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
const errorMessage = (error: unknown) =>
  error instanceof AxiosError
    ? error.response?.data?.message || "Action failed."
    : "Action failed.";
const statusClass = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

const AdminPaymentRequestsPage = () => {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [status, setStatus] = useState<Status>("PENDING");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState("");
  const [proof, setProof] = useState<RequestRow | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/payment-requests/admin", {
        params: status === "ALL" ? {} : { status },
      });
      setRequests(data.requests || []);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const approve = async (request: RequestRow) => {
    if (
      !window.confirm(
        `Approve ${request.student.name}'s payment for ${request.course.title}? This will enroll the student.`,
      )
    )
      return;
    setActing(request.id);
    try {
      const { data } = await api.post(`/payment-requests/${request.id}/approve`);
      toast.success(data.message);
      await fetchRequests();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActing("");
    }
  };
  const reject = async (request: RequestRow) => {
    const reason = window.prompt(`Why is ${request.student.name}'s payment being rejected?`);
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    if (!window.confirm("Reject this payment request? The student will see the reason.")) return;
    setActing(request.id);
    try {
      const { data } = await api.post(`/payment-requests/${request.id}/reject`, {
        reason: reason.trim(),
      });
      toast.success(data.message);
      await fetchRequests();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActing("");
    }
  };

  const Actions = ({ request }: { request: RequestRow }) => (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setProof(request)}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-orange-300"
      >
        <Eye className="h-3.5 w-3.5" />
        Proof
      </button>
      {request.status === "PENDING" && (
        <>
          <button
            onClick={() => void approve(request)}
            disabled={acting === request.id}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={() => void reject(request)}
            disabled={acting === request.id}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">
            Admissions desk
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Payment Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review payment proof and enroll students into approved batches.
          </p>
        </div>
        <button
          onClick={() => void fetchRequests()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${status === item ? "bg-[#072A60] text-white" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {item === "ALL" ? "All requests" : item[0] + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex min-h-52 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-bold text-slate-700">
            No {status === "ALL" ? "" : status.toLowerCase()} payment requests
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="w-full">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Course</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Submitted</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-900">{request.student.name}</p>
                      <p className="text-xs text-slate-500">{request.student.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">{request.course.title}</p>
                      <p className="text-xs text-slate-500">
                        {request.course.category || "Uncategorised"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-slate-900">
                      {inr(request.amountInPaise)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass[request.status]}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(request.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4">
                      <Actions request={request} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 lg:hidden">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black text-slate-900">{request.student.name}</h2>
                    <p className="text-xs text-slate-500">{request.student.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass[request.status]}`}
                  >
                    {request.status}
                  </span>
                </div>
                <div className="my-4 rounded-xl bg-slate-50 p-3">
                  <p className="font-bold text-slate-800">{request.course.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-black text-[#072A60]">
                    <IndianRupee className="h-4 w-4" />
                    {inr(request.amountInPaise).replace("₹", "")}
                  </p>
                </div>
                {request.rejectionReason && (
                  <p className="mb-4 text-xs text-red-700">Reason: {request.rejectionReason}</p>
                )}
                <Actions request={request} />
              </article>
            ))}
          </div>
        </>
      )}
      {proof && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="font-black text-slate-900">Payment proof</p>
                <p className="text-xs text-slate-500">
                  {proof.student.name} · {proof.course.title}
                </p>
              </div>
              <button onClick={() => setProof(null)} className="rounded-full bg-slate-100 p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center bg-slate-100 p-4">
              <img
                src={proof.proofViewUrl}
                alt={`Payment proof from ${proof.student.name}`}
                className="max-h-[68vh] max-w-full rounded-xl object-contain shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentRequestsPage;
