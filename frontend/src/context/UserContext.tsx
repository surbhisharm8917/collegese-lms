import { createContext, useState, useEffect, type ReactNode } from "react";
import type { Role, User, UserContextType } from "./userTypes";
import api from "@/lib/api";

// eslint-disable-next-line react-refresh/only-export-components
export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/verify")
      .then((response) => {
        const userData = response.data.user as User | null;
        if (!response.data.authenticated || !userData) {
          setUser(null);
          localStorage.removeItem("user");
          localStorage.removeItem("user_role");
          localStorage.removeItem("user_id");
          return;
        }
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("user_role", userData.role);
        localStorage.setItem("user_id", userData.id);
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = (userData: User) => {
    setUser(userData);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("user_id", userData.id);
    localStorage.setItem("user_role", userData.role);
  };

  const logout = () => {
    setUser(null);

    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role");
    localStorage.removeItem("auth_token");
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const profilePic = user?.profilePic || null;
  const role: Role | null = user?.role || null;
  const user_id = user?.id || null;

  return (
    <UserContext.Provider
      value={{ user, user_id, role, isLoading, login, logout, profilePic, updateUser }}
    >
      {children}
    </UserContext.Provider>
  );
};
