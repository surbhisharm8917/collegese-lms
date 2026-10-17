import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportAPI } from "@/utils/exportAPI";

interface QuickExportProps {
  exportType: string;
  title: string;
  description?: string;
  className?: string;
}

const QuickExport: React.FC<QuickExportProps> = ({
  exportType,
  title,
  description,
  className = "",
}) => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleExport = async (format: "csv" | "xlsx") => {
    const stateKey = `${exportType}-${format}`;

    try {
      setLoading((prev) => ({ ...prev, [stateKey]: true }));

      let blob: Blob;

      switch (exportType) {
        case "users":
          blob = await exportAPI.exportUsers(format);
          break;
        case "courses":
          blob = await exportAPI.exportCourses(format);
          break;
        case "system-stats":
          blob = await exportAPI.exportSystemStats(format);
          break;
        case "complete":
          blob = await exportAPI.exportAllData();
          break;
        default:
          throw new Error(`Export type "${exportType}" not supported in QuickExport`);
      }

      const filename = exportAPI.getFilename(exportType, format);
      exportAPI.downloadFile(blob, filename);

      toast.success(`${title} exported successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Export failed";
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, [stateKey]: false }));
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Download className="h-4 w-4 text-orange-500" />
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>

      {description && <p className="text-sm text-gray-600 mb-3">{description}</p>}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExport("csv")}
          disabled={loading[`${exportType}-csv`]}
          className="flex-1 text-xs"
        >
          {loading[`${exportType}-csv`] ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <FileText className="h-3 w-3 mr-1" />
          )}
          CSV
        </Button>

        <Button
          size="sm"
          onClick={() => handleExport("xlsx")}
          disabled={loading[`${exportType}-xlsx`]}
          className="flex-1 text-xs bg-green-600 hover:bg-green-700"
        >
          {loading[`${exportType}-xlsx`] ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <FileSpreadsheet className="h-3 w-3 mr-1" />
          )}
          Excel
        </Button>
      </div>
    </div>
  );
};

export default QuickExport;
