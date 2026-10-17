import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CirclePlay,
  CreditCard,
  FileCheck2,
  GraduationCap,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
  Video,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/useUser";
import { PROGRAMMES } from "@/lib/programmes";

type Role = "STUDENT" | "ADMIN" | "TEACHER" | "ASSISTANT" | "SUPER_ADMIN";
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, margin: "-50px" });
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={visible ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.55, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
const features = [
  {
    icon: Video,
    title: "Live learning rooms",
    text: "Join focused lectures, ask questions, and revisit recordings when revision begins.",
  },
  {
    icon: BookOpenCheck,
    title: "A structured study path",
    text: "Move through organized subjects, chapters, resources, and milestones without losing context.",
  },
  {
    icon: BarChart3,
    title: "Progress you can use",
    text: "See attendance, completion, test performance, and weak areas in one clear view.",
  },
  {
    icon: FileCheck2,
    title: "Practice with purpose",
    text: "Build confidence through quizzes, assessments, and exam-focused feedback.",
  },
  {
    icon: BellRing,
    title: "Never miss the next step",
    text: "Keep classes, assignments, assessments, and results visible and timely.",
  },
  {
    icon: ShieldCheck,
    title: "A dependable workspace",
    text: "Role-based access and secure assessment workflows protect every learning journey.",
  },
];
const guides = [
  {
    icon: GraduationCap,
    title: "Understand the CA profession",
    text: "Explore where audit, tax, finance, and advisory can take your career.",
    href: "/ca-profession",
  },
  {
    icon: BookOpenCheck,
    title: "See the full curriculum",
    text: "Make sense of Foundation, Intermediate, and Final before planning study.",
    href: "/ca-curriculum",
  },
  {
    icon: BarChart3,
    title: "Plan your roadmap",
    text: "Connect classes, practice, examinations, and professional readiness.",
    href: "/ca-roadmap",
  },
];
const admissions = [
  {
    icon: CreditCard,
    step: "01",
    title: "Choose a programme",
    text: "Browse the catalogue and select the learning path that matches your goal.",
  },
  {
    icon: UploadCloud,
    step: "02",
    title: "Share payment proof",
    text: "Submit your transaction screenshot securely from your learner account.",
  },
  {
    icon: BadgeCheck,
    step: "03",
    title: "Start after approval",
    text: "Once verified, your enrollment appears automatically in the dashboard.",
  },
];
const Home = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  useEffect(() => {
    if (isLoading || !user) return;
    const dashboards: Record<Role, string> = {
      STUDENT: "/dashboard/student",
      TEACHER: "/dashboard/teacher",
      ADMIN: "/dashboard/admin",
      ASSISTANT: "/dashboard/assistant",
      SUPER_ADMIN: "/dashboard/superadmin",
    };
    navigate(dashboards[user.role], { replace: true });
  }, [isLoading, navigate, user]);
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#fbfaf7]">
      <Navbar />
      <main>
        <section className="relative isolate overflow-hidden border-b border-slate-200/80">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_0%,rgba(99,102,241,.13),transparent_30%),radial-gradient(circle_at_92%_12%,rgba(245,180,39,.16),transparent_23%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 opacity-[.035] [background-image:linear-gradient(#172554_1px,transparent_1px),linear-gradient(90deg,#172554_1px,transparent_1px)] [background-size:48px_48px]"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-28">
            <Reveal>
              <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50 px-4 text-xs font-extrabold uppercase tracking-[.16em] text-amber-800">
                <Sparkles size={14} /> Admissions now open
              </div>
              <h1 className="font-display mt-7 max-w-3xl text-5xl leading-[1.02] tracking-[-.02em] text-slate-950 sm:text-6xl lg:text-7xl">
                A calmer, clearer way to <span className="text-gradient">master commerce.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Structured CA classes, live guidance, purposeful practice, and progress you can
                understand—brought together in one focused learning workspace.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => navigate("/courses")}
                  className="group bg-indigo-800 hover:bg-indigo-900"
                >
                  Explore courses{" "}
                  <ArrowRight className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/register")}>
                  Create your account
                </Button>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-600">
                {[
                  "Live and recorded classes",
                  "Assessment-led practice",
                  "Verified certificates",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                      <Check size={12} />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.12} className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-10 -z-10 rounded-full bg-indigo-200/30 blur-3xl"
              />
              <div className="rounded-[2rem] border border-white/80 bg-white/85 p-3 shadow-lift backdrop-blur">
                <div className="rounded-[1.45rem] bg-[#111c44] p-6 text-white sm:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-amber-300">
                        Today’s learning plan
                      </p>
                      <h2 className="mt-2 text-xl font-extrabold">Good morning, learner</h2>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                      <CalendarDays size={20} />
                    </span>
                  </div>
                  <div className="mt-8 rounded-2xl bg-white p-5 text-slate-950 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                        Live at 4:00 PM
                      </span>
                      <CirclePlay className="text-indigo-700" size={22} />
                    </div>
                    <h3 className="mt-5 text-lg font-extrabold">Financial Accounting</h3>
                    <p className="mt-1 text-sm text-slate-500">Partnership accounts · Session 08</p>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[68%] rounded-full bg-indigo-600" />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      68% of this module complete
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4">
                      <UsersRound className="text-amber-300" size={20} />
                      <p className="mt-3 text-2xl font-extrabold">12</p>
                      <p className="text-xs text-indigo-100/60">classes attended</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4">
                      <FileCheck2 className="text-amber-300" size={20} />
                      <p className="mt-3 text-2xl font-extrabold">84%</p>
                      <p className="text-xs text-indigo-100/60">practice average</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
        <section aria-label="Platform highlights" className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-200 px-6 sm:grid-cols-4 sm:divide-y-0 lg:px-8">
            {[
              { value: "Live", label: "Interactive classes" },
              { value: "Clear", label: "Study pathways" },
              { value: "Secure", label: "Assessments" },
              { value: "Anytime", label: "Learning access" },
            ].map((stat) => (
              <div key={stat.label} className="px-3 py-8 text-center">
                <p className="font-display text-3xl text-indigo-900">{stat.value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Reveal className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.22em] text-amber-700">
                  Learning pathways
                </p>
                <h2 className="font-display mt-3 max-w-2xl text-4xl leading-tight text-slate-950 sm:text-5xl">
                  Find the programme that fits your next chapter.
                </h2>
              </div>
              <Link
                to="/courses"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-indigo-800 hover:text-indigo-600"
              >
                View full catalogue <ArrowRight size={16} />
              </Link>
            </Reveal>
            <div className="dashboard-scrollbar mt-10 flex snap-x gap-5 overflow-x-auto pb-5">
              {PROGRAMMES.map((programme) => {
                const Icon = programme.icon;
                return (
                  <Link
                    key={programme.name}
                    to={`/register?programme=${encodeURIComponent(programme.name)}`}
                    className="group relative min-h-64 w-[290px] shrink-0 snap-start overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition-shadow hover:shadow-lift sm:w-[330px]"
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${programme.gradient}`}
                    />
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-800">
                      <Icon className="h-6 w-6" />
                    </span>
                    <p className="mt-7 text-[10px] font-extrabold uppercase tracking-[.2em] text-amber-700">
                      {programme.shortLabel}
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold text-slate-950">{programme.name}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                      {programme.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-indigo-800">
                      See programme{" "}
                      <ChevronRight
                        size={16}
                        className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
        <section className="bg-[#111c44] py-20 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Reveal className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-amber-300">
                Built around real study habits
              </p>
              <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">
                Everything important. Nothing distracting.
              </h2>
              <p className="mt-5 max-w-2xl leading-7 text-indigo-100/70">
                A connected system for teaching, practice, review, and support—designed to help
                students know what to do next.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 0.04} className="h-full">
                  <article className="h-full bg-[#111c44] p-7 transition-colors hover:bg-[#172554]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-6 text-lg font-extrabold">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-indigo-100/65">{text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Reveal className="text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-amber-700">
                Straightforward admissions
              </p>
              <h2 className="font-display mt-3 text-4xl text-slate-950 sm:text-5xl">
                From selection to study desk.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
                A simple, human-reviewed enrollment flow keeps payment and access clear.
              </p>
            </Reveal>
            <div className="relative mt-12 grid gap-5 md:grid-cols-3">
              {admissions.map(({ icon: Icon, step, title, text }, index) => (
                <Reveal key={step} delay={index * 0.08}>
                  <article className="relative h-full rounded-3xl border border-slate-200 bg-[#fbfaf7] p-7">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-800 text-white">
                        <Icon size={21} />
                      </span>
                      <span className="font-display text-4xl text-amber-500/40">{step}</span>
                    </div>
                    <h3 className="mt-7 text-lg font-extrabold text-slate-950">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Reveal>
              <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft lg:grid-cols-[.8fr_1.2fr]">
                <div className="bg-indigo-50 p-8 sm:p-10">
                  <MessageSquareText className="text-indigo-700" size={34} />
                  <p className="mt-10 text-xs font-extrabold uppercase tracking-[.22em] text-amber-700">
                    CA knowledge hub
                  </p>
                  <h2 className="font-display mt-3 text-4xl leading-tight text-slate-950">
                    Know the journey before you begin it.
                  </h2>
                  <p className="mt-5 text-sm leading-7 text-slate-600">
                    Clear guides for students and families making an informed decision about
                    commerce education.
                  </p>
                </div>
                <div className="divide-y divide-slate-200">
                  {guides.map(({ icon: Icon, title, text, href }) => (
                    <Link
                      key={title}
                      to={href}
                      className="group flex min-h-40 items-center gap-5 p-7 transition-colors hover:bg-amber-50/60 sm:p-8"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200">
                        <Icon size={22} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-extrabold text-slate-950">
                          {title}
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-slate-500">{text}</span>
                      </span>
                      <ArrowRight
                        className="shrink-0 text-indigo-700 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                        size={20}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
        <section className="px-6 pb-20 pt-4 sm:pb-24 lg:px-8">
          <Reveal>
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-indigo-800 px-7 py-14 text-center text-white shadow-lift sm:px-12 sm:py-20">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(245,180,39,.2),transparent_27%),radial-gradient(circle_at_90%_100%,rgba(129,140,248,.35),transparent_30%)]"
              />
              <div className="relative">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                  <LockKeyhole size={22} />
                </span>
                <h2 className="font-display mx-auto mt-6 max-w-3xl text-4xl leading-tight sm:text-5xl">
                  Ready to make your study plan feel manageable?
                </h2>
                <p className="mx-auto mt-5 max-w-xl leading-7 text-indigo-100/75">
                  Join a focused platform built for classes, practice, progress, and dependable
                  academic support.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={() => navigate("/login")}
                    className="bg-amber-400 text-slate-950 hover:bg-amber-300"
                  >
                    Start learning <ArrowRight />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/register")}
                    className="border-white/25 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
                  >
                    Create account
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
};
export default Home;
