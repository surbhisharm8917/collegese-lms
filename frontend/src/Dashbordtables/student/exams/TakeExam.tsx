/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FaArrowLeft,
  FaArrowRight,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaCamera,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

interface Option {
  id: string;
  text: string;
}
interface Question {
  id: string;
  text: string;
  options: Option[];
  questionType: "MCQ" | "SUBJECTIVE";
  maxMarks?: number;
}
interface Exam {
  id: string;
  title: string;
  description: string;
  durationMins: number;
  totalMarks: number;
  passingMarks: number;
}
interface ExamAttempt {
  id: string;
  expiresAt: string;
  answers?: Record<string, string>;
  startedAt: string;
  completedAt?: string;
  isCancelled?: boolean;
}
interface AttemptStatus {
  hasAttempted: boolean;
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  canRetake: boolean;
  lastAttemptScore?: number;
  lastAttemptDate?: string;
  isPassed?: boolean;
  isCancelled?: boolean;
}
interface TakeExamProps {
  examId: string;
  onExamEnd: (attemptId: string) => void;
  onBack?: () => void;
}

const TakeExam: React.FC<TakeExamProps> = ({ examId, onExamEnd, onBack }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<AttemptStatus | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [examState, setExamState] = useState<
    "loading" | "instructions" | "active" | "completed" | "expired" | "cancelled" | "error"
  >("loading");
  const [violationCount, setViolationCount] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [videoVisible, setVideoVisible] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedOnceRef = useRef(false);

  useEffect(() => {
    const initExam = async () => {
      try {
        setLoading(true);
        const examRes = await axios.get(`/api/v1/exams/${examId}`);
        setExam(examRes.data);
        const statusRes = await axios.get(`/api/v1/exams/${examId}/attempt/status`);
        const status: AttemptStatus = statusRes.data;
        setAttemptStatus(status);
        if (status.status === "completed") {
          setExamState("completed");
        } else if (status.status === "cancelled") {
          setExamState("cancelled");
        } else if (status.status === "in_progress") {
          await resumeExistingAttempt();
        } else if (status.status === "not_started") {
          setExamState("instructions");
          setShowInstructions(true);
        }
      } catch (err: any) {
        console.error("Failed to initialize exam:", err);
        toast.error(err.response?.data?.error ?? "Failed to load exam");
        setExamState("error");
      } finally {
        setLoading(false);
      }
    };
    initExam();
  }, [examId]);

  const resumeExistingAttempt = async () => {
    try {
      const attemptsRes = await axios.get(`/api/v1/exams/attempts/me?examId=${examId}`);
      const incompleteAttempt = attemptsRes.data.find((a: any) => !a.completedAt && !a.isCancelled);
      if (!incompleteAttempt) {
        setExamState("instructions");
        setShowInstructions(true);
        return;
      }
      const expiresAt =
        new Date(incompleteAttempt.startedAt).getTime() + (exam?.durationMins ?? 0) * 60 * 1000;
      const now = Date.now();
      if (now >= expiresAt) {
        toast.error("Your previous attempt has expired");
        setExamState("expired");
        return;
      }
      setAttempt(incompleteAttempt);
      setAnswers(incompleteAttempt.answers ?? {});
      const questionsRes = await axios.get(`/api/v1/exams/${examId}/questions`);
      setQuestions(questionsRes.data);
      const remainingTime = Math.floor((expiresAt - now) / 1000);
      setTimeLeft(remainingTime);
      setExamState("active");
      await startRecording();
      toast.info("Resuming your previous attempt");
    } catch (err) {
      console.error("Failed to resume attempt:", err);
      toast.error("Failed to resume previous attempt");
      setExamState("error");
    }
  };

  const startNewAttempt = async () => {
    try {
      setLoading(true);
      const startRes = await axios.post(`/api/v1/exams/${examId}/start`);
      const newAttempt = startRes.data;
      setAttempt(newAttempt);
      setAnswers({});
      const questionsRes = await axios.get(`/api/v1/exams/${examId}/questions`);
      setQuestions(questionsRes.data);
      const expiresAt = new Date(newAttempt.expiresAt).getTime();
      const remainingTime = Math.floor((expiresAt - Date.now()) / 1000);
      setTimeLeft(remainingTime);
      setExamState("active");
      await startRecording();
    } catch (err: any) {
      console.error("Failed to start exam:", err);
      toast.error(err.response?.data?.error ?? "Failed to start exam");
      setExamState("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || examState !== "active" || submitting || cancelling) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, examState, submitting, cancelling]);

  useEffect(() => {
    if (examState !== "active") return;
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.warning("Please enable fullscreen for a better exam experience.");
      });
    }
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && examState === "active") {
        handleViolation("Exited fullscreen mode");
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden && examState === "active") {
        handleViolation("Switched tabs or minimized window");
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation("Attempted to open context menu");
    };
    const forbiddenKeys = ["F12", "F11"];
    const forbiddenCombos: {
      ctrl?: boolean;
      shift?: boolean;
      alt?: boolean;
      key: string;
    }[] = [
      { ctrl: true, shift: true, key: "I" },
      { ctrl: true, shift: true, key: "C" },
      { ctrl: true, shift: true, key: "J" },
      { ctrl: true, key: "U" },
      { alt: true, key: "Tab" },
    ];
    const matchesCombo = (
      c: { ctrl?: boolean; shift?: boolean; alt?: boolean; key: string },
      e: KeyboardEvent,
    ) => {
      const ctrlOk = c.ctrl ? e.ctrlKey : true;
      const shiftOk = c.shift ? e.shiftKey : true;
      const altOk = c.alt ? e.altKey : true;
      return ctrlOk && shiftOk && altOk && e.key.toUpperCase() === c.key.toUpperCase();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (forbiddenKeys.includes(e.key)) {
        e.preventDefault();
        handleViolation(`Pressed forbidden key: ${e.key}`);
        return;
      }
      for (const combo of forbiddenCombos) {
        if (matchesCombo(combo, e)) {
          e.preventDefault();
          handleViolation(`Attempted forbidden key combination`);
          return;
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [examState, violationCount]);

  const handleViolation = (reason: string) => {
    const newCount = violationCount + 1;
    setViolationCount(newCount);
    if (newCount >= 3) {
      toast.error(`${reason}. Exam will be auto-submitted due to multiple violations.`);
      setTimeout(() => handleSubmit(true), 2000);
    } else {
      toast.warning(`${reason}. Warning ${newCount}/3 - Be careful!`);
    }
  };

  useEffect(() => {
    if (examState === "active" && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch((err) => {
        console.error("Error playing video:", err);
      });
    }
  }, [examState, videoRef.current, streamRef.current]);

  const startRecording = async () => {
    try {
      if (startedOnceRef.current && streamRef.current) {
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          await videoRef.current.play();
        }
        return;
      }

      setCameraError("");
      setIsRecording(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;
      setCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      let mimeType = "video/webm";
      if (MediaRecorder.isTypeSupported("video/webm; codecs=vp9,opus")) {
        mimeType = "video/webm; codecs=vp9,opus";
      } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8,opus")) {
        mimeType = "video/webm; codecs=vp8,opus";
      } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp9")) {
        mimeType = "video/webm; codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8")) {
        mimeType = "video/webm; codecs=vp8";
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstart = () => {
        setIsRecording(true);
      };
      mediaRecorder.onstop = () => {
        setIsRecording(false);
      };
      mediaRecorder.onerror = () => {
        setIsRecording(false);
        setCameraError("Recording error occurred");
      };
      mediaRecorder.start(1000);
      startedOnceRef.current = true;
      toast.success("Camera and microphone recording started successfully");
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      setCameraPermission(false);
      setIsRecording(false);
      let errorMessage = "Failed to access camera/microphone. ";
      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera and microphone permissions and refresh the page.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera or microphone found on this device.";
      } else if (error.name === "NotReadableError") {
        errorMessage += "Camera/microphone is being used by another application.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage += "Camera/microphone constraints cannot be satisfied.";
      } else {
        errorMessage += `Please check your camera and microphone settings. Error: ${error.message}`;
      }
      setCameraError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const stopRecording = async (): Promise<void> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
          setIsRecording(false);
          resolve();
        };
        mediaRecorderRef.current.stop();
      } else {
        setIsRecording(false);
        resolve();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    });
  };

  const uploadRecording = async (attemptId: string) => {
    if (recordedChunksRef.current.length === 0) return;
    try {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const prepared = await axios.post(`/api/v1/exams/attempt/${attemptId}/recording/upload-url`, {
        contentType: blob.type,
        fileSize: blob.size,
      });
      await axios.put(prepared.data.uploadUrl, blob, {
        headers: prepared.data.headers,
        withCredentials: false,
        timeout: 0,
      });
      await axios.post(`/api/v1/exams/attempt/${attemptId}/recording/complete`, {
        key: prepared.data.key,
        uploadToken: prepared.data.uploadToken,
      });
    } catch (error) {
      console.error("Failed to upload recording:", error);
      toast.warning("Recording upload failed, but exam submission was successful");
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleTimeUp = () => {
    toast.error("Time's up! Submitting your exam automatically.");
    handleSubmit(true);
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      await stopRecording();
      const res = await axios.post(`/api/v1/exams/attempt/${attempt.id}/submit`, {
        answers,
        autoSubmit,
      });
      uploadRecording(attempt.id).catch(console.error);
      if (autoSubmit) {
        toast.success("Exam auto-submitted successfully!");
      } else {
        toast.success("Exam submitted successfully!");
      }
      setExamState("completed");
      onExamEnd(res.data.id);
    } catch (err: any) {
      console.error("Failed to submit exam:", err);
      toast.error(err.response?.data?.error ?? "Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelExam = async () => {
    if (!attempt || cancelling) return;
    setCancelling(true);
    try {
      await stopRecording();
      await axios.post(`/api/v1/exams/attempt/${attempt.id}/cancel`);
      toast.success("Exam cancelled successfully");
      setExamState("cancelled");
      setShowCancelConfirm(false);
    } catch (err: any) {
      console.error("Failed to cancel exam:", err);
      toast.error(err.response?.data?.error ?? "Failed to cancel exam");
    } finally {
      setCancelling(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).filter((id) => answers[id]).length;
  };

  const themePrimary = "orange-500";
  const themeAccent = "orange-600";
  const themeHover = "orange-700";
  const themeLight = "orange-100";
  const themeText = "orange-700";

  const getButtonClass = (primary = true) =>
    `px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      primary
        ? `bg-${themeAccent} text-white hover:bg-${themeHover}`
        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
    }`;

  const getCardClass = () => "bg-white p-6 rounded-xl shadow-md";
  const getHighlightClass = (type: "positive" | "negative") =>
    `p-4 rounded-lg text-sm mb-4 ${
      type === "positive" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-16 w-16 border-b-2 border-${themeAccent} mx-auto`}
          ></div>
          <p className="mt-4 text-lg text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (examState === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className={getCardClass()}>
          <FaExclamationTriangle className="text-red-500 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Exam</h2>
          <p className="text-gray-600 mb-4">
            There was a problem loading the exam. Please try again or contact support.
          </p>
          {onBack && (
            <button onClick={onBack} className={getButtonClass()}>
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (examState === "completed") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className={getCardClass()}>
          <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Exam Completed</h2>
          <p className="text-gray-600 mb-4">
            {attemptStatus?.status === "completed"
              ? "You have already completed this exam."
              : "Your exam has been submitted successfully!"}
          </p>
          <div className={`mb-4 p-4 rounded-lg bg-${themeLight}`}>
            <p className={`text-sm text-${themeText}`}>
              Results will be processed and shared via email within 24-48 hours.
            </p>
          </div>
          {onBack && (
            <button onClick={onBack} className={getButtonClass()}>
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (examState === "cancelled") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className={getCardClass()}>
          <FaTimesCircle className="text-red-500 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Exam Cancelled</h2>
          <p className="text-gray-600 mb-4">
            Your exam attempt has been cancelled. You cannot retake this exam.
          </p>
          <div className={getHighlightClass("negative")}>
            <p className="text-sm">
              Since you cancelled the exam, no further attempts are allowed for this exam.
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (examState === "expired") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className={getCardClass()}>
          <FaClock className={`text-${themePrimary} text-6xl mx-auto mb-4`} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Exam Expired</h2>
          <p className="text-gray-600 mb-4">
            Your previous exam attempt has expired.
            {attemptStatus?.canRetake
              ? " You can start a new attempt."
              : " No more attempts available."}
          </p>
          <div className="flex gap-3 justify-center">
            {onBack && (
              <button
                onClick={onBack}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
            )}
            {attemptStatus?.canRetake && (
              <button
                onClick={() => {
                  setExamState("instructions");
                  setShowInstructions(true);
                }}
                className={getButtonClass()}
              >
                Start New Attempt
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (examState === "instructions" && showInstructions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className={getCardClass()}>
          <h2 className="text-3xl font-bold text-center mb-6">{exam?.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
            <div className={`p-4 rounded-lg bg-${themeLight}`}>
              <FaClock className={`text-${themePrimary} text-2xl mx-auto mb-2`} />
              <p className={`font-semibold text-${themeText}`}>Duration</p>
              <p className={`text-${themePrimary}`}>{exam?.durationMins} minutes</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg">
              <p className="font-semibold text-green-700">Total Marks</p>
              <p className="text-green-600">{exam?.totalMarks}</p>
            </div>
            <div className="p-4 bg-yellow-100 rounded-lg">
              <p className="font-semibold text-yellow-700">Passing Marks</p>
              <p className="text-yellow-600">{exam?.passingMarks}</p>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Exam Instructions</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className={`text-${themePrimary} font-bold`}>•</span>Stay in full-screen mode
                throughout the exam
              </li>
              <li className="flex items-start gap-2">
                <span className={`text-${themePrimary} font-bold`}>•</span>Do not switch tabs,
                minimize window, or navigate away
              </li>
              <li className="flex items-start gap-2">
                <span className={`text-${themePrimary} font-bold`}>•</span>Your webcam and
                microphone will be recorded for proctoring
              </li>
              <li className="flex items-start gap-2">
                <span className={`text-${themePrimary} font-bold`}>•</span>
                Answer all questions before the time expires
              </li>
              <li className="flex items-start gap-2">
                <span className={`text-${themePrimary} font-bold`}>•</span>The exam will auto-submit
                when time runs out
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">⚠️</span>3 violations will result in
                automatic submission
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">❌</span>Once cancelled, you cannot retake
                this exam
              </li>
              <li className="flex items-start gap-2">
                <span className={`text-${themePrimary} font-bold`}>📧</span>
                Results will be emailed within 24-48 hours
              </li>
            </ul>
          </div>
          <div className="flex gap-4 justify-center">
            {onBack && (
              <button onClick={onBack} className={getButtonClass(false)}>
                Go Back
              </button>
            )}
            <button
              onClick={() => {
                setShowInstructions(false);
                startNewAttempt();
              }}
              disabled={loading}
              className={getButtonClass()}
            >
              {loading ? "Starting..." : "Start Exam"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (examState === "active" && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const answeredCount = getAnsweredCount();
    const isTimeRunningOut = timeLeft !== null && timeLeft < 300;
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{exam?.title}</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length} &nbsp; Answered:{" "}
                  {answeredCount}/{questions.length}
                </p>
              </div>
              <div className="mt-4 md:mt-0 text-right flex items-center gap-4">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                  disabled={submitting || cancelling}
                >
                  Cancel Exam
                </button>
                <div>
                  <div
                    className={`text-2xl font-bold ${
                      isTimeRunningOut ? "text-red-600" : `text-${themeAccent}`
                    }`}
                  >
                    <FaClock className="inline mr-2" />
                    {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
                  </div>
                  {violationCount > 0 && (
                    <p className="text-sm text-red-600">Violations: {violationCount}/3</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  Question {currentQuestionIndex + 1}
                  {currentQuestion.maxMarks && (
                    <span className="text-sm text-gray-500 ml-2">
                      [{currentQuestion.maxMarks} marks]
                    </span>
                  )}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-6">{currentQuestion.text}</p>
              </div>

              {currentQuestion.questionType === "MCQ" ? (
                <div className="space-y-3 mb-8">
                  {currentQuestion.options.map((option, index) => (
                    <label
                      key={option.id}
                      className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={option.id}
                        checked={answers[currentQuestion.id] === option.id}
                        onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                        className={`mt-1 w-4 h-4 text-${themeAccent} border-gray-300 focus:ring-${themePrimary}`}
                      />
                      <span className="text-gray-700">
                        <span className="font-medium">({String.fromCharCode(65 + index)})</span>{" "}
                        {option.text}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mb-8">
                  <textarea
                    className={`w-full h-40 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-${themePrimary} focus:border-transparent`}
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion.id] ?? ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Character count: {(answers[currentQuestion.id] ?? "").length}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <FaArrowLeft /> Previous
                </button>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      className={`flex items-center gap-2 px-6 py-2 bg-${themeAccent} text-white rounded-lg hover:bg-${themeHover} transition-colors`}
                    >
                      Next <FaArrowRight />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={submitting}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Exam"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-4" ref={videoContainerRef}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Live Monitoring</h3>
                  <button
                    onClick={() => setVideoVisible(!videoVisible)}
                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    title={videoVisible ? "Hide video" : "Show video"}
                  >
                    {videoVisible ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full aspect-video bg-gray-900 rounded border object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      videoVisible ? "opacity-100" : "opacity-20"
                    }`}
                  >
                    {cameraPermission && !cameraError ? (
                      <>
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          {isRecording ? (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                                REC
                              </span>
                            </>
                          ) : (
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          )}
                        </div>
                        <div className="absolute top-2 right-2">
                          <FaCamera className="text-white text-sm opacity-75" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded border flex flex-col items-center justify-center p-4">
                        <FaCamera className="text-gray-400 text-2xl mb-2" />
                        <p className="text-xs text-gray-500 text-center">
                          {cameraError || "Camera not accessible"}
                        </p>
                        <button
                          onClick={startRecording}
                          className={`mt-2 text-xs bg-${themeAccent} text-white px-2 py-1 rounded hover:bg-${themeHover} transition-colors`}
                        >
                          Retry Camera
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {isRecording ? (
                      <span className="text-green-600 font-medium">Recording active</span>
                    ) : cameraPermission ? (
                      <span className="text-orange-600">Recording paused</span>
                    ) : (
                      <span className="text-red-600">Camera disabled</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <span>Audio:</span>
                    {isRecording ? (
                      <span className="text-green-600">ON</span>
                    ) : (
                      <span className="text-red-600">OFF</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Question Navigator</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-8 h-8 text-xs rounded font-medium transition-colors ${
                        currentQuestionIndex === index
                          ? `bg-${themeAccent} text-white`
                          : answers[questions[index]?.id]
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 bg-${themeAccent} rounded`}></div>
                    <span className="text-gray-600">Current</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 rounded border border-green-300"></div>
                    <span className="text-gray-600">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 rounded border"></div>
                    <span className="text-gray-600">Not answered</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Exam Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Questions:</span>
                    <span className="font-medium">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Answered:</span>
                    <span className="font-medium text-green-700">{getAnsweredCount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Not Answered:</span>
                    <span className="font-medium text-red-700">
                      {questions.length - getAnsweredCount()}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress:</span>
                      <span className={`font-medium text-${themeAccent}`}>
                        {Math.round((getAnsweredCount() / questions.length) * 100)} %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`bg-${themeAccent} h-2 rounded-full transition-all duration-300`}
                        style={{
                          width: `${(getAnsweredCount() / questions.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Cancel Exam?</h3>
                <p className="text-gray-600">
                  Are you sure you want to cancel this exam? This action cannot be undone and you
                  will not be able to retake this exam.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Keep Exam
                </button>
                <button
                  onClick={handleCancelExam}
                  disabled={cancelling}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Yes, Cancel Exam"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export default TakeExam;
