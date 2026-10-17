import { useContext } from "react";
import { ExportContext } from "./ExportContextBase";
import type { ExportContextType } from "./ExportContextBase";

export const useExport = (): ExportContextType => {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error("useExport must be used within an ExportProvider");
  }
  return context;
};
