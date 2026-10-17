import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Award, BadgeCheck, Ban, LoaderCircle } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import api from "@/lib/api";

interface VerificationResult {
  valid: boolean;
  certificate: {
    id: string;
    title: string;
    issuedAt: string;
    revokedAt: string | null;
    revocationReason: string | null;
    user: { name: string; learnerId: string | null };
    course: { title: string };
    issuedBy: { name: string } | null;
  };
}

export default function VerifyCertificate() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!certificateId) return;
    api
      .get(`/certificates/verify/${certificateId}`)
      .then((response) => setResult(response.data))
      .catch((requestError) =>
        setError(requestError.response?.data?.message || "Certificate could not be verified."),
      );
  }, [certificateId]);

  const loading = !result && !error;
  const valid = result?.valid === true;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-xl rounded-lg border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/50">
        <BrandLogo className="mb-8 justify-center" imageClassName="h-12 w-12" />
        <div className="text-center">
          {loading ? (
            <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-orange-500" />
          ) : valid ? (
            <BadgeCheck className="mx-auto h-14 w-14 text-emerald-600" />
          ) : (
            <Ban className="mx-auto h-14 w-14 text-red-500" />
          )}
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            {loading
              ? "Verifying certificate"
              : valid
                ? "Valid certificate"
                : "Certificate not valid"}
          </h1>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {result && (
          <dl className="mt-8 divide-y divide-gray-100 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3 p-4">
              <Award className="h-5 w-5 text-orange-500" />
              <div>
                <dt className="text-xs uppercase text-gray-400">Learner</dt>
                <dd className="font-medium text-gray-900">{result.certificate.user.name}</dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 text-sm">
              <div>
                <dt className="text-xs uppercase text-gray-400">Course</dt>
                <dd className="mt-1 text-gray-800">{result.certificate.course.title}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Issued</dt>
                <dd className="mt-1 text-gray-800">
                  {new Date(result.certificate.issuedAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Learner ID</dt>
                <dd className="mt-1 text-gray-800">
                  {result.certificate.user.learnerId || "Not assigned"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Certificate ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-gray-800">
                  {result.certificate.id}
                </dd>
              </div>
            </div>
            {!valid && result.certificate.revocationReason && (
              <div className="p-4 text-sm text-red-700">
                Revocation reason: {result.certificate.revocationReason}
              </div>
            )}
          </dl>
        )}

        <div className="mt-8 text-center">
          <Link to="/home" className="text-sm font-medium text-orange-600 hover:text-orange-700">
            Return to Just Easy CA Classes
          </Link>
        </div>
      </section>
    </main>
  );
}
