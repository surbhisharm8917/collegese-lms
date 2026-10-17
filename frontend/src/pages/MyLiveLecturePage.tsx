import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ConnectionStateToast,
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useConnectionState,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { ConnectionState } from "livekit-client";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  Check,
  Copy,
  LogOut,
  Radio,
  ShieldCheck,
  UserMinus,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useUser } from "@/context/useUser";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Loader from "@/components/Loader";
import "./live-classroom.css";

interface LectureInfo {
  id: string;
  title: string;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  startTime: string;
  endTime: string;
  teacherId: string;
  course?: { id: string; title: string } | null;
  teacher?: { id: string; name: string };
}

interface LectureResponse {
  success: boolean;
  lecture: LectureInfo;
  permissions: { canManage: boolean };
}

interface JoinCredentials {
  token: string;
  serverUrl: string;
  permissions: { canPublish: boolean; canManage: boolean };
}

const dashboardPath = (role: string | undefined): string => {
  switch (role) {
    case "TEACHER":
      return "/dashboard/teacher/teacherlivelectures";
    case "ADMIN":
      return "/dashboard/admin/dashboard";
    case "SUPER_ADMIN":
      return "/dashboard/superadmin/create";
    case "ASSISTANT":
      return "/dashboard/assistant/assistant";
    default:
      return "/dashboard/student/my-live-lec";
  }
};

interface ClassroomChromeProps {
  lecture: LectureInfo;
  canManage: boolean;
  isEnding: boolean;
  onEnd: () => Promise<void>;
  onLeave: () => void;
}

