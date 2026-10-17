// src/components/exams/ExamDetail.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader";

interface ExamDetailProps {
  id: string;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMins: number;
  totalMarks: number;
  passingMarks: number;
  courseId: string;
}

const ExamDetail: React.FC<ExamDetailProps> = ({ id }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await axios.get(`/api/v1/exams/${id}`);
        setExam(res.data);
      } catch (err) {
        console.error("Error fetching exam details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  if (loading) return <Loader message="Loading exam details…" />;
  if (!exam) return <p>No exam found.</p>;

  return (
    <div className="p-6 bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">{exam.title}</h2>
      <p className="mb-2">{exam.description || "No description provided."}</p>
      <p>Duration: {exam.durationMins} mins</p>
      <p>Total Marks: {exam.totalMarks}</p>
      <p>Passing Marks: {exam.passingMarks}</p>
      <p>Course ID: {exam.courseId}</p>
    </div>
  );
};

export default ExamDetail;
