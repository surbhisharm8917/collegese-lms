import { useState, useEffect } from "react";
import axios from "axios";
import Loader from "@/components/Loader";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  X,
  Users,
  Award,
  Clock,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Submission {
  id: string;
  score: number | null;
  status: string;
  submittedAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface QuizSubmissionsModalProps {
  quizId: string;
  onClose: () => void;
}

const QuizSubmissionsModal = ({ quizId, onClose }: QuizSubmissionsModalProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await axios.get(`/api/v1/quizzes/admin/${quizId}/submissions`, {
          withCredentials: true,
        });
        setSubmissions(response.data.submissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        toast.error("Failed to fetch submissions.");
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [quizId]);

  const completedSubmissions = submissions.filter((sub) => sub.score !== null);
  const averageScore =
    completedSubmissions.length > 0
      ? (
          completedSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0) /
          completedSubmissions.length
        ).toFixed(1)
      : 0;
  const highestScore =
    completedSubmissions.length > 0
      ? Math.max(...completedSubmissions.map((sub) => sub.score || 0))
      : 0;

  const totalPages = Math.ceil(submissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = submissions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getStatusIcon = (status: string, score: number | null) => {
    if (score !== null) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (status === "PENDING") {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (status: string, score: number | null) => {
    if (score !== null) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    }
    if (status === "PENDING") {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{status}</Badge>;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500";
    if (score >= 80) return "text-green-600 font-semibold";
    if (score >= 60) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6" />
            <div>
              <h3 className="text-xl font-semibold">Student Submissions</h3>
              <p className="text-orange-100 text-sm">View and manage quiz submissions</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading && <Loader message="Loading submissions…" />}
          {!loading && (
            <div className="space-y-6">
              {submissions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Users className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Total Submissions</p>
                        <p className="text-2xl font-bold text-orange-900">{submissions.length}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Completed</p>
                        <p className="text-2xl font-bold text-green-900">
                          {completedSubmissions.length}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-800">Average Score</p>
                        <p className="text-2xl font-bold text-purple-900">{averageScore}%</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Award className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Highest Score</p>
                        <p className="text-2xl font-bold text-orange-900">{highestScore}%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Submissions Details
                    {submissions.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {submissions.length} total
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {submissions.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-orange-100 to-orange-200">
                              <TableHead className="text-orange-700 font-semibold">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Student
                                </div>
                              </TableHead>
                              <TableHead className="text-orange-700 font-semibold">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  Email
                                </div>
                              </TableHead>
                              <TableHead className="text-orange-700 font-semibold">
                                <div className="flex items-center gap-2">
                                  <Award className="h-4 w-4" />
                                  Score
                                </div>
                              </TableHead>
                              <TableHead className="text-orange-700 font-semibold">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  Status
                                </div>
                              </TableHead>
                              <TableHead className="text-orange-700 font-semibold">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Submitted At
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentSubmissions.map((submission) => (
                              <TableRow
                                key={submission.id}
                                className="hover:bg-orange-50 transition-colors duration-200"
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-white text-sm font-semibold">
                                      {submission.user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-gray-900">{submission.user.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {submission.user.email}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(submission.status, submission.score)}
                                    <span
                                      className={`font-medium ${getScoreColor(submission.score)}`}
                                    >
                                      {submission.score !== null
                                        ? `${submission.score}%`
                                        : "Pending"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(submission.status, submission.score)}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    {new Date(submission.submittedAt).toLocaleDateString()} at{" "}
                                    {new Date(submission.submittedAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-700">
                              Showing {startIndex + 1} to {Math.min(endIndex, submissions.length)}{" "}
                              of {submissions.length} submissions
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={goToPreviousPage}
                              disabled={currentPage === 1}
                              className="flex items-center border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                if (
                                  page === 1 ||
                                  page === totalPages ||
                                  (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                  return (
                                    <Button
                                      key={page}
                                      variant={currentPage === page ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => goToPage(page)}
                                      className={
                                        currentPage === page
                                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                                      }
                                    >
                                      {page}
                                    </Button>
                                  );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                  return (
                                    <span key={page} className="px-2 text-gray-500">
                                      ...
                                    </span>
                                  );
                                }
                                return null;
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={goToNextPage}
                              disabled={currentPage === totalPages}
                              className="flex items-center border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="h-16 w-16 text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No submissions yet.</p>
                      <p className="text-gray-400 text-sm mt-2">
                        Students haven't started taking this quiz yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {submissions.length > 0 && (
                <span>
                  {completedSubmissions.length} of {submissions.length} submissions completed
                </span>
              )}
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSubmissionsModal;
