import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

interface AssignTeacherModalProps {
  courseId: string;
  onClose: () => void;
}

const AssignTeacherModal = ({ courseId, onClose }: AssignTeacherModalProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!email.trim()) {
      toast.error("Please enter a teacher's email.");
      return;
    }
    setLoading(true);
    try {
      const userRes = await axios.post(
        "/api/v1/admin/users/find-by-email",
        { email },
        { withCredentials: true },
      );

      if (!userRes.data.success || !userRes.data.user) {
        toast.error("Teacher with that email not found.");
        setLoading(false);
        return;
      }

      const teacherId = userRes.data.user.id;
      await axios.post(
        `/api/v1/admin/courses/${courseId}/assign-teacher`,
        { teacherId },
        { withCredentials: true },
      );

      toast.success("Teacher assigned successfully!");
      onClose();
    } catch (error) {
      console.error("Error assigning teacher:", error);
      toast.error("Failed to assign teacher. They may already be assigned.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">Assign Teacher to Course</h3>
          <button onClick={onClose} className="text-gray-500 font-bold text-xl">
            &times;
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium">Teacher's Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-2 border rounded-md"
              placeholder="Enter teacher email"
            />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={handleAssign}
            disabled={loading}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg"
          >
            {loading ? "Assigning..." : "Assign Teacher"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTeacherModal;
