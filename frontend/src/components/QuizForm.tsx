import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
}

interface QuizFormProps {
  onSubmit: (quizData: {
    title: string;
    description: string;
    courseId: string;
    timeLimit: number;
  }) => void;
  onCancel: () => void;
  initialData?: {
    title: string;
    description: string;
    courseId: string;
    timeLimit?: number;
  };
  courses: Course[];
}

const QuizForm = ({ onSubmit, onCancel, initialData, courses }: QuizFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [timeLimit, setTimeLimit] = useState(10);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setCourseId(initialData.courseId);
      setTimeLimit(initialData.timeLimit || 10);
    } else if (courses.length > 0) {
      setCourseId(courses[0].id);
    }
  }, [initialData, courses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !courseId) {
      toast.error("Quiz Title and Course selection are required.");
      return;
    }
    onSubmit({ title, description, courseId, timeLimit });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4 text-gray-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="course">Select Course</Label>
          <Select value={courseId} onValueChange={setCourseId} required>
            <SelectTrigger
              id="course"
              className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 bg-white text-gray-900"
            >
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent
              className="z-[200] bg-white border border-gray-200 shadow-lg max-h-60 overflow-auto"
              position="popper"
              sideOffset={4}
            >
              {courses.map((course) => (
                <SelectItem
                  key={course.id}
                  value={course.id}
                  className="cursor-pointer hover:bg-gray-100 px-3 py-2 text-gray-900"
                >
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Quiz Title</Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter quiz title"
            className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 bg-white text-gray-900 placeholder-gray-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Enter quiz description"
          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 bg-white text-gray-900 placeholder-gray-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
        <Input
          id="timeLimit"
          type="number"
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value))}
          min="1"
          required
          placeholder="Enter time limit in minutes"
          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 bg-white text-gray-900 placeholder-gray-500"
        />
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="px-6 border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Button>
        <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6">
          {initialData ? "Update Quiz" : "Create Quiz"}
        </Button>
      </div>
    </form>
  );
};

export default QuizForm;
