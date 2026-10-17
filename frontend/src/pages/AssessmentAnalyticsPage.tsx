import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import Loader from "@/components/Loader";

interface AnalyticsData {
  averageGrade: number;
  submissionCount: number;
  highestGrade: number;
  lowestGrade: number;
}

const AssessmentAnalyticsPage = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) {
      setError("Assessment ID is required");
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/v1/assessments/${assessmentId}/analytics`, {
          withCredentials: true,
        });
        setAnalytics(response.data.analytics);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        const axiosError = err as AxiosError;
        const errorMessage =
          (axiosError.response?.data as { message?: string })?.message ||
          "Failed to load analytics";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [assessmentId]);

  if (loading) {
    return <Loader message="Loading analytics\u2026" />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4 text-sm sm:text-base">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm sm:text-base"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-gray-500 py-12 text-sm sm:text-base">
          <p>No analytics data available for this assessment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center sm:text-left">
          Assessment Analytics
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-orange-500 text-white px-4 py-2 rounded shadow hover:bg-orange-600 transition text-sm sm:text-base w-full sm:w-auto"
        >
          Back to Assessment
        </button>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Average Grade */}
        <div className="relative group border rounded-lg shadow-sm overflow-hidden cursor-pointer bg-white">
          <div className="absolute left-0 top-0 h-full w-1 bg-orange-500"></div>
          <div className="absolute inset-0 bg-orange-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
          <div className="relative z-10 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 group-hover:text-white transition-colors">
              Average Grade
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 group-hover:text-white transition-colors">
              {analytics.averageGrade.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Total Submissions */}
        <div className="relative group border rounded-lg shadow-sm overflow-hidden cursor-pointer bg-white">
          <div className="absolute left-0 top-0 h-full w-1 bg-orange-500"></div>
          <div className="absolute inset-0 bg-orange-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
          <div className="relative z-10 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 group-hover:text-white transition-colors">
              Total Submissions
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 group-hover:text-white transition-colors">
              {analytics.submissionCount}
            </p>
          </div>
        </div>

        {/* Highest Grade */}
        <div className="relative group border rounded-lg shadow-sm overflow-hidden cursor-pointer bg-white">
          <div className="absolute left-0 top-0 h-full w-1 bg-orange-500"></div>
          <div className="absolute inset-0 bg-orange-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
          <div className="relative z-10 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 group-hover:text-white transition-colors">
              Highest Grade
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 group-hover:text-white transition-colors">
              {analytics.highestGrade}%
            </p>
          </div>
        </div>

        {/* Lowest Grade */}
        <div className="relative group border rounded-lg shadow-sm overflow-hidden cursor-pointer bg-white">
          <div className="absolute left-0 top-0 h-full w-1 bg-orange-500"></div>
          <div className="absolute inset-0 bg-orange-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
          <div className="relative z-10 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 group-hover:text-white transition-colors">
              Lowest Grade
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 group-hover:text-white transition-colors">
              {analytics.lowestGrade}%
            </p>
          </div>
        </div>
      </div>

      {/* No Submissions Message */}
      {analytics.submissionCount === 0 && (
        <div className="bg-orange-100 text-orange-700 text-center py-3 px-4 rounded text-sm sm:text-base">
          No submissions yet. Analytics will be available once students start submitting.
        </div>
      )}
    </div>
  );
};

export default AssessmentAnalyticsPage;
