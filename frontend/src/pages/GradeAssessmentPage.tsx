import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import Loader from "@/components/Loader";

// ✅ Import Shadcn UI components
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Submission {
  id: string;
  status: "SUBMITTED" | "GRADED";
  submittedAt: string;
  student: Student;
  fileUrl?: string;
  textContent?: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
}

interface ApiResponse {
  submissions: Submission[];
}

interface GradeSubmissionRequest {
  grade: number;
  feedback: string;
}

interface SignedUrlResponse {
  signedUrl: string;
}

const GradeAssessmentPage = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [viewingFile, setViewingFile] = useState(false);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await axios.get<ApiResponse>(
          `/api/v1/assessments/${assessmentId}/submissions`,
          { withCredentials: true },
        );
        setSubmissions(response.data.submissions);
      } catch (error) {
        console.error("Failed to load submissions:", error);
        toast.error("Failed to load submissions.");
        navigate("/assessments", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (assessmentId) {
      fetchSubmissions();
    }
  }, [assessmentId, navigate]);

  const handleViewSubmission = async (submission: Submission) => {
    if (submission.fileUrl) {
      try {
        setViewingFile(true);
        const response = await axios.get<SignedUrlResponse>(
          `/api/v1/assessments/submission/${submission.id}/view`,
          { withCredentials: true },
        );
        window.open(response.data.signedUrl, "_blank");
      } catch (error) {
        console.error("Failed to generate secure link:", error);
        toast.error("Could not generate secure link to view file.");
      } finally {
        setViewingFile(false);
      }
    } else if (submission.textContent) {
      openGradingModal(submission);
    }
  };

  const handleGradeSubmit = async () => {
    if (!selectedSubmission) return;

    const numericGrade = parseFloat(grade);
    if (isNaN(numericGrade) || numericGrade < 0) {
      toast.error("Please enter a valid grade.");
      return;
    }

    setGrading(true);

    try {
      await axios.put<{ submission: Submission }>(
        `/api/v1/assessments/submission/${selectedSubmission.id}/grade`,
        { grade: numericGrade, feedback } as GradeSubmissionRequest,
        { withCredentials: true },
      );

      toast.success("Grade submitted successfully!");
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubmission.id
            ? {
                ...sub,
                status: "GRADED",
                grade: numericGrade,
                feedback,
                gradedAt: new Date().toISOString(),
              }
            : sub,
        ),
      );

      setSelectedSubmission(null);
      setGrade("");
      setFeedback("");
    } catch (error) {
      console.error("Failed to submit grade:", error);
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || "Failed to submit grade.";
      toast.error(errorMessage);
    } finally {
      setGrading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: Submission["status"]) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (status === "GRADED") {
      return `${baseClasses} bg-green-100 text-green-800`;
    }
    return `${baseClasses} bg-yellow-100 text-yellow-800`;
  };

  const openGradingModal = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGrade(submission.grade?.toString() || "");
    setFeedback(submission.feedback || "");
  };

  const closeModal = () => {
    setSelectedSubmission(null);
    setGrade("");
    setFeedback("");
  };

  if (loading) {
    return <Loader message="Loading submissions\u2026" />;
  }

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Grade Submissions</h2>
        <Button
          onClick={() => navigate(-1)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
        >
          Back
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-500 hover:bg-orange-500 transition-colors">
              <TableHead className="text-white font-semibold">Student</TableHead>
              <TableHead className="text-white font-semibold">Submitted At</TableHead>
              <TableHead className="text-white font-semibold">Status</TableHead>
              <TableHead className="text-white font-semibold">Type</TableHead>
              <TableHead className="text-white font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                  No submissions found for this assessment.
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => (
                <TableRow key={submission.id} className="hover:bg-orange-50 transition-colors">
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium">
                        {submission.student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {submission.student.name}
                        </div>
                        <div className="text-sm text-gray-500">{submission.student.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    {formatDate(submission.submittedAt)}
                  </TableCell>
                  <TableCell>
                    <span className={getStatusBadge(submission.status)}>{submission.status}</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    {submission.fileUrl ? "File Upload" : "Text Entry"}
                  </TableCell>
                  <TableCell className="text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleViewSubmission(submission)}
                      disabled={viewingFile}
                      className="text-orange-600 hover:text-orange-800 transition-colors disabled:opacity-50"
                    >
                      {viewingFile ? "Loading..." : "View Submission"}
                    </button>
                    <button
                      onClick={() => openGradingModal(submission)}
                      className="text-orange-600 hover:text-orange-800 transition-colors"
                    >
                      {submission.status === "GRADED" ? "View/Edit Grade" : "Grade"}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedSubmission.fileUrl ? "View Submission" : "Grading"}:{" "}
                  {selectedSubmission.student.name}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{selectedSubmission.student.email}</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Submission Content</h4>
                {selectedSubmission.fileUrl ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 font-medium">📄</span>
                    </div>
                    <div>
                      <button
                        onClick={() => handleViewSubmission(selectedSubmission)}
                        disabled={viewingFile}
                        className="text-orange-600 hover:text-orange-800 font-medium transition-colors disabled:opacity-50"
                      >
                        {viewingFile ? "Generating secure link..." : "View Secure File"}
                      </button>
                      <p className="text-sm text-gray-500 mt-1">
                        Submitted on {formatDate(selectedSubmission.submittedAt)}
                      </p>
                    </div>
                  </div>
                ) : selectedSubmission.textContent ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedSubmission.textContent}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No submission content available.</p>
                )}
              </div>

              {(selectedSubmission.textContent || selectedSubmission.grade !== undefined) && (
                <>
                  <hr className="border-gray-200" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="grade"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Grade
                      </label>
                      <input
                        id="grade"
                        type="number"
                        min="0"
                        step="0.1"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Enter grade"
                        disabled={grading}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="feedback"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Feedback
                      </label>
                      <textarea
                        id="feedback"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                        placeholder="Provide feedback..."
                        disabled={grading}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            {(selectedSubmission.textContent || selectedSubmission.grade !== undefined) && (
              <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={closeModal}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800"
                    disabled={grading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGradeSubmit}
                    disabled={grading || !grade.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {grading ? "Submitting..." : "Submit Grade"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeAssessmentPage;