const ClassroomChrome = ({
  lecture,
  canManage,
  isEnding,
  onEnd,
  onLeave,
}: ClassroomChromeProps) => {
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/live-classroom/${lecture.id}`);
    toast.success("Classroom link copied");
  };

  const removeParticipant = async (identity: string) => {
    setRemovingId(identity);
    try {
      await api.post(`/live-lectures/${lecture.id}/participants/${identity}/remove`);
      toast.success("Participant removed");
    } catch {
      toast.error("Could not remove this participant");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="je-live-room" data-lk-theme="default">
      <header className="je-live-header">
        <div className="je-live-title">
          <span className="je-live-indicator" aria-label="Live">
            <span />
            Live
          </span>
          <div>
            <strong>{lecture.title}</strong>
            <small>{lecture.course?.title ?? "Live classroom"}</small>
          </div>
        </div>

        <div className="je-live-actions">
          <span className="je-connection-state">
            {connectionState === ConnectionState.Connected ? <Check /> : <Radio />}
            {connectionState}
          </span>
          <Button variant="ghost" size="icon" onClick={copyInviteLink} title="Copy classroom link">
            <Copy />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="je-participant-trigger">
                <Users />
                <span>{participants.length}</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="je-participant-sheet">
              <SheetHeader>
                <SheetTitle>Class participants</SheetTitle>
                <SheetDescription>
                  {participants.length} connected participant{participants.length === 1 ? "" : "s"}
                </SheetDescription>
              </SheetHeader>
              <div className="je-participant-list">
                {participants.map((participant) => {
                  const role = participant.attributes.role || "STUDENT";
                  const isHost = participant.identity === lecture.teacherId;
                  return (
                    <div className="je-participant-row" key={participant.identity}>
                      <span className="je-participant-avatar">
                        {(participant.name || participant.identity).slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <strong>{participant.name || "Participant"}</strong>
                        <small>{isHost ? "Host" : role.replace("_", " ")}</small>
                      </span>
                      {canManage && !isHost && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Remove participant"
                          disabled={removingId === participant.identity}
                          onClick={() => removeParticipant(participant.identity)}
                        >
                          <UserMinus />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>

          {canManage ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isEnding}>
                  <LogOut />
                  <span>End class</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End the live class?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Everyone will be disconnected and attendance will be finalized. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep class open</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => void onEnd()}
                  >
                    End class
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="destructive" onClick={onLeave}>
              <LogOut />
              <span>Leave</span>
            </Button>
          )}
        </div>
      </header>

      <main className="je-live-conference">
        <VideoConference />
      </main>
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
};

const MyLiveLecturePage = () => {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [lecture, setLecture] = useState<LectureInfo | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [credentials, setCredentials] = useState<JoinCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectedRef = useRef(false);
  const endRequestedRef = useRef(false);

  const goBack = useCallback(() => navigate(dashboardPath(user?.role)), [navigate, user?.role]);

  const fetchLecture = useCallback(async () => {
    if (!lectureId) return;
    try {
      const response = await api.get<LectureResponse>(`/live-lectures/${lectureId}`);
      setLecture(response.data.lecture);
      setCanManage(response.data.permissions.canManage);
      setError(null);
    } catch (requestError) {
      const message =
        requestError && typeof requestError === "object" && "response" in requestError
          ? ((requestError as { response?: { data?: { message?: string } } }).response?.data
              ?.message ?? "This classroom is unavailable.")
          : "This classroom is unavailable.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [lectureId]);

  useEffect(() => {
    void fetchLecture();
  }, [fetchLecture]);

  useEffect(() => {
    return () => {
      if (connectedRef.current && lectureId) {
        void api.post(`/live-lectures/leave/${lectureId}`).catch(() => undefined);
      }
    };
  }, [lectureId]);

  const joinClassroom = async () => {
    if (!lectureId || !lecture) return;
    setJoining(true);
    setError(null);
    try {
      let activeLecture = lecture;
      if (canManage && lecture.status === "SCHEDULED") {
        const started = await api.post<{ lecture: LectureInfo }>(
          `/live-lectures/start/${lectureId}`,
        );
        activeLecture = started.data.lecture;
        setLecture(activeLecture);
      }
      const response = await api.post<JoinCredentials>(`/live-lectures/join/${lectureId}`);
      setCredentials(response.data);
    } catch (requestError) {
      const message =
        requestError && typeof requestError === "object" && "response" in requestError
          ? ((requestError as { response?: { data?: { message?: string } } }).response?.data
              ?.message ?? "Could not join the live classroom.")
          : "Could not join the live classroom.";
      setError(message);
    } finally {
      setJoining(false);
    }
  };

  const leaveClassroom = useCallback(() => {
    setCredentials(null);
    goBack();
  }, [goBack]);

  const handleDisconnected = useCallback(() => {
    if (connectedRef.current && lectureId) {
      void api.post(`/live-lectures/leave/${lectureId}`).catch(() => undefined);
    }
    connectedRef.current = false;
    setCredentials(null);
    if (endRequestedRef.current) goBack();
  }, [goBack, lectureId]);

  const endClassroom = async () => {
    if (!lectureId) return;
    endRequestedRef.current = true;
    setEnding(true);
    try {
      await api.post(`/live-lectures/end/${lectureId}`);
      toast.success("Live class ended and attendance finalized");
      goBack();
    } catch {
      endRequestedRef.current = false;
      setEnding(false);
      toast.error("Could not end the class. Please try again.");
    }
  };

  if (loading) return <Loader />;

  if (!lecture || error) {
    return (
      <main className="je-live-ready-page">
        <section className="je-live-error" role="alert">
          <ShieldCheck />
          <h1>Classroom unavailable</h1>
          <p>{error ?? "The requested lecture could not be found."}</p>
          <Button onClick={goBack}>
            <ArrowLeft /> Return to dashboard
          </Button>
        </section>
      </main>
    );
  }

  if (credentials) {
    return (
      <LiveKitRoom
        token={credentials.token}
        serverUrl={credentials.serverUrl}
        connect
        audio={false}
        video={false}
        options={{ adaptiveStream: true, dynacast: true }}
        onConnected={() => {
          connectedRef.current = true;
        }}
        onDisconnected={handleDisconnected}
        onError={(roomError) => setError(roomError.message)}
      >
        <ClassroomChrome
          lecture={lecture}
          canManage={credentials.permissions.canManage}
          isEnding={ending}
          onEnd={endClassroom}
          onLeave={leaveClassroom}
        />
      </LiveKitRoom>
    );
  }

  const waitingForHost = lecture.status === "SCHEDULED" && !canManage;
  const hasEnded = lecture.status === "ENDED";

  return (
    <main className="je-live-ready-page">
      <button className="je-live-back" onClick={goBack} aria-label="Return to dashboard">
        <ArrowLeft />
      </button>
      <section className="je-live-ready">
        <div className="je-live-ready-visual">
          <img src="/brand/just-easy-logo-mark.svg" alt="Just Easy CA Classes" />
          <span>
            <Video /> Secure live classroom
          </span>
        </div>
        <div className="je-live-ready-details">
          <span className={`je-live-status je-live-status-${lecture.status.toLowerCase()}`}>
            <Radio /> {lecture.status === "LIVE" ? "Live now" : lecture.status.toLowerCase()}
          </span>
          <h1>{lecture.title}</h1>
          <p>{lecture.course?.title ?? "Just Easy CA Classes"}</p>
          <dl>
            <div>
              <dt>
                <CalendarClock /> Scheduled
              </dt>
              <dd>{new Date(lecture.startTime).toLocaleString()}</dd>
            </div>
            <div>
              <dt>
                <BookOpen /> Instructor
              </dt>
              <dd>{lecture.teacher?.name ?? "Assigned faculty"}</dd>
            </div>
          </dl>
          {error && <p className="je-live-inline-error">{error}</p>}
          <Button
            size="lg"
            onClick={() => void joinClassroom()}
            disabled={joining || waitingForHost || hasEnded}
          >
            <Video />
            {joining
              ? "Preparing classroom..."
              : hasEnded
                ? "Class has ended"
                : waitingForHost
                  ? "Waiting for instructor"
                  : canManage && lecture.status === "SCHEDULED"
                    ? "Start live class"
                    : "Join live class"}
          </Button>
          <small>Camera and microphone begin off. You control them after joining.</small>
        </div>
      </section>
    </main>
  );
};

export default MyLiveLecturePage;
