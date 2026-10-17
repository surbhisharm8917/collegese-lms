import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
  WebhookReceiver,
  type WebhookEvent,
} from "livekit-server-sdk";
import type { LiveLecture, Role } from "@generated/prisma/client";
import type { AuthUser } from "../types/express";
import { logger } from "@utils/logger";

interface LiveKitConfig {
  apiUrl: string;
  wsUrl: string;
  apiKey: string;
  apiSecret: string;
  maxParticipants: number;
  studentsCanPublish: boolean;
}

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value.trim().toLowerCase() === "true";
};

const normalizeApiUrl = (url: string): string =>
  url.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");

const normalizeWsUrl = (url: string): string =>
  url
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:")
    .replace(/\/$/, "");

export const getLiveKitConfig = (): LiveKitConfig | null => {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  const rawApiUrl = process.env.LIVEKIT_API_URL?.trim() || process.env.LIVEKIT_URL?.trim();
  const rawWsUrl = process.env.LIVEKIT_WS_URL?.trim() || process.env.LIVEKIT_URL?.trim();

  if (!apiKey || !apiSecret || !rawApiUrl || !rawWsUrl) {
    return null;
  }

  const configuredMax = Number(process.env.LIVEKIT_MAX_PARTICIPANTS ?? 300);
  return {
    apiUrl: normalizeApiUrl(rawApiUrl),
    wsUrl: normalizeWsUrl(rawWsUrl),
    apiKey,
    apiSecret,
    maxParticipants: Number.isSafeInteger(configuredMax) && configuredMax > 1 ? configuredMax : 300,
    studentsCanPublish: parseBoolean(process.env.LIVEKIT_STUDENTS_CAN_PUBLISH, false),
  };
};

export const isLiveKitConfigured = (): boolean => Boolean(getLiveKitConfig());

export const checkLiveKitHealth = async (): Promise<void> => {
  const config = requireConfig();
  await getRoomClient(config).listRooms([]);
};

const requireConfig = (): LiveKitConfig => {
  const config = getLiveKitConfig();
  if (!config) {
    throw new Error(
      "Live classroom is not configured. LIVEKIT_API_URL, LIVEKIT_WS_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are required.",
    );
  }
  return config;
};

export const getLiveKitRoomName = (roomId: string): string => `lecture-${roomId}`;

const getRoomClient = (config: LiveKitConfig): RoomServiceClient =>
  new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);

export const ensureLiveKitRoom = async (
  lecture: Pick<LiveLecture, "id" | "title" | "roomId" | "courseId">,
): Promise<void> => {
  const config = requireConfig();
  const client = getRoomClient(config);
  const roomName = getLiveKitRoomName(lecture.roomId);
  const rooms = await client.listRooms([roomName]);

  if (rooms.length > 0) {
    return;
  }

  await client.createRoom({
    name: roomName,
    emptyTimeout: 10 * 60,
    departureTimeout: 5 * 60,
    maxParticipants: config.maxParticipants,
    metadata: JSON.stringify({
      lectureId: lecture.id,
      courseId: lecture.courseId,
      title: lecture.title,
    }),
  });
};

export const closeLiveKitRoom = async (roomId: string): Promise<void> => {
  const config = getLiveKitConfig();
  if (!config) {
    return;
  }

  try {
    await getRoomClient(config).deleteRoom(getLiveKitRoomName(roomId));
  } catch (error) {
    // The room may already have closed after its last participant left.
    logger.warn("LiveKit room was already closed or could not be deleted", {
      roomId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
};

export const removeLiveKitParticipant = async (
  roomId: string,
  participantIdentity: string,
): Promise<void> => {
  const config = requireConfig();
  await getRoomClient(config).removeParticipant(getLiveKitRoomName(roomId), participantIdentity, {
    revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)),
  });
};

const canPublishMedia = (role: Role, user: AuthUser, teacherId: string): boolean => {
  const config = requireConfig();
  if (user.id === teacherId) {
    return true;
  }
  if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "TEACHER") {
    return true;
  }
  return role === "STUDENT" && config.studentsCanPublish;
};

export const createLiveKitJoinToken = async (
  lecture: Pick<LiveLecture, "id" | "roomId" | "teacherId" | "courseId" | "endTime">,
  user: AuthUser,
  displayName: string,
): Promise<{ token: string; serverUrl: string; canPublish: boolean }> => {
  const config = requireConfig();
  const publish = canPublishMedia(user.role as Role, user, lecture.teacherId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const scheduledEndSeconds = Math.floor(lecture.endTime.getTime() / 1000);
  const ttl = Math.min(8 * 60 * 60, Math.max(15 * 60, scheduledEndSeconds - nowSeconds + 60 * 60));

  const accessToken = new AccessToken(config.apiKey, config.apiSecret, {
    identity: user.id,
    name: displayName,
    ttl,
    metadata: JSON.stringify({
      lectureId: lecture.id,
      courseId: lecture.courseId,
      role: user.role,
    }),
    attributes: {
      role: user.role,
      lectureId: lecture.id,
    },
  });

  accessToken.addGrant({
    room: getLiveKitRoomName(lecture.roomId),
    roomJoin: true,
    roomAdmin:
      user.id === lecture.teacherId || user.role === "ADMIN" || user.role === "SUPER_ADMIN",
    canSubscribe: true,
    canPublish: publish,
    canPublishSources: publish
      ? [
          TrackSource.CAMERA,
          TrackSource.MICROPHONE,
          TrackSource.SCREEN_SHARE,
          TrackSource.SCREEN_SHARE_AUDIO,
        ]
      : [],
    canPublishData: true,
  });

  return {
    token: await accessToken.toJwt(),
    serverUrl: config.wsUrl,
    canPublish: publish,
  };
};

export const receiveLiveKitWebhook = async (
  body: string,
  authorization: string | undefined,
): Promise<WebhookEvent> => {
  const config = requireConfig();
  const receiver = new WebhookReceiver(config.apiKey, config.apiSecret);
  return receiver.receive(body, authorization);
};
