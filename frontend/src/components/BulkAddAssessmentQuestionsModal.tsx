import { useState } from "react";
import { toast } from "sonner";

interface QuestionPayload {
  text: string;
  marks: number;
}
interface BulkAddQuestionsModalProps {
  onSave: (questions: QuestionPayload[]) => Promise<void>;
  onClose: () => void;
}

const BulkAddAssessmentQuestionsModal = ({ onSave, onClose }: BulkAddQuestionsModalProps) => {
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<QuestionPayload[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const parseText = () => {
    setIsParsing(true);
    try {
      const questionBlocks = rawText.trim().split(/\n\s*\n/);
      const questions: QuestionPayload[] = [];

      for (const block of questionBlocks) {
        const line = block.trim();
        if (!line) continue;

        const marksMatch = line.match(/<(\d+)\s*marks?>/i);
        const marks = marksMatch ? parseInt(marksMatch[1], 10) : 10;
        const text = line.replace(/<.*?>/g, "").trim();

        if (text) {
          questions.push({ text, marks });
        }
      }
      setParsedQuestions(questions);
      toast.success(`${questions.length} questions parsed successfully. Review before saving.`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to parse text. Please check the format.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveAll = () => {
    if (parsedQuestions.length === 0) {
      toast.warning("No questions to save. Please parse your text first.");
      return;
    }
    onSave(parsedQuestions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-4 sm:px-6 py-3 sm:py-4">
          <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 text-center sm:text-left">
            Bulk Add Assessment Questions
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold text-xl sm:text-2xl transition-colors duration-200"
          >
            &times;
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 flex-1 overflow-hidden px-4 sm:px-6 pb-4">
          {/* Left Column - Input */}
          <div className="flex flex-col">
            <h4 className="text-base sm:text-lg font-medium text-gray-700 mb-2">
              Paste Your Questions Here
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
              Format: Question text {"<marks>"}. Separate questions with a blank line.
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full flex-1 min-h-[12rem] sm:min-h-[16rem] p-3 sm:p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs sm:text-sm resize-none"
              placeholder="Explain normalization. <25 marks>..."
            />
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col overflow-y-auto">
            <h4 className="text-base sm:text-lg font-medium text-gray-700 mb-2">Preview</h4>
            {parsedQuestions.length === 0 ? (
              <div className="bg-gray-100 border border-gray-300 rounded-md p-4 min-h-[12rem] sm:min-h-[16rem] flex items-center justify-center text-gray-400 text-sm">
                Preview will appear here
              </div>
            ) : (
              <div className="bg-gray-100 border border-gray-300 rounded-md p-4 min-h-[12rem] sm:min-h-[16rem] overflow-y-auto text-sm sm:text-base">
                {parsedQuestions.map((q, qIndex) => (
                  <div
                    key={qIndex}
                    className="pb-2 mb-2 border-b last:border-b-0 last:pb-0 last:mb-0"
                  >
                    <p className="font-semibold text-gray-700">
                      {qIndex + 1}. {q.text} ({q.marks} marks)
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 border-t px-4 sm:px-6 py-3 sm:py-4">
          <button
            onClick={parseText}
            disabled={isParsing}
            className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
          >
            {isParsing ? "Parsing..." : "Parse & Preview"}
          </button>
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            className="px-4 sm:px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
          >
            Save All Questions
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkAddAssessmentQuestionsModal;
