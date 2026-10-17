import { useState, useEffect } from "react";
import BulkAddAssessmentQuestionsModal from "./BulkAddAssessmentQuestionsModal";

interface Course {
  id: string;
  title: string;
}

interface Question {
  text: string;
  marks: number;
}

interface QuestionPayload {
  text: string;
  marks: number;
}

interface AssessmentFormData {
  title: string;
  description: string;
  courseId: string;
  dueDate: string;
  totalMarks: number;
  submissionType: "FILE_UPLOAD" | "TEXT_ENTRY";
  questions: Question[];
}

interface AssessmentFormProps {
  onSubmit: (data: AssessmentFormData) => void;
  onCancel: () => void;
  initialData?: Partial<AssessmentFormData>;
  courses: Course[];
}

const AssessmentForm = ({ onSubmit, onCancel, initialData, courses }: AssessmentFormProps) => {
  const [formData, setFormData] = useState<AssessmentFormData>({
    title: "",
    description: "",
    courseId: courses[0]?.id || "",
    dueDate: "",
    totalMarks: 100,
    submissionType: "FILE_UPLOAD",
    questions: [{ text: "", marks: 10 }],
  });
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        dueDate: initialData.dueDate
          ? new Date(initialData.dueDate).toISOString().split("T")[0]
          : "",
        questions:
          initialData.questions && initialData.questions.length > 0
            ? initialData.questions
            : [{ text: "", marks: 10 }],
      }));
    }
  }, [initialData]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionChange = (index: number, field: "text" | "marks", value: string | number) => {
    const newQuestions = [...formData.questions];
    const questionToUpdate = { ...newQuestions[index], [field]: value };
    newQuestions[index] = questionToUpdate;
    setFormData((prev) => ({ ...prev, questions: newQuestions }));
  };

  const addQuestionField = () =>
    setFormData((prev) => ({ ...prev, questions: [...prev.questions, { text: "", marks: 10 }] }));
  const handleBulkQuestionsSave = async (newQuestions: QuestionPayload[]): Promise<void> => {
    setFormData((prev) => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
    setIsBulkModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6 max-h-[80vh] overflow-y-auto"
      >
        {/* Course */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Course</label>
          <select
            name="courseId"
            value={formData.courseId}
            onChange={handleFormChange}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
            required
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Title</label>
          <input
            name="title"
            value={formData.title}
            onChange={handleFormChange}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
            required
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            rows={3}
            className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
        </div>

        {/* Date & Marks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Due Date</label>
            <input
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleFormChange}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Total Marks</label>
            <input
              name="totalMarks"
              type="number"
              value={formData.totalMarks}
              onChange={handleFormChange}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
              min="1"
            />
          </div>
        </div>

        {/* Submission Type */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Submission Type</label>
          <select
            name="submissionType"
            value={formData.submissionType}
            onChange={handleFormChange}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          >
            <option value="FILE_UPLOAD">File Upload</option>
            <option value="TEXT_ENTRY">Text Entry</option>
          </select>
        </div>

        {/* Embedded Questions */}
        <div className="mb-4 border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Embedded Questions</h4>
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
            >
              Bulk Add
            </button>
          </div>
          {formData.questions.map((q, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <input
                value={q.text}
                onChange={(e) => handleQuestionChange(index, "text", e.target.value)}
                placeholder={`Question ${index + 1}`}
                className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
              <input
                type="number"
                value={q.marks}
                onChange={(e) => handleQuestionChange(index, "marks", Number(e.target.value))}
                className="w-20 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addQuestionField}
            className="text-sm text-blue-500 hover:underline"
          >
            + Add Another Question
          </button>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-sm rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700 transition"
          >
            Save Assessment
          </button>
        </div>
      </form>

      {isBulkModalOpen && (
        <BulkAddAssessmentQuestionsModal
          onSave={handleBulkQuestionsSave}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}
    </>
  );
};

export default AssessmentForm;
