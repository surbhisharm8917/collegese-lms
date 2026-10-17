import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

interface AssignAssistantModalProps {
  assessmentId: string;
  onClose: () => void;
}

const AssignAssistantModal = ({ assessmentId, onClose }: AssignAssistantModalProps) => {
  const [email, setEmail] = useState("");

  const handleAssign = async () => {
    if (!email) return toast.error("Email is required.");
    try {
      const userRes = await axios.post(
        "/api/v1/admin/users/find-by-email",
        { email },
        { withCredentials: true },
      );
      if (!userRes.data.user) return toast.error("User with this email not found.");
      const assistantId = userRes.data.user.id;
      await axios.post(
        `/api/v1/assessments/${assessmentId}/assign-assistant`,
        { assistantId },
        { withCredentials: true },
      );
      toast.success("Assistant granted access!");
      onClose();
    } catch (error) {
      console.log(error);
      toast.error(
        "Failed to assign assistant. They may not be an assistant or are already assigned.",
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center px-4">
      {/* Card */}
      <div
        className="
      w-full max-w-md bg-white shadow-md rounded-md border
      transition-all duration-300 ease-in-out
      hover:shadow-lg hover:border-orange-500
      hover:translate-x-1
    "
      >
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Assign Assistant</h2>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          <label htmlFor="assistantEmail" className="block text-sm font-semibold text-gray-700">
            Assistant’s Email
          </label>
          <input
            type="email"
            id="assistantEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter assistant's email"
            className="
          w-full border border-gray-300 rounded-sm px-3 py-2
          focus:outline-none focus:ring-1 focus:ring-orange-500
          focus:border-orange-500
          transition-all duration-300
        "
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="
          px-5 py-2 rounded-sm text-gray-500 bg-gray-200
          hover:bg-gray-300 transition
        "
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="
          px-5 py-2 rounded-sm text-white bg-orange-600
          hover:bg-orange-700 transition
        "
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignAssistantModal;
