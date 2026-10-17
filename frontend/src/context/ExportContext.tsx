import React, { useState, useCallback } from "react";
import { exportAPI } from "@/utils/exportAPI";
import { toast } from "sonner";
import { ExportContext } from "./ExportContextBase";
import type { ExportContextType } from "./ExportContextBase";
import type { ExportOption } from "@/utils/exportAPI";

interface ExportProviderProps {
  children: React.ReactNode;
}

export const ExportProvider: React.FC<ExportProviderProps> = ({ children }) => {
  const [exportOptions, setExportOptions] = useState<ExportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingStates, setExportingStates] = useState<Record<string, boolean>>({});

  const loadExportOptions = useCallback(async () => {
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
  }, []);

  const exportData = useCallback(async (exportType: string, format: "csv" | "xlsx") => {
    const stateKey = `${exportType}-${format}`;

    try {
      setExportingStates((prev) => ({ ...prev, [stateKey]: true }));

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

      const filename = exportAPI.getFilename(exportType, format);
      exportAPI.downloadFile(blob, filename);

      toast.success(`${exportType.replace("-", " ")} exported successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Export failed";
      toast.error(errorMessage);
    } finally {
      setExportingStates((prev) => ({ ...prev, [stateKey]: false }));
    }
  }, []);

  const isExporting = useCallback(
    (exportType: string, format: "csv" | "xlsx") => {
      return exportingStates[`${exportType}-${format}`] || false;
    },
    [exportingStates],
  );

  const contextValue: ExportContextType = {
    exportOptions,
    loading,
    error,
    exportingStates,
    loadExportOptions,
    exportData,
    isExporting,
  };

  return <ExportContext.Provider value={contextValue}>{children}</ExportContext.Provider>;
};
