import React, { useState, useEffect } from "react";
import Loader from "@/components/Loader";
import {
  Download,
  FileText,
  Users,
  BookOpen,
  ClipboardList,
  Award,
  Video,
  Bell,
  UserCheck,
  BarChart3,
  Database,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { exportAPI, type ExportOption } from "@/utils/exportAPI";

interface ExportCard {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "Users" | "Content" | "Assessments" | "System";
  formats: string[];
}

const ExportDashboard: React.FC = () => {
  const [exportOptions, setExportOptions] = useState<ExportOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingStates, setExportingStates] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const getExportCard = (option: ExportOption): ExportCard => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      users: Users,
      courses: BookOpen,
      assessments: ClipboardList,
      "assessment-submissions": FileText,
      quizzes: ClipboardList,
      "quiz-submissions": FileText,
      certificates: Award,
      "live-lectures": Video,
      notifications: Bell,
      enrollments: UserCheck,
      "system-stats": BarChart3,
      complete: Database,
    };

    const categoryMap: Record<string, "Users" | "Content" | "Assessments" | "System"> = {
      users: "Users",
      courses: "Content",
      assessments: "Assessments",
      "assessment-submissions": "Assessments",
      quizzes: "Assessments",
      "quiz-submissions": "Assessments",
      certificates: "Content",
      "live-lectures": "Content",
      notifications: "System",
      enrollments: "Users",
      "system-stats": "System",
      complete: "System",
    };

    return {
      id: option.id,
      name: option.name,
      description: option.description,
      icon: iconMap[option.id] || FileText,
      category: categoryMap[option.id] || "System",
      formats: option.formats,
    };
  };

  useEffect(() => {
    const loadExportOptions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await exportAPI.getExportMenu();
        setExportOptions(response.data.exports);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load export options";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    loadExportOptions();
  }, []);

  const handleExport = async (exportType: string, format: "csv" | "xlsx") => {
    try {
      setExportingStates((prev) => ({ ...prev, [`${exportType}-${format}`]: true }));

      let blob: Blob;
      switch (exportType) {
        case "users":
          blob = await exportAPI.exportUsers(format);
          break;
        case "courses":
          blob = await exportAPI.exportCourses(format);
          break;
        case "assessments":
          blob = await exportAPI.exportAssessments(format);
          break;
        case "assessment-submissions":
          blob = await exportAPI.exportAssessmentSubmissions(format);
          break;
        case "quizzes":
          blob = await exportAPI.exportQuizzes(format);
          break;
        case "quiz-submissions":
          blob = await exportAPI.exportQuizSubmissions(format);
          break;
        case "certificates":
          blob = await exportAPI.exportCertificates(format);
          break;
        case "live-lectures":
          blob = await exportAPI.exportLiveLectures(format);
          break;
        case "notifications":
          blob = await exportAPI.exportNotifications(format);
          break;
        case "enrollments":
          blob = await exportAPI.exportEnrollments(format);
          break;
        case "system-stats":
          blob = await exportAPI.exportSystemStats(format);
          break;
        case "complete":
          blob = await exportAPI.exportAllData();
          break;
        default:
          throw new Error("Unknown export type");
      }
      exportAPI.downloadFile(blob, exportAPI.getFilename(exportType, format));
      toast.success(`${exportType.replace("-", " ")} exported successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingStates((prev) => ({ ...prev, [`${exportType}-${format}`]: false }));
    }
  };

  const groupedExports = exportOptions.reduce<Record<string, ExportCard[]>>((acc, option) => {
    const card = getExportCard(option);
    if (!acc[card.category]) acc[card.category] = [];
    acc[card.category].push(card);
    return acc;
  }, {});

  if (loading) return <Loader message="Loading export options…" />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Failed to Load Exports</h3>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Download className="h-5 w-5 text-orange-500" />
          Export Dashboard
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Export LMS data in CSV or Excel format. Restricted to Super Admin access.
        </p>
      </div>

      {/* Grouped export cards */}
      {Object.entries(groupedExports).map(([category, cards]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide border-l-[3px] border-orange-500 pl-3">
            {category} Exports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-orange-50 p-2.5 rounded-xl flex-shrink-0">
                    <card.icon className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{card.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{card.description}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {card.formats.includes("csv") && (
                    <button
                      onClick={() => handleExport(card.id, "csv")}
                      disabled={exportingStates[`${card.id}-csv`]}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                    >
                      {exportingStates[`${card.id}-csv`] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      CSV
                    </button>
                  )}
                  {card.formats.includes("xlsx") && (
                    <button
                      onClick={() => handleExport(card.id, "xlsx")}
                      disabled={exportingStates[`${card.id}-xlsx`]}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                    >
                      {exportingStates[`${card.id}-xlsx`] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-3 w-3" />
                      )}
                      Excel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Quick Export Actions */}
      <div className="bg-orange-50 rounded-2xl border border-orange-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-orange-500" />
          Quick Export Actions
        </h3>
        <p className="text-xs text-gray-500 mb-4">Common export combinations for quick access</p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExport("complete", "xlsx")}
            disabled={exportingStates["complete-xlsx"]}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {exportingStates["complete-xlsx"] ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
            Complete Export (Excel)
          </button>
          <button
            onClick={() => handleExport("users", "xlsx")}
            disabled={exportingStates["users-xlsx"]}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {exportingStates["users-xlsx"] ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            Users Report
          </button>
          <button
            onClick={() => handleExport("system-stats", "xlsx")}
            disabled={exportingStates["system-stats-xlsx"]}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {exportingStates["system-stats-xlsx"] ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BarChart3 className="h-3.5 w-3.5" />
            )}
            System Analytics
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
        <h4 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Export Information
        </h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>
            CSV files are compatible with Excel, Google Sheets, and other spreadsheet applications
          </li>
          <li>Excel files support multiple sheets and advanced formatting</li>
          <li>Complete export includes all data types in a single Excel file</li>
          <li>All exports include timestamps and are generated in real-time</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportDashboard;
