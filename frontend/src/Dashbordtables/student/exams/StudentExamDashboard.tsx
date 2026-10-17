import { useState } from "react";
import { ClipboardList, CheckCircle2, GraduationCap } from "lucide-react";
import MyAttempts from "./MyAttempts";
import AvailableExams from "./AvailableExams";

type View = "availableExams" | "myAttempts";

const StudentExamDashboard = () => {
  const [currentView, setCurrentView] = useState<View>("availableExams");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-50 p-2.5 rounded-xl">
          <GraduationCap className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Exam Dashboard</h1>
          <p className="text-xs text-gray-400">Take exams and track your progress</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setCurrentView("availableExams")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            currentView === "availableExams"
              ? "bg-white text-orange-600 shadow-sm border border-gray-100"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Available Exams
        </button>
        <button
          onClick={() => setCurrentView("myAttempts")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            currentView === "myAttempts"
              ? "bg-white text-orange-600 shadow-sm border border-gray-100"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          My Attempts
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 min-h-[400px]">
        {currentView === "availableExams" ? <AvailableExams /> : <MyAttempts />}
      </div>
    </div>
  );
};

export default StudentExamDashboard;
