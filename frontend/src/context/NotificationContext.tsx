import React, { useEffect, useState, useCallback, useContext } from "react";
import api from "@/lib/api";
import { NotificationContext } from "./NotificationContextTypes";
import type { Notification } from "./NotificationContextTypes";
import { UserContext } from "./UserContext";

export interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userContext = useContext(UserContext);

  const fetchNotifications = useCallback(async () => {
    if (!userContext?.user) {
      return;
    }

    try {
      const response = await api.get("/notifications");
      let notifs = [];
      if (response.data && response.data.notifications) {
        notifs = response.data.notifications;
      } else if (Array.isArray(response.data)) {
        notifs = response.data;
      }

      const unreadNotifs = notifs.filter((n: Notification) => !n.isRead);

      setNotifications(unreadNotifs);
      setUnreadCount(unreadNotifs.length);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userContext?.user]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userContext?.user) {
        return;
      }

      try {
        await api.patch(`/notifications/${notificationId}/read`);
        setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        fetchNotifications();
      }
    },
    [fetchNotifications, userContext?.user],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userContext?.user) {
      return;
    }

    try {
      await api.patch("/notifications/read-all");
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications, userContext?.user]);

  useEffect(() => {
    if (!userContext?.user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userContext?.user) {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications, userContext?.user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
