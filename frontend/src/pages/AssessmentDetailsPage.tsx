import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import Loader from "@/components/Loader";
import {
  FileText,
  Calendar,
  Award,
  Upload,
  AlignLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
} from "lucide-react";

interface Assessment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  submissionType: "FILE_UPLOAD" | "TEXT_ENTRY";
  createdAt: string;
  updatedAt: string;
  course: { title: string };
}

interface Submission {
  id: string;
  status: "NOT_SUBMITTED" | "SUBMITTED" | "GRADED";
  fileUrl?: string;
  textContent?: string;
  grade?: number;
  feedback?: string;
  submittedAt?: string;
  gradedAt?: string;
}

interface ApiResponse {
  assessment: Assessment;
  submission?: Submission;
}

interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  uploadToken: string;
  headers: Record<string, string>;
}

const AssessmentDetailsPage = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get<ApiResponse>(`/assessments/student/${assessmentId}`);
        setAssessment(response.data.assessment);
        setSubmission(response.data.submission || { id: "", status: "NOT_SUBMITTED" });
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 403) {
          toast.error("You don't have permission to access this assessment.");
        } else if (axiosError.response?.status === 404) {
          toast.error("Assessment not found.");
        } else {
          toast.error("Failed to load assessment details.");
        }
        navigate("/dashboard/student/assessments", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    if (assessmentId) fetchDetails();
  }, [assessmentId, navigate]);

  const handleSubmit = async () => {
    if (!assessment) return;
    if (assessment.submissionType === "TEXT_ENTRY" && !textContent.trim()) {
      return toast.error("Text content cannot be empty.");
    }
    if (assessment.submissionType === "FILE_UPLOAD" && !file) {
      return toast.error("Please select a file to upload.");
    }
    setSubmitting(true);
    try {
      let fileKey: string | undefined;
      let fileUploadToken: string | undefined;
      if (file) {
        const presignedResponse = await api.post<PresignedUrlResponse>(
          `/assessments/${assessmentId}/presigned-url`,
          { fileName: file.name, fileType: file.type, fileSize: file.size },
        );
        const { uploadUrl, key, uploadToken, headers } = presignedResponse.data;
        await axios.put(uploadUrl, file, { headers, withCredentials: false, timeout: 0 });
        fileKey = key;
        fileUploadToken = uploadToken;
      }
      const submitResponse = await api.post<{ submission: Submission }>(
        `/assessments/${assessmentId}/submit`,
        { fileKey, fileUploadToken, textContent: textContent.trim() },
      );
      setSubmission(submitResponse.data.submission);
      toast.success("Submission successful!");
      setFile(null);
      setTextContent("");
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to submit assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isPastDue = assessment ? new Date(assessment.dueDate) < new Date() : false;

  if (loading) return <Loader message="Loading assessment…" />;

  if (!assessment)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-sm font-medium text-gray-600">Assessment not found</p>
        <button
          onClick={() => navigate("/dashboard/student/assessments")}
          className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assessments
        </button>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-50 p-2.5 rounded-xl">
          <FileText className="h-5 w-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 truncate">{assessment.title}</h1>
            {isPastDue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-[10px] font-semibold uppercase tracking-widest text-red-500">
                Past Due
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">{assessment.course?.title || "N/A"}</p>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Due Date
            </p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <p className={`text-sm font-medium ${isPastDue ? "text-red-500" : "text-gray-900"}`}>
                {fmt(assessment.dueDate)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Total Marks
            </p>
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">{assessment.totalMarks}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Type
            </p>
            <div className="flex items-center gap-1.5">
              {assessment.submissionType === "FILE_UPLOAD" ? (
                <Upload className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <AlignLeft className="w-3.5 h-3.5 text-gray-400" />
              )}
              <p className="text-sm font-medium text-gray-900">
                {assessment.submissionType === "FILE_UPLOAD" ? "File Upload" : "Text Entry"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Status
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                submission?.status === "GRADED"
                  ? "bg-emerald-50 text-emerald-600"
                  : submission?.status === "SUBMITTED"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-gray-50 text-gray-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  submission?.status === "GRADED"
                    ? "bg-emerald-500"
                    : submission?.status === "SUBMITTED"
                      ? "bg-amber-500"
                      : "bg-gray-400"
                }`}
              />
              {submission?.status?.replace("_", " ") || "NOT SUBMITTED"}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="mt-5 pt-5 border-t border-gray-50">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Description
            </p>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
            {assessment.description}
          </p>
        </div>
      </div>

      {/* Submission section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-5">Your Submission</h2>

        {/* Not submitted */}
        {submission?.status === "NOT_SUBMITTED" && (
          <div className="space-y-5">
            {isPastDue ? (
              <div className="bg-red-50 rounded-xl border border-red-100 p-4 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-medium">
                  This assessment is past due. Submissions are no longer accepted.
                </p>
              </div>
            ) : (
              <>
                {assessment.submissionType === "FILE_UPLOAD" ? (
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-2">
                      Upload File
                    </label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-300 transition-colors">
                      <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer"
                        disabled={submitting}
                      />
                      <p className="mt-2 text-[10px] text-gray-400">Maximum file size: 10MB</p>
                    </div>
                    {file && (
                      <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {file.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-2">
                      Your Answer
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={8}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none transition-all outline-none"
                      placeholder="Type your answer here…"
                      disabled={submitting}
                    />
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || isPastDue}
                  className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Assignment
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Submitted */}
        {submission?.status === "SUBMITTED" && (
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-amber-700">Submitted — Awaiting Grading</h3>
            </div>
            <p className="text-xs text-amber-600 mb-2">
              Your work has been submitted and is waiting for feedback.
            </p>
            {submission.submittedAt && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">
                Submitted on: {fmt(submission.submittedAt)}
              </p>
            )}
          </div>
        )}

        {/* Graded */}
        {submission?.status === "GRADED" && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-emerald-700">Graded</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 mb-1">
                  Your Grade
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  {submission.grade}
                  <span className="text-sm font-normal text-emerald-500">
                    /{assessment.totalMarks}
                  </span>
                </p>
              </div>
              {submission.gradedAt && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 mb-1">
                    Graded On
                  </p>
                  <p className="text-sm font-medium text-emerald-700">{fmt(submission.gradedAt)}</p>
                </div>
              )}
            </div>
            {submission.feedback && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 mb-1">
                  Feedback
                </p>
                <div className="bg-white border border-emerald-100 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.feedback}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentDetailsPage;
