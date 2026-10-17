import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/useNotifications";
import { useUser } from "../context/useUser";
import type { Notification } from "../context/NotificationContextTypes";
import { getNotificationRoute } from "../utils/notificationNavigation";
import { Card, CardContent } from "./ui/card";
import { Bell, Video, ClipboardList, HelpCircle, Calendar } from "lucide-react";
import { Button } from "./ui/button";

const getIcon = (type: string) => {
  switch (type) {
    case "lecture":
    case "liveLecture":
      return <Video className="h-5 w-5 text-white" />;
    case "task":
    case "assignment":
      return <ClipboardList className="h-5 w-5 text-white" />;
    case "quiz":
      return <HelpCircle className="h-5 w-5 text-white" />;
    case "exam":
      return <Calendar className="h-5 w-5 text-white" />;
    default:
      return <Bell className="h-5 w-5 text-white" />;
  }
};

export const NotificationBell: React.FC = () => {
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useNotifications() || {};
  const { role } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && fetchNotifications) {
      fetchNotifications();
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (markAsRead) {
      markAsRead(notification.id);
    }

    const userRole = role || "STUDENT";
    const routeInfo = getNotificationRoute(notification, userRole);

    if (routeInfo && routeInfo.path) {
      setIsOpen(false);

      try {
        navigate(routeInfo.path);
      } catch (error) {
        console.error(error);
        let fallbackPath = `/dashboard/${userRole.toLowerCase()}/dashboard`;
        if (userRole === "TEACHER") {
          fallbackPath = "/dashboard/teacher/dashboardTeacher";
        } else if (userRole === "SUPER_ADMIN") {
          fallbackPath = "/dashboard/superadmin/superAdminDash";
        }
        navigate(fallbackPath);
      }
    } else {
      setIsOpen(false);
      let fallbackPath = `/dashboard/${userRole.toLowerCase()}/dashboard`;
      if (userRole === "TEACHER") {
        fallbackPath = "/dashboard/teacher/dashboardTeacher";
      } else if (userRole === "SUPER_ADMIN") {
        fallbackPath = "/dashboard/superadmin/superAdminDash";
      }

      navigate(fallbackPath);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        className="relative bg-white hover:bg-gray-100 p-2 rounded-full"
        onClick={handleBellClick}
      >
        <Bell className="h-6 w-6 text-[#FF5733]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#FF5733] text-white text-xs rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card
          className="
      fixed top-16 right-2 sm:absolute sm:top-auto sm:right-0 sm:mt-3
      w-[92vw] sm:w-96
      bg-white/80 backdrop-blur-md shadow-xl border border-gray-200/60
      rounded-2xl z-50
      max-h-[75vh] sm:max-h-[80vh] flex flex-col
      transition-all duration-300 ease-in-out
    "
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-[#FF5733] via-[#FF7847] to-[#FF8C5A] rounded-t-2xl" />
          <CardContent className="p-5 flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Notifications
              </h2>
              {unreadCount > 0 && markAllAsRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs sm:text-sm text-[#FF5733] hover:text-[#FF7847] font-semibold transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="overflow-y-auto pr-1 sm:pr-2 space-y-4 max-h-[65vh] sm:max-h-72 custom-scrollbar">
              {!notifications || notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm sm:text-base italic">
                  No new notifications ✨
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNotificationClick(notification);
                    }}
                    className="
                flex items-start gap-3 p-4 rounded-xl border border-gray-100
                hover:bg-gradient-to-r hover:from-orange-50 hover:to-white
                hover:shadow-md active:scale-[0.98]
                transition-all duration-200 ease-in-out cursor-pointer
              "
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-[#FF5733] to-[#FF8C5A] flex items-center justify-center shadow-md text-white">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm font-semibold">{notification.title}</p>
                      <p className="text-gray-600 text-xs mt-1 leading-snug">
                        {notification.message}
                      </p>
                      <span className="text-gray-400 text-[11px] sm:text-xs block mt-1">
                        {formatDate(notification.createdAt)}
                      </span>
                      {!notification.isRead && (
                        <span className="inline-block w-2 h-2 bg-[#FF5733] rounded-full mt-2 shadow-sm" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
export default NotificationBell;
