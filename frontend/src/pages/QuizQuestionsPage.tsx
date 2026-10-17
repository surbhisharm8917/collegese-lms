import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import BulkAddQuestionsModal from "@/components/BulkAddQuestionsModal";

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  type: "MCQ" | "TRUE_FALSE" | "SUBJECTIVE";
  marks: number;
  options: Option[];
}

interface QuestionPayload {
  text: string;
  marks: number;
  options: { text: string; isCorrect: boolean }[];
}

const QuizQuestionsPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionMarks, setNewQuestionMarks] = useState(1);
  const [options, setOptions] = useState<Option[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  useEffect(() => {
    const fetchQuizDetails = async () => {
      try {
        const response = await axios.get(`/api/v1/quizzes/admin/${quizId}/details`, {
          withCredentials: true,
        });
        setQuestions(response.data.quiz.questions || []);
      } catch (err) {
        console.error("Failed to fetch quiz details:", err);
        const axiosError = err as AxiosError<{ message?: string }>;
        setError(axiosError.response?.data?.message || "Failed to fetch quiz details.");
      } finally {
        setLoading(false);
      }
    };
    if (quizId) {
      fetchQuizDetails();
    }
  }, [quizId]);

  const handleOptionChange = (index: number, text: string) => {
    const updatedOptions = [...options];
    updatedOptions[index].text = text;
    setOptions(updatedOptions);
  };

  const handleCorrectOptionChange = (index: number) => {
    const updatedOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(updatedOptions);
  };

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, { text: "", isCorrect: false }]);
    } else {
      toast.info("You can add a maximum of 5 options.");
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    } else {
      toast.warning("A question must have at least 2 options.");
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || options.some((opt) => !opt.text.trim())) {
      toast.error("Question text and all option fields are required.");
      return;
    }
    const payload = {
      text: newQuestionText,
      type: "MCQ",
      marks: newQuestionMarks,
      options: options,
    };
    try {
      const response = await axios.post(`/api/v1/quizzes/admin/${quizId}/questions`, payload, {
        withCredentials: true,
      });
      const newQuestionFromServer = response.data.question;
      if (!newQuestionFromServer.options) newQuestionFromServer.options = [];
      setQuestions([...questions, newQuestionFromServer]);
      toast.success("Question added successfully!");
      setNewQuestionText("");
      setNewQuestionMarks(1);
      setOptions([
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ]);
    } catch (err) {
      console.error("Failed to add question:", err);
      const axiosError = err as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to add question.");
    }
  };

  const handleBulkSave = async (newQuestions: QuestionPayload[]) => {
    const payload = {
      questions: newQuestions.map((q) => ({ ...q, type: "MCQ" })),
    };
    try {
      await axios.post(`/api/v1/quizzes/admin/${quizId}/questions/bulk`, payload, {
        withCredentials: true,
      });
      const response = await axios.get(`/api/v1/quizzes/admin/${quizId}/details`, {
        withCredentials: true,
      });
      setQuestions(response.data.quiz.questions);
      toast.success(`${newQuestions.length} questions added successfully!`);
      setIsBulkModalOpen(false);
    } catch (err) {
      console.error("Failed to save bulk questions:", err);
      toast.error("Failed to save bulk questions.");
    }
  };

  if (loading) return <div className="text-center py-10 text-orange-500">Loading questions...</div>;
  if (error) return <div className="text-center py-10 text-destructive">{error}</div>;

  return (
    <div className="container mx-auto p-4 bg-background z-0">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Questions for Quiz</h1>
        <Button
          onClick={() => setIsBulkModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Bulk Add Questions
        </Button>
      </div>
      <hr className="my-4" />
      <Card className="mb-8 bg-card border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Add New Question (One by One)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <Label htmlFor="questionText">Question Text</Label>
              <Textarea
                id="questionText"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                className="mt-1 bg-card border border-gray-200 focus:border-orange-400 focus:ring focus:ring-orange-200"
                required
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="marks">Marks</Label>
              <Input
                id="marks"
                type="number"
                value={newQuestionMarks}
                onChange={(e) => setNewQuestionMarks(Number(e.target.value))}
                className="mt-1 border border-gray-200 focus:border-orange-400 focus:ring focus:ring-orange-200"
                min="1"
                required
              />
            </div>
            <div>
              <Label>Options (Select the correct answer)</Label>
              <RadioGroup
                onValueChange={(value) => handleCorrectOptionChange(Number(value))}
                value={options.findIndex((opt) => opt.isCorrect).toString()}
              >
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      required
                      className="border border-gray-200 focus:border-orange-400 focus:ring focus:ring-orange-200"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type="button"
                onClick={handleAddOption}
                variant="link"
                className="mt-2 pl-0 text-orange-500 hover:text-orange-600"
              >
                <Plus className="mr-1 h-4 w-4" /> Add Option
              </Button>
            </div>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">
              Add Question
            </Button>
          </form>
        </CardContent>
      </Card>
      <hr className="my-4" />
      <Card className="bg-card border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Existing Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.length > 0 ? (
              questions.map((q, index) => (
                <div key={q.id} className="border-b border-gray-200 pb-4">
                  <p className="font-semibold text-lg">
                    {index + 1}. {q.text} ({q.marks} marks)
                  </p>
                  <ul className="list-disc pl-5 mt-2">
                    {q.options.map((opt) => (
                      <li key={opt.id} className={opt.isCorrect ? "text-green-600 font-bold" : ""}>
                        {opt.text} {opt.isCorrect && "(Correct Answer)"}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">
                No questions have been added to this quiz yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      {isBulkModalOpen && (
        <BulkAddQuestionsModal onSave={handleBulkSave} onClose={() => setIsBulkModalOpen(false)} />
      )}
    </div>
  );
};

export default QuizQuestionsPage;
