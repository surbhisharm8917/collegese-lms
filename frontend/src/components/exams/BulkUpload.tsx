import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FaPlus, FaTimes, FaUpload, FaTrash } from "react-icons/fa";

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  marks: number;
  questionType: "MCQ" | "SUBJECTIVE";
  options?: Option[];
  markingScheme?: string;
}

interface BulkUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  examId: string;
}

const createDefaultOptions = (): Option[] => [
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
];

const createDefaultQuestion = (): Question => ({
  text: "",
  marks: 1,
  questionType: "MCQ",
  options: createDefaultOptions(),
  markingScheme: "",
});

const BulkUpload: React.FC<BulkUploadProps> = ({ open, onClose, onSuccess, examId }) => {
  const [questions, setQuestions] = useState<Question[]>([createDefaultQuestion()]);
  const [loading, setLoading] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonInput, setJsonInput] = useState("");

  useEffect(() => {
    if (open) {
      setQuestions([createDefaultQuestion()]);
      setJsonMode(false);
      setJsonInput("");
    }
  }, [open]);

  if (!open) return null;

  const handleQuestionChange = (
    index: number,
    field: keyof Question,
    value: string | number | "MCQ" | "SUBJECTIVE",
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i === index) {
          const updatedQ = { ...q, [field]: value };
          if (field === "questionType") {
            if (value === "SUBJECTIVE") {
              updatedQ.marks = 5;
              delete updatedQ.options;
            } else {
              updatedQ.marks = 1;
              updatedQ.options = q.options?.length ? q.options : createDefaultOptions();
            }
          }
          return updatedQ;
        }
        return q;
      }),
    );
  };

  const handleOptionChange = (
    qIndex: number,
    oIndex: number,
    field: keyof Option,
    value: string | boolean,
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options?.map((o, j) => (j === oIndex ? { ...o, [field]: value } : o)),
            }
          : q,
      ),
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createDefaultQuestion()]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error("You must have at least one question.");
      return;
    }
    if (window.confirm("Are you sure you want to remove this question?")) {
      setQuestions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: [...(q.options || []), { text: "", isCorrect: false }],
            }
          : q,
      ),
    );
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i === qIndex && q.options && q.options.length > 2) {
          return {
            ...q,
            options: q.options.filter((_, j) => j !== oIndex),
          };
        }
        return q;
      }),
    );
  };

  const handleJsonPaste = () => {
    if (!jsonInput.trim()) {
      toast.error("JSON input is empty.");
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of questions.");
      }

      for (const q of parsed) {
        if (
          typeof q.text !== "string" ||
          typeof q.marks !== "number" ||
          (q.questionType !== "MCQ" && q.questionType !== "SUBJECTIVE")
        ) {
          throw new Error(
            "Each object needs 'text', 'marks', and 'questionType' ('MCQ' or 'SUBJECTIVE').",
          );
        }
        if (q.questionType === "MCQ") {
          if (!Array.isArray(q.options))
            throw new Error("MCQ questions must have an 'options' array.");
          for (const o of q.options) {
            if (typeof o.text !== "string" || typeof o.isCorrect !== "boolean") {
              throw new Error("Each option must have 'text' (string) and 'isCorrect' (boolean).");
            }
          }
        }
      }

      setQuestions(parsed);
      toast.success("Questions loaded successfully from JSON!");
      setJsonMode(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(`Invalid JSON: ${err.message}`);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!questions.length) {
        toast.error("There are no questions to save.");
        setLoading(false);
        return;
      }

      // ✅ Ensure at least one subjective question exists
      const hasSubjective = questions.some((q) => q.questionType === "SUBJECTIVE");
      if (!hasSubjective) {
        toast.error("At least one Subjective question is required.");
        setLoading(false);
        return;
      }

      for (const [index, q] of questions.entries()) {
        if (!q.text.trim()) {
          toast.error(`Question ${index + 1} text cannot be empty.`);
          setLoading(false);
          return;
        }
        if (q.questionType === "MCQ") {
          if ((q.options || []).filter((o) => o.text.trim()).length < 2) {
            toast.error(`MCQ Question ${index + 1} must have at least two non-empty options.`);
            setLoading(false);
            return;
          }
          if (!(q.options || []).some((o) => o.isCorrect)) {
            toast.error(`MCQ Question ${index + 1} must have at least one correct option.`);
            setLoading(false);
            return;
          }
        }
      }

      const payload = {
        questions: questions.map((q) => ({
          text: q.text,
          marks: q.marks,
          questionType: q.questionType,
          options: q.questionType === "MCQ" ? (q.options || []).filter((o) => o.text.trim()) : [],
          ...(q.questionType === "SUBJECTIVE" && {
            markingScheme: q.markingScheme,
          }),
        })),
      };

      await axios.post(`/api/v1/exams/${examId}/questions/bulk`, payload);
      toast.success("Questions added successfully!");
      onSuccess();
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create questions");
    } finally {
      setLoading(false);
    }
  };

  const toggleJsonMode = () => {
    const hasManualData = questions.length > 1 || questions[0]?.text.trim() !== "";
    if (!jsonMode && hasManualData) {
      if (
        !window.confirm(
          "Switching to JSON mode will discard your current manual entries. Continue?",
        )
      ) {
        return;
      }
    }
    setJsonMode(!jsonMode);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Upload Questions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Close">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="mb-4 flex justify-end flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
            <input
              type="checkbox"
              checked={jsonMode}
              onChange={toggleJsonMode}
              className="form-checkbox h-5 w-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
            />
            Use JSON Input
          </label>
        </div>

        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
          {jsonMode ? (
            <div>
              <textarea
                placeholder='[{"text":"MCQ Question?","marks":1,"questionType":"MCQ","options":[...]}, {"text":"Subjective Question?","marks":5,"questionType":"SUBJECTIVE","markingScheme":"..."}]'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 h-96 font-mono text-sm"
              />
              <button
                onClick={handleJsonPaste}
                className="mt-3 flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
              >
                <FaUpload /> Load from JSON
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, qi) => (
                <div
                  key={qi}
                  className="p-6 rounded-lg border border-gray-200 bg-gray-50/80 relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <label className="block text-gray-800 text-lg font-semibold">
                      Question {qi + 1}
                    </label>
                    <button
                      onClick={() => removeQuestion(qi)}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Remove Question"
                      disabled={questions.length <= 1}
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="MCQ"
                          name={`qtype-${qi}`}
                          checked={q.questionType === "MCQ"}
                          onChange={(e) =>
                            handleQuestionChange(qi, "questionType", e.target.value as "MCQ")
                          }
                        />{" "}
                        MCQ
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="SUBJECTIVE"
                          name={`qtype-${qi}`}
                          checked={q.questionType === "SUBJECTIVE"}
                          onChange={(e) =>
                            handleQuestionChange(qi, "questionType", e.target.value as "SUBJECTIVE")
                          }
                        />{" "}
                        Subjective
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Text
                      </label>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => handleQuestionChange(qi, "text", e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                      <input
                        type="number"
                        value={q.marks}
                        min="1"
                        onChange={(e) => handleQuestionChange(qi, "marks", Number(e.target.value))}
                        className="w-full border-gray-300 rounded-lg shadow-sm"
                      />
                    </div>
                  </div>

                  {q.questionType === "MCQ" ? (
                    <div className="mt-4 space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Options</label>
                      {(q.options || []).map((o, oi) => (
                        <div key={oi} className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder={`Option ${oi + 1}`}
                            value={o.text}
                            onChange={(e) => handleOptionChange(qi, oi, "text", e.target.value)}
                            className="flex-1 border-gray-300 rounded-lg shadow-sm"
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={o.isCorrect}
                              onChange={(e) =>
                                handleOptionChange(qi, oi, "isCorrect", e.target.checked)
                              }
                              className="w-5 h-5 text-orange-500 rounded"
                            />
                            <span className="text-sm">Correct</span>
                          </label>
                          <button
                            onClick={() => removeOption(qi, oi)}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-40"
                            disabled={(q.options || []).length <= 2}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(qi)}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        + Add Option
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marking Scheme / Rubric
                      </label>
                      <textarea
                        value={q.markingScheme}
                        onChange={(e) => handleQuestionChange(qi, "markingScheme", e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm"
                        rows={3}
                      ></textarea>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={addQuestion}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                <FaPlus /> Add Another Question
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8 flex-shrink-0">
          <button onClick={onClose} className="px-6 py-3 border rounded-lg font-medium">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
              "Save All Questions"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
