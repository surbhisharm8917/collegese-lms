import api from "@/lib/api";
import type { AxiosResponse } from "axios";

export interface ExportOption {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  formats: string[];
  note?: string;
}

export interface ExportMenuResponse {
  success: boolean;
  message: string;
  data: {
    totalOptions: number;
    exports: ExportOption[];
    usage: {
      formats: {
        csv: string;
        xlsx: string;
      };
      parameters: {
        format: string;
      };
      examples: string[];
    };
  };
}

export interface ExportError {
  success: false;
  message: string;
}

class ExportAPI {
  private baseURL = "/superadmin/export";

  async getExportMenu(): Promise<ExportMenuResponse> {
    try {
      const response: AxiosResponse<ExportMenuResponse> = await api.get(this.baseURL);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async downloadExport(exportType: string, format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> = await api.get(`${this.baseURL}/${exportType}`, {
        params: { format },
        responseType: "blob",
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async exportUsers(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("users", format);
  }

  async exportCourses(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("courses", format);
  }

  async exportAssessments(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("assessments", format);
  }

  async exportAssessmentSubmissions(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("assessment-submissions", format);
  }

  async exportQuizzes(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("quizzes", format);
  }

  async exportQuizSubmissions(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("quiz-submissions", format);
  }

  async exportCertificates(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("certificates", format);
  }

  async exportLiveLectures(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("live-lectures", format);
  }

  async exportNotifications(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("notifications", format);
  }

  async exportEnrollments(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("enrollments", format);
  }

  async exportSystemStats(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    return this.downloadExport("system-stats", format);
  }

  async exportAllData(): Promise<Blob> {
    return this.downloadExport("complete", "xlsx");
  }

  private handleError(error: unknown): Error {
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { data?: { message?: string }; status?: number } };
      if (axiosError.response?.data?.message) {
        return new Error(axiosError.response.data.message);
      }
      if (axiosError.response?.status === 401) {
        return new Error("Authentication failed. Please login again.");
      }
      if (axiosError.response?.status === 403) {
        return new Error("Access denied. Super admin privileges required.");
      }
      if (axiosError.response?.status === 404) {
        return new Error("Export endpoint not found.");
      }
      if (axiosError.response?.status && axiosError.response.status >= 500) {
        return new Error("Server error. Please try again later.");
      }
    }
    if (error instanceof Error) {
      return new Error(error.message);
    }
    return new Error("An unexpected error occurred.");
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  getFilename(exportType: string, format: "csv" | "xlsx"): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const extension = format === "csv" ? "csv" : "xlsx";

    if (exportType === "complete") {
      return `lms_complete_export_${timestamp}.${extension}`;
    }

    return `lms_${exportType.replace("-", "_")}_${timestamp}.${extension}`;
  }
}

export const exportAPI = new ExportAPI();
