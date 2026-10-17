import { createContext } from "react";
import type { ExportOption } from "@/utils/exportAPI";

export interface ExportContextType {
  exportOptions: ExportOption[];
  loading: boolean;
  error: string | null;
  exportingStates: Record<string, boolean>;
  loadExportOptions: () => Promise<void>;
  exportData: (exportType: string, format: "csv" | "xlsx") => Promise<void>;
  isExporting: (exportType: string, format: "csv" | "xlsx") => boolean;
}

export const ExportContext = createContext<ExportContextType | undefined>(undefined);
