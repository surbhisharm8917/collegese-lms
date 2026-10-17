import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/useUser";
import { NotificationBell } from "@/components/NotificationBell";
import BrandLogo from "@/components/BrandLogo";

export interface DashboardNavItem {
  name: string;
  path: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}
interface DashboardShellProps {
  navItems: DashboardNavItem[];
  fallbackName: string;
  greetingFirstName?: boolean;
}
const initials = (name?: string | null) =>
  !name
    ? ""
    : name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
const avatarSrc = (pic?: string | null) =>
  !pic
    ? undefined
    : pic.startsWith("http") || pic.startsWith("/") || pic.startsWith("data:")
      ? pic
      : `data:image/jpeg;base64,${pic}`;

export default function DashboardShell({
  navItems,
  fallbackName,
  greetingFirstName = false,
}: DashboardShellProps) {
  const { user, role, profilePic, logout } = useUser();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.name || fallbackName;
  const greetingName = greetingFirstName ? user?.name?.split(" ")[0] || fallbackName : displayName;
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* Preserve local sign-out if the server is unavailable. */
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  };
  const nav = (compact: boolean, onSelect?: () => void) => (
    <div className="space-y-1.5">
      {navItems.map(({ name, path, icon: Icon }) => (
        <NavLink
          key={name}
          to={path}
          title={compact ? name : undefined}
          aria-label={compact ? name : undefined}
          onClick={onSelect}
          className={({ isActive }) =>
            cn(
              "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2",
              compact && "justify-center",
              isActive
                ? "bg-indigo-50 text-indigo-800 shadow-sm ring-1 ring-inset ring-indigo-100"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={19}
                className={cn(
                  "shrink-0",
                  isActive ? "text-amber-600" : "text-slate-400 group-hover:text-indigo-700",
                )}
              />
              {!compact && <span>{name}</span>}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
  const avatar = (size = "h-10 w-10") => (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-700 text-sm font-bold text-white shadow-sm",
        size,
      )}
    >
      {profilePic ? (
        <img
          src={avatarSrc(profilePic)}
          alt={`${displayName} profile`}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(displayName)
      )}
    </span>
  );
  const userCard = (
    <div className="mx-3 mb-3 mt-5 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
      {avatar()}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">{displayName}</p>
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
      </div>
    </div>
  );
  const logoutButton = (compact = false) => (
    <button
      type="button"
      onClick={handleLogout}
      title={compact ? "Log out" : undefined}
      aria-label={compact ? "Log out" : undefined}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
        compact && "justify-center",
      )}
    >
      <LogOut size={19} />
      {!compact && "Log out"}
    </button>
  );
  const sidebarBody = (compact: boolean, mobile = false) => (
    <>
      {!compact && userCard}
      <p
        className={cn(
          "px-5 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400",
          compact && "sr-only",
        )}
      >
        Workspace
      </p>
      <nav
        aria-label="Dashboard navigation"
        className="dashboard-scrollbar flex-1 overflow-y-auto px-3 pb-3"
      >
        {nav(compact, mobile ? () => setMobileOpen(false) : undefined)}
      </nav>
      <div className="border-t border-slate-200 p-3">{logoutButton(compact)}</div>
    </>
  );
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-950">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-300 md:flex",
          collapsed ? "w-[84px]" : "w-[268px]",
        )}
      >
        <div className="flex min-h-20 items-center justify-center px-4">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <ChevronRight size={18} />
            </button>
          ) : (
            <div className="flex w-full items-center justify-between">
              <BrandLogo
                imageClassName="h-9 w-9"
                textClassName="text-sm"
                taglineClassName="text-[9px]"
              />
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          )}
        </div>
        {sidebarBody(collapsed)}
      </aside>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        aria-label="Mobile dashboard navigation"
        hidden={!mobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(88vw,304px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex min-h-20 items-center justify-between px-4">
          <BrandLogo
            imageClassName="h-9 w-9"
            textClassName="text-sm"
            taglineClassName="text-[9px]"
          />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <X size={20} />
          </button>
        </div>
        {sidebarBody(false, true)}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 md:hidden"
            >
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-700">
                Learning workspace
              </p>
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-950">
                Welcome back, {greetingName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span className="hidden rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 ring-1 ring-inset ring-indigo-100 sm:inline-flex">
              {role}
            </span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open profile menu"
                  className="flex min-h-11 items-center gap-1 rounded-xl p-0.5 pr-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  {avatar("h-10 w-10")}
                  <ChevronDown size={15} aria-hidden />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-[70] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_-20px_rgba(15,23,42,.35)]"
                >
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="truncate text-sm font-bold text-slate-950">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 outline-none hover:bg-red-50 focus:bg-red-50"
                  >
                    <LogOut size={17} />
                    Log out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <main className="dashboard-scrollbar min-h-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
