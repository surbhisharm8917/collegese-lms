import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";

interface Option {
  text: string;
  isCorrect: boolean;
}
interface QuestionPayload {
  text: string;
  marks: number;
  options: Option[];
}

interface BulkAddQuestionsModalProps {
  onSave: (questions: QuestionPayload[]) => Promise<void>;
  onClose: () => void;
}

const BulkAddQuestionsModal = ({ onSave, onClose }: BulkAddQuestionsModalProps) => {
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<QuestionPayload[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const parseText = () => {
    setIsParsing(true);
    try {
      const questionBlocks = rawText.trim().split(/\n\s*\n/);
      const questions: QuestionPayload[] = [];

      for (const block of questionBlocks) {
        const lines = block.split("\n").filter((line) => line.trim() !== "");
        if (lines.length < 2) continue;
        const questionLine = lines[0];
        const marksMatch = questionLine.match(/<(\d+)\s*marks?>/i);
        const marks = marksMatch ? parseInt(marksMatch[1], 10) : 1;
        const text = questionLine.replace(/<.*?>/g, "").trim();
        const options: Option[] = lines.slice(1).map((optLine) => {
          const isCorrect = optLine.startsWith("*");
          const optionText = isCorrect ? optLine.substring(1).trim() : optLine.trim();
          return { text: optionText, isCorrect };
        });
        if (text && options.length >= 2 && options.some((opt) => opt.isCorrect)) {
          questions.push({ text, marks, options });
        }
      }
      setParsedQuestions(questions);
      toast.success(
        `${questions.length} questions parsed successfully. Please review before saving.`,
      );
    } catch (e) {
      console.error("Error parsing text:", e);
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col z-50 bg-white border border-orange-200 shadow-xl p-0">
        <DialogHeader className="p-6 border-b border-orange-200 bg-gradient-to-r from-orange-500 to-orange-600">
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-white text-orange-500 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">
              📝
            </span>
            Bulk Add Questions
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 p-6 grid grid-cols-2 gap-6 overflow-hidden bg-gradient-to-br from-orange-50 to-white">
          {/* Left side - textarea + guide */}
          <div className="flex flex-col">
            <Label htmlFor="rawText" className="font-bold mb-3 text-orange-700 text-lg">
              Paste Your Questions Here
            </Label>

            <Alert className="mb-4 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200 shadow-sm">
              <Lightbulb className="h-5 w-5 text-orange-600" />
              <AlertTitle className="font-bold text-orange-700">Format Guide</AlertTitle>
              <AlertDescription className="text-sm text-orange-700">
                <div className="space-y-2">
                  <div>
                    <strong>Format:</strong> Question text &lt;marks&gt;
                    <br />
                    Option 1<br />
                    *Correct Option
                    <br />
                    Option 3
                  </div>
                  <Separator orientation="horizontal" className="my-2 bg-orange-300" />
                  <div>
                    <strong className="text-orange-800">Example:</strong>
                    <br />
                    What is 2+2? &lt;10 marks&gt;
                    <br />
                    *4
                    <br />
                    2<br />3
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <Textarea
              id="rawText"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full flex-1 border border-orange-200 rounded-lg p-4 font-mono text-sm bg-white focus:border-orange-500 focus:ring focus:ring-orange-200 focus:outline-none transition-all duration-200 resize-none"
              placeholder="What is 2+2? <10 marks>&#10;*4&#10;2&#10;3&#10;&#10;Which planet is red? <5 marks>&#10;*Mars&#10;Earth&#10;Venus"
            />
          </div>

          {/* Right side - preview */}
          <div className="flex flex-col overflow-hidden">
            <Label className="font-bold mb-3 text-orange-700 text-lg">
              Preview ({parsedQuestions.length} questions)
            </Label>

            <div className="flex-1 overflow-y-auto bg-white border border-orange-200 rounded-lg p-4">
              {parsedQuestions.length === 0 ? (
                <div className="text-gray-500 text-center h-full flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl text-orange-400">👁️</span>
                  </div>
                  <p className="font-medium">Preview will appear here after parsing</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Click "Parse & Preview" to see your questions
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {parsedQuestions.map((q, qIndex) => (
                    <div
                      key={qIndex}
                      className="border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4 rounded-lg shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-semibold text-orange-800 flex items-center gap-2">
                          <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-[1.5rem]">
                            {qIndex + 1}
                          </span>
                          {q.text}
                        </p>
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                          {q.marks} marks
                        </span>
                      </div>
                      <ul className="list-none pl-0 space-y-1">
                        {q.options.map((opt, oIndex) => (
                          <li
                            key={oIndex}
                            className={`p-2 rounded-md border flex items-center gap-2 text-sm ${
                              opt.isCorrect
                                ? "border-green-200 bg-green-50 text-green-700 font-semibold"
                                : "border-gray-200 bg-gray-50 text-gray-700"
                            }`}
                          >
                            <span
                              className={`rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ${
                                opt.isCorrect ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                              }`}
                            >
                              {String.fromCharCode(65 + oIndex)}
                            </span>
                            {opt.text}
                            {opt.isCorrect && (
                              <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-bold ml-auto">
                                ✓
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-orange-200 bg-gradient-to-r from-gray-50 to-orange-50 flex justify-between items-center">
          <Button
            onClick={parseText}
            disabled={isParsing || !rawText.trim()}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-2 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            {isParsing ? "Parsing..." : "Parse & Preview"}
          </Button>

          <div className="space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={parsedQuestions.length === 0}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 py-2 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Save All Questions ({parsedQuestions.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAddQuestionsModal;
