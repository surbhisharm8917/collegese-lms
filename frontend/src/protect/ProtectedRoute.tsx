import React from "react";
import { Navigate } from "react-router-dom";
import Loader from "@/components/Loader";
import { useUser } from "@/context/useUser";

type Role = "STUDENT" | "ADMIN" | "TEACHER" | "ASSISTANT" | "SUPER_ADMIN";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles,
}) => {
  const { user, role: userRole, isLoading } = useUser();

  if (isLoading) {
    return <Loader fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
