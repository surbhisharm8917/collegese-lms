import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { uploadVideoToStorage } from "@/lib/uploadVideo";
import { LoaderCircle, Upload } from "lucide-react";

interface Chapter {
  id: string;
  title: string;
  order: number;
}

interface Module {
  id: string;
  title: string;
  order: number;
  chapters: Chapter[];
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  videoUrl?: string;
  duration: number;
  order: number;
  moduleId?: string | null;
  chapterId?: string | null;
  subject?: { id: string; title: string; order: number } | null;
  chapter?: Chapter | null;
}

interface CreateRecordedLectureProps {
  courseId: string;
  onLectureUploaded?: () => void;
}

const CreateRecordedLecture: React.FC<CreateRecordedLectureProps> = ({
  courseId,
  onLectureUploaded,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [order, setOrder] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(true);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [editData, setEditData] = useState({
    title: "",
    description: "",
    duration: "",
    order: "",
    moduleId: "",
    chapterId: "",
  });

  const fetchModules = async () => {
    setIsLoadingModules(true);
    try {
      // Use API instance
      const { data } = await api.get(`/courses/${courseId}/modules`);
      setModules(data.modules || []);
    } catch (err) {
      console.error("Error fetching modules:", err);
    } finally {
      setIsLoadingModules(false);
    }
  };

  const selectedSubject = modules.find((subject) => subject.id === moduleId);
  const availableChapters = selectedSubject?.chapters || [];

  const createSubject = async () => {
    const title = window.prompt("Subject name");
    if (!title?.trim()) return;
    const orderValue = window.prompt("Subject serial number", String(modules.length + 1));
    if (!orderValue) return;
    try {
      const { data } = await api.post(`/courses/${courseId}/modules`, {
        title: title.trim(),
        order: Number(orderValue),
      });
      const subject = { ...data.module, chapters: data.module.chapters || [] } as Module;
      setModules((current) => [...current, subject].sort((a, b) => a.order - b.order));
      setModuleId(subject.id);
      setChapterId("");
      toast.success("Subject created.");
    } catch {
      toast.error("Subject could not be created.");
    }
  };

  const createChapter = async () => {
    if (!moduleId) {
      toast.error("Select a subject first.");
      return;
    }
    const title = window.prompt("Chapter name");
    if (!title?.trim()) return;
    const orderValue = window.prompt("Chapter serial number", String(availableChapters.length + 1));
    if (!orderValue) return;
    try {
      const { data } = await api.post(`/courses/${courseId}/modules/${moduleId}/chapters`, {
        title: title.trim(),
        order: Number(orderValue),
      });
      const chapter = data.chapter as Chapter;
      setModules((current) =>
        current.map((subject) =>
          subject.id === moduleId
            ? {
                ...subject,
                chapters: [...subject.chapters, chapter].sort((a, b) => a.order - b.order),
              }
            : subject,
        ),
      );
      setChapterId(chapter.id);
      toast.success("Chapter created.");
    } catch {
      toast.error("Chapter could not be created. Check its serial number.");
    }
  };

  const fetchLectures = async () => {
    setIsLoadingLectures(true);
    try {
      const { data } = await api.get(`/reclec/courses/${courseId}/lectures`);
      setLectures(data || []);
    } catch (err) {
      console.error("Error fetching lectures:", err);
      toast.error("Failed to fetch lectures.");
    } finally {
      setIsLoadingLectures(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchModules();
      fetchLectures();
    }
  }, [courseId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);
    if (file && file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const durationInSeconds = Math.floor(video.duration);
        if (!isNaN(durationInSeconds) && durationInSeconds > 0) {
          setDuration(durationInSeconds.toString());
        }
        window.URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDuration("");
    setOrder("");
    setModuleId("");
    setChapterId("");
    setVideoFile(null);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
    const fileInput = document.getElementById("video-file") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    if (
      !title.trim() ||
      !duration ||
      isNaN(Number(duration)) ||
      Number(duration) <= 0 ||
      !order ||
      isNaN(Number(order)) ||
      Number(order) < 1 ||
      !moduleId ||
      !chapterId ||
      !videoFile
    ) {
      setError("Please fill out all required fields with valid data.");
      setIsSubmitting(false);
      return;
    }
    const maxFileSize = 20 * 1024 * 1024 * 1024;
    if (videoFile.size > maxFileSize) {
      setError("Video file size must be less than 20 GB.");
      setIsSubmitting(false);
      return;
    }
    if (!videoFile.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      setIsSubmitting(false);
      return;
    }
    try {
      const prepared = await api.post(`/reclec/courses/${courseId}/lectures/upload-url`, {
        fileName: videoFile.name,
        contentType: videoFile.type,
        fileSize: videoFile.size,
      });
      const { uploadUrl, key, uploadToken, headers } = prepared.data;

      await uploadVideoToStorage(videoFile, { uploadUrl, headers }, setUploadProgress);

      await api.post(`/reclec/courses/${courseId}/lectures/complete`, {
        key,
        uploadToken,
        title: title.trim(),
        description: description.trim(),
        duration: Number(duration),
        order: Number(order),
        moduleId,
        chapterId,
      });

      toast.success("Lecture uploaded successfully!");
      setSuccess("Lecture uploaded successfully!");
      resetForm();
      fetchLectures();
      if (onLectureUploaded) {
        onLectureUploaded();
      }
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage =
        (err as any).response?.data?.error ||
        (err as Error).message ||
        "An unknown error occurred.";
      toast.error(errorMessage);
      setError(errorMessage);
      console.error("Upload error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLecture) return;
    setIsUpdating(true);
    try {
      await api.put(`/reclec/lectures/${selectedLecture.id}`, editData);

      toast.success("Lecture updated successfully!");
      setIsEditModalOpen(false);
      setSelectedLecture(null);
      fetchLectures();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage =
        (err as any).response?.data?.error ||
        (err as Error).message ||
        "An unknown error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm("Are you sure you want to delete this lecture?")) {
      return;
    }
    setIsDeleting(lectureId);
    try {
      await api.delete(`/reclec/lectures/${lectureId}`);

      toast.success("Lecture deleted successfully.");
      fetchLectures();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage =
        (err as any).response?.data?.error ||
        (err as Error).message ||
        "An unknown error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(null);
    }
  };

  const openEditModal = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setEditData({
      title: lecture.title,
      description: lecture.description || "",
      duration: lecture.duration.toString(),
      order: lecture.order.toString(),
      moduleId: lecture.moduleId || lecture.subject?.id || "",
      chapterId: lecture.chapterId || lecture.chapter?.id || "",
    });
    setIsEditModalOpen(true);
  };

  const formatDuration = (seconds: string): string => {
    const num = Number(seconds);
    if (isNaN(num)) return "";
    const hours = Math.floor(num / 3600);
    const minutes = Math.floor((num % 3600) / 60);
    const secs = num % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">Upload Recorded Lecture</h1>
        <p className="text-center text-gray-600 mt-2">Upload a new lecture video for this course</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {success}
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter lecture title"
                required
                maxLength={200}
              />
              <p className="text-sm text-gray-500 mt-1">{title.length}/200 characters</p>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                rows={4}
                placeholder="Enter lecture description (optional)"
                maxLength={1000}
              />
              <p className="text-sm text-gray-500 mt-1">{description.length}/1000 characters</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block font-semibold text-gray-700">Subject *</label>
                <button
                  type="button"
                  onClick={() => void createSubject()}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  + New subject
                </button>
              </div>
              <select
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value);
                  setChapterId("");
                }}
                className="w-full rounded-md border border-gray-300 p-3 transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                disabled={isLoadingModules}
                required
              >
                <option value="">Select a subject</option>
                {modules.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.order}. {subject.title}
                  </option>
                ))}
              </select>
              {isLoadingModules && <p className="mt-1 text-sm text-gray-500">Loading subjects…</p>}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block font-semibold text-gray-700">Chapter *</label>
                <button
                  type="button"
                  onClick={() => void createChapter()}
                  disabled={!moduleId}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 disabled:text-gray-300"
                >
                  + New chapter
                </button>
              </div>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-3 transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                disabled={!moduleId}
                required
              >
                <option value="">Select a chapter</option>
                {availableChapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.order}. {chapter.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Duration (seconds) *</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Duration in seconds"
                min="1"
                required
              />
              {duration && (
                <p className="text-sm text-gray-500 mt-1">Duration: {formatDuration(duration)}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Order *</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Lecture order number"
                min="1"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Order in which this lecture appears in the course
              </p>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Video File *</label>
              <input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: MP4, WebM, and MOV. Max size: 20 GB
              </p>
              {videoFile && (
                <div className="mt-2 p-2 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">Selected: {videoFile.name}</p>
                  <p className="text-sm text-gray-500">
                    Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
              {isSubmitting && (
                <div className="mt-3" aria-live="polite">
                  <div className="mb-1 flex justify-between text-xs font-medium text-gray-500">
                    <span>Uploading directly to secure storage</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-orange-500 transition-[width] duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md font-semibold hover:bg-gray-400 transition-colors"
            disabled={isSubmitting}
          >
            Reset Form
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-orange-500 text-white rounded-md font-semibold hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Uploading {uploadProgress}%
              </div>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload lecture
              </span>
            )}
          </button>
        </div>
      </form>
      <hr className="my-8" />
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Existing Lectures</h2>
        {isLoadingLectures ? (
          <div className="flex justify-center items-center py-8 text-gray-500">
            Loading lectures...
          </div>
        ) : lectures.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No lectures uploaded for this course yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">
                    Title
                  </th>
                  <th className="border-b px-4 py-3 text-left font-semibold text-gray-700">
                    Subject / Chapter
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">
                    Order
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">
                    Duration
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {lectures.map((lecture) => (
                  <tr key={lecture.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-800">{lecture.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <p className="font-semibold text-gray-800">
                        {lecture.subject?.title || "Uncategorised"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {lecture.chapter
                          ? `${lecture.chapter.order}. ${lecture.chapter.title}`
                          : "No chapter"}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-gray-800">{lecture.order}</td>
                    <td className="py-3 px-4 text-gray-800">
                      {formatDuration(lecture.duration.toString())}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(lecture)}
                          className="text-blue-600 hover:underline transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLecture(lecture.id)}
                          disabled={isDeleting === lecture.id}
                          className="text-red-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDeleting === lecture.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {isEditModalOpen && selectedLecture && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-bold">Edit Lecture</h4>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateLecture}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium">Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-gray-700">Subject</label>
                  <select
                    value={editData.moduleId}
                    onChange={(e) =>
                      setEditData({ ...editData, moduleId: e.target.value, chapterId: "" })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                    required
                  >
                    <option value="">Select subject</option>
                    {modules.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.order}. {subject.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Chapter</label>
                  <select
                    value={editData.chapterId}
                    onChange={(e) => setEditData({ ...editData, chapterId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                    required
                  >
                    <option value="">Select chapter</option>
                    {(
                      modules.find((subject) => subject.id === editData.moduleId)?.chapters || []
                    ).map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.order}. {chapter.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium">Order</label>
                  <input
                    type="number"
                    value={editData.order}
                    onChange={(e) => setEditData({ ...editData, order: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium">Duration (seconds)</label>
                  <input
                    type="number"
                    value={editData.duration}
                    onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isUpdating ? "Updating..." : "Update Lecture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRecordedLecture;
