import { createContext } from "react";

export interface NotificationMetadata {
  quizId?: string;
  submissionId?: string;
  courseId?: string;
  assessmentId?: string;
  score?: number;
  [key: string]: string | number | undefined;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: NotificationMetadata;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  fetchNotifications: () => void;
  handleNotificationNavigation?: (notification: Notification) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
