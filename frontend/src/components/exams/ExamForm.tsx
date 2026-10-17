/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";

type ExamPayload = {
  id?: string;
  title: string;
  description?: string;
  durationMins: number;
  totalMarks: number;
  passingMarks: number;
  isFinalExam: boolean;
  courseId: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  exam?: ExamPayload | null;
};

interface Course {
  id: string;
  title: string;
}

const ExamForm: React.FC<Props> = ({ open, onClose, onSuccess, exam }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMins, setDurationMins] = useState<number>(30);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number>(40);
  const [isFinalExam, setIsFinalExam] = useState<boolean>(false);
  const [courseId, setCourseId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(exam?.title ?? "");
      setDescription(exam?.description ?? "");
      setDurationMins(exam?.durationMins ?? 30);
      setTotalMarks(exam?.totalMarks ?? 100);
      setPassingMarks(exam?.passingMarks ?? 40);
      setIsFinalExam(exam?.isFinalExam ?? false);
      setCourseId(exam?.courseId ?? "");
    }
  }, [exam, open]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const res = await axios.get("/api/v1/user/courses/dashboard/all");
        if (Array.isArray(res.data.courses)) {
          setCourses(res.data.courses);
        } else {
          setCourses([]);
          toast.error("Invalid course data received from server");
        }
      } catch (err) {
        toast.error("Failed to fetch courses");
      } finally {
        setLoadingCourses(false);
      }
    };
    if (open) {
      fetchCourses();
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !courseId) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (durationMins <= 0) {
      toast.error("Duration must be a positive number.");
      return;
    }
    if (totalMarks <= 0) {
      toast.error("Total marks must be a positive number.");
      return;
    }
    if (passingMarks < 0) {
      toast.error("Passing marks cannot be negative.");
      return;
    }
    if (passingMarks > totalMarks) {
      toast.error("Passing marks cannot be greater than total marks.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: Omit<ExamPayload, "id"> = {
        title,
        description,
        durationMins,
        totalMarks,
        passingMarks,
        isFinalExam,
        courseId,
      };

      if (exam?.id) {
        await axios.put(`/api/v1/exams/${exam.id}`, payload);
        toast.success("Exam updated successfully");
      } else {
        await axios.post("/api/v1/exams", payload);
        toast.success("Exam created successfully");
      }
      onSuccess();
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save exam");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            {exam?.id ? "Edit Exam" : "Create New Exam"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            placeholder="e.g. 'Final Exam: Javascript Basics'"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border-gray-300 rounded-md shadow-sm min-h-[90px] focus:ring-orange-500 focus:border-orange-500"
            placeholder="Provide a brief description of the exam content and purpose."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 mb-1">Duration (mins)*</span>
              <input
                type="number"
                min={1}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., 60"
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 mb-1">Total Marks*</span>
              <input
                type="number"
                min={1}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., 100"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 mb-1">Passing Marks*</span>
              <input
                type="number"
                min={0}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., 40"
                value={passingMarks}
                onChange={(e) => setPassingMarks(Number(e.target.value))}
              />
            </label>
            {loadingCourses ? (
              <div className="w-full h-[42px] flex items-center border rounded-md px-3 py-2 bg-gray-100 text-gray-500">
                Loading courses...
              </div>
            ) : (
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 mb-1">Course*</span>
                <select
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="" disabled>
                    Select Course
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-orange-600 shadow-sm focus:ring-orange-500"
              checked={isFinalExam}
              onChange={(e) => setIsFinalExam(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Mark as Final Exam</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-md font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : exam?.id ? "Update Exam" : "Create Exam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExamForm;
