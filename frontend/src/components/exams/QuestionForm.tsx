/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FaTimes } from "react-icons/fa";

interface Option {
  id?: string;
  text: string;
  isCorrect?: boolean;
}

interface QuestionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  examId: string;
  question?: {
    id: string;
    text: string;
    questionType?: string;
    options: Option[];
    maxMarks?: number;
    markingScheme?: string;
  };
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  open,
  onClose,
  onSuccess,
  examId,
  question,
}) => {
  const [text, setText] = useState(question?.text || "");
  const [questionType, setQuestionType] = useState(question?.questionType || "MCQ");
  const [maxMarks, setMaxMarks] = useState(
    question?.maxMarks || (questionType === "SUBJECTIVE" ? 5 : 1),
  );
  const [markingScheme, setMarkingScheme] = useState(question?.markingScheme || "");
  const [options, setOptions] = useState<Option[]>(
    question?.options || [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  );
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  // Reset options when switching question type
  const handleQuestionTypeChange = (type: string) => {
    setQuestionType(type);
    if (type === "SUBJECTIVE") {
      setMaxMarks(5);
      setOptions([]);
    } else {
      setMaxMarks(1);
      setOptions([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOptionChange = (index: number, field: string, value: any) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { text: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (questionType === "MCQ") {
      // Check compulsory subjective question
      try {
        const res = await axios.get(`/api/v1/exams/${examId}/questions`);
        const hasSubjective = res.data.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (q: any) => q.questionType === "SUBJECTIVE",
        );
        if (!hasSubjective) {
          toast.error("At least one SUBJECTIVE question is compulsory before adding MCQs.");
          return;
        }
      } catch {
        toast.error("Failed to verify existing questions");
        return;
      }

      if (!options.some((o) => o.isCorrect)) {
        toast.error("At least one correct option required for MCQ");
        return;
      }
      if (options.filter((o) => o.text.trim()).length < 2) {
        toast.error("MCQ requires at least 2 options");
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        text,
        questionType,
        maxMarks,
        ...(questionType === "MCQ" && {
          options: options.filter((o) => o.text.trim()),
        }),
        ...(questionType === "SUBJECTIVE" && { markingScheme }),
      };

      if (question) {
        await axios.put(`/api/v1/exams/questions/${question.id}`, payload);
        toast.success("Question updated successfully");
      } else {
        await axios.post(`/api/v1/exams/${examId}/questions`, payload);
        toast.success("Question added successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Failed to save question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 transform transition-transform duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {question ? "Edit Question" : "Add New Question"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            title="Close"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Question Type Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-3">Question Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="questionType"
                value="MCQ"
                checked={questionType === "MCQ"}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 focus:ring-orange-500"
              />
              <span className="text-gray-700 font-medium">Multiple Choice (MCQ)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="questionType"
                value="SUBJECTIVE"
                checked={questionType === "SUBJECTIVE"}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 focus:ring-orange-500"
              />
              <span className="text-gray-700 font-medium">Subjective (Essay)</span>
            </label>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-1">Question Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter question text here..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors duration-200 resize-none"
          />
        </div>

        {/* Marks */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-1">Maximum Marks</label>
          <input
            type="number"
            value={maxMarks}
            onChange={(e) => setMaxMarks(Number(e.target.value))}
            placeholder="Marks"
            min="1"
            className="w-32 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors duration-200"
          />
        </div>

        {/* MCQ Options */}
        {questionType === "MCQ" && (
          <div className="space-y-4 mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">Options</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionChange(idx, "text", e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors duration-200"
                />
                <div className="flex items-center">
                  <input
                    id={`option-${idx}`}
                    type="checkbox"
                    checked={opt.isCorrect || false}
                    onChange={(e) => handleOptionChange(idx, "isCorrect", e.target.checked)}
                    className="w-5 h-5 text-orange-600 bg-gray-100 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <label
                    htmlFor={`option-${idx}`}
                    className="ml-2 text-gray-700 text-sm font-medium"
                  >
                    Correct
                  </label>
                </div>
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-red-500 hover:text-red-600 p-1 rounded transition-colors"
                    title="Remove option"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors"
            >
              + Add another option
            </button>
          </div>
        )}

        {/* Subjective Marking Scheme */}
        {questionType === "SUBJECTIVE" && (
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Marking Scheme / Rubric (Optional)
            </label>
            <textarea
              value={markingScheme}
              onChange={(e) => setMarkingScheme(e.target.value)}
              placeholder="Describe how this question should be evaluated (key points, marking criteria, etc.)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors duration-200 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will help evaluators grade consistently
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 font-semibold shadow-md disabled:bg-orange-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;
