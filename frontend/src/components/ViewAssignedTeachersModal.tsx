import { useState, useEffect } from "react";
import axios from "axios";
import Loader from "@/components/Loader";
import { toast } from "sonner";

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface ViewAssignedTeachersModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

const ViewAssignedTeachersModal = ({
  courseId,
  courseTitle,
  onClose,
}: ViewAssignedTeachersModalProps) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await axios.get(`/api/v1/admin/courses/${courseId}/teachers`, {
          withCredentials: true,
        });
        setTeachers(response.data.teachers);
      } catch (error) {
        console.error("Error fetching assigned teachers:", error);
        toast.error("Failed to fetch assigned teachers.");
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [courseId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">Teachers for: {courseTitle}</h3>
          <button onClick={onClose} className="text-gray-500 font-bold text-xl">
            &times;
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <Loader inline message="Loading…" />
          ) : (
            <ul className="space-y-2">
              {teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <li key={teacher.id} className="p-2 bg-gray-100 rounded">
                    <p className="font-semibold">{teacher.name}</p>
                    <p className="text-sm text-gray-600">{teacher.email}</p>
                  </li>
                ))
              ) : (
                <p>No teachers are assigned to this course yet.</p>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewAssignedTeachersModal;
