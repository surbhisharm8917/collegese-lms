import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useUser } from "@/context/useUser";

interface AssessmentQuestion {
  id: string;
  text: string;
  marks: number;
}

interface AssessmentDetails {
  title: string;
  description: string;
  course: { title: string };
  createdBy: { name: string; email: string };
  dueDate: string;
  totalMarks: number;
  submissionType: string;
  questions: AssessmentQuestion[];
}

interface Submission {
  id: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  status: "SUBMITTED" | "GRADED" | "LATE";
}

interface AssessmentDetailsModalProps {
  assessmentId: string;
  onClose: () => void;
}

const AssessmentDetailsModal = ({ assessmentId, onClose }: AssessmentDetailsModalProps) => {
  const [details, setDetails] = useState<AssessmentDetails | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setAccessError(false);
        let endpoint = `/api/v1/assessments/${assessmentId}`;
        if (user?.role === "STUDENT") {
          endpoint = `/api/v1/assessments/student/${assessmentId}`;
        }

        const response = await axios.get(endpoint, {
          withCredentials: true,
        });

        setDetails(response.data.assessment);
        setSubmission(response.data.submission || null);
      } catch (error) {
        console.error(error);
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 403) {
          setAccessError(true);
          toast.error("You don't have permission to view this assessment.");
        } else if (axiosError.response?.status === 404) {
          toast.error("Assessment not found.");
        } else {
          toast.error("Failed to fetch assessment details");
        }
      } finally {
        setLoading(false);
      }
    };

    if (assessmentId) {
      fetchDetails();
    }
  }, [assessmentId, user?.role]);

  const totalMarks = (details?.questions || []).reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">Assessment Details</h3>
          <button onClick={onClose} className="text-gray-500 font-bold text-xl">
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center min-h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : accessError ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to view this assessment.</p>
            </div>
          ) : details ? (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">{details.title}</h1>
              <p className="text-gray-600">{details.description}</p>
              {user?.role === "STUDENT" && submission && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-semibold text-blue-800">Submission Status</h3>
                  <p className="text-sm text-blue-600">
                    Submitted on: {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                  {submission.grade !== undefined && (
                    <p className="text-sm text-blue-600">
                      Grade: {submission.grade}/{totalMarks}
                    </p>
                  )}
                  {submission.feedback && (
                    <p className="text-sm text-blue-600">Feedback: {submission.feedback}</p>
                  )}
                  <p className="text-sm text-blue-600">Status: {submission.status}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <strong>Course:</strong> {details.course.title}
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <strong>Total Marks:</strong> {totalMarks}
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <strong>Due Date:</strong> {new Date(details.dueDate).toLocaleString()}
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <strong>Created By:</strong> {details.createdBy.name}
                </div>
                <div className="p-2 bg-gray-50 rounded col-span-2">
                  <strong>Submission Type:</strong> {details.submissionType}
                </div>
              </div>
              <h2 className="text-xl font-semibold border-t pt-4">
                Questions ({details.questions?.length || 0})
              </h2>
              <div className="space-y-4 mt-4">
                {details.questions?.map((q, index) => (
                  <div key={q.id} className="border-b pb-2">
                    <p className="font-semibold">
                      {index + 1}. {q.text} ({q.marks} marks)
                    </p>
                  </div>
                ))}
                {(!details.questions || details.questions.length === 0) && (
                  <p className="text-gray-500">No embedded questions for this assessment.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-red-600 mb-4">Assessment Not Found</h2>
              <p className="text-gray-600">The requested assessment could not be found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentDetailsModal;
