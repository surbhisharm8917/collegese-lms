import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Menu, X } from "lucide-react";
import api from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";
import { useUser } from "@/context/useUser";
import { cn } from "@/lib/utils";

const links = [
  { label: "Courses", path: "/courses" },
  { label: "CA Profession", path: "/ca-profession" },
  { label: "Curriculum", path: "/ca-curriculum" },
  { label: "Roadmap", path: "/ca-roadmap" },
];
const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* Preserve local logout if the request fails. */
    }
    logout();
    navigate("/login");
  };
  const action = user ? (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
    >
      <LogOut size={16} />
      Log out
    </button>
  ) : (
    <button
      type="button"
      onClick={() => navigate("/login")}
      className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-extrabold text-slate-950 shadow-sm hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      Log in
      <ArrowRight
        size={16}
        className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
      />
    </button>
  );
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors",
        scrolled
          ? "border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-[#fbfaf7]/95",
      )}
    >
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Just Easy CA Classes home"
          className="min-h-11 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          <BrandLogo imageClassName="h-10 w-10" taglineClassName="hidden sm:block" />
        </button>
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <button
              type="button"
              key={link.path}
              onClick={() => navigate(link.path)}
              className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              {link.label}
            </button>
          ))}
        </div>
        <div className="hidden lg:block">{action}</div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 lg:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      <div
        id="mobile-navigation"
        hidden={!open}
        aria-hidden={!open}
        className={cn(
          "overflow-hidden border-t border-slate-200 bg-white transition-[max-height,opacity] lg:hidden",
          open ? "max-h-96 opacity-100" : "max-h-0 border-transparent opacity-0",
        )}
      >
        <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
          {links.map((link) => (
            <button
              type="button"
              key={link.path}
              onClick={() => {
                setOpen(false);
                navigate(link.path);
              }}
              className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2">{action}</div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
