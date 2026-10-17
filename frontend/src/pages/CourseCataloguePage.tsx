import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, IndianRupee, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import api from "@/lib/api";
import { useUser } from "@/context/useUser";
import { getProgramme, PROGRAMMES } from "@/lib/programmes";

interface PublicCourse {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  category?: string | null;
  priceInPaise: number;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
}

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

const CourseCataloguePage = () => {
  const { role } = useUser();
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/public/courses")
      .then(({ data }) => setCourses(data.courses || []))
      .catch(() =>
        setError(
          "Live batches could not be loaded right now. You can still explore every programme below.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(
    () => new Map(PROGRAMMES.map((p) => [p.name, courses.filter((c) => c.category === p.name)])),
    [courses],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="relative overflow-hidden bg-[#061f46] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,.28),transparent_30%),radial-gradient(circle_at_85%_70%,rgba(14,165,233,.2),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[.2em]">
            <Sparkles className="h-4 w-4 text-orange-300" /> Academy catalogue
          </span>
          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            Find the programme that moves your ambition forward.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">
            Explore school commerce and complete CA, CS and CMA learning pathways. Register for the
            programme you want and submit your batch payment securely from your learner dashboard.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-20 px-6 py-16">
        <section>
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-orange-600">
                All learning paths
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#072A60]">11 programme families</h2>
            </div>
            <p className="hidden max-w-lg text-right text-sm leading-6 text-slate-500 md:block">
              Every cover is an original academy illustration designed to make each learning path
              distinct.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMMES.map((programme, index) => {
              const Icon = programme.icon;
              const liveCount = grouped.get(programme.name)?.length ?? 0;
              return (
                <motion.article
                  key={programme.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (index % 3) * 0.06 }}
                  className={`group relative min-h-64 overflow-hidden rounded-3xl bg-gradient-to-br ${programme.gradient} p-6 text-white shadow-xl shadow-slate-300/50`}
                >
                  <div
                    className={`absolute -right-10 -top-10 h-36 w-36 rounded-full ${programme.glow} opacity-25 blur-2xl`}
                  />
                  <div className="absolute bottom-3 right-4 select-none text-[7rem] font-black leading-none text-white/[.07]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between">
                      <div className="rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur">
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="rounded-full bg-black/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                        {liveCount
                          ? `${liveCount} live ${liveCount === 1 ? "batch" : "batches"}`
                          : "Programme open"}
                      </span>
                    </div>
                    <p className="mt-8 text-xs font-bold uppercase tracking-[.22em] text-white/70">
                      {programme.shortLabel}
                    </p>
                    <h3 className="mt-2 text-2xl font-black">{programme.name}</h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-white/80">
                      {programme.description}
                    </p>
                    <Link
                      to={`/register?programme=${encodeURIComponent(programme.name)}`}
                      className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-bold"
                    >
                      Choose programme{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-orange-600">
              Admissions open
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#072A60]">Published courses & batches</h2>
            <p className="mt-2 text-sm text-slate-500">
              Select a live batch now; payment approval and enrollment happen after registration.
            </p>
          </div>
          {loading ? (
            <div className="py-16">
              <Loader />
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <h3 className="text-lg font-bold text-slate-800">New batches are being prepared</h3>
              <p className="mt-2 text-sm text-slate-500">
                Choose your programme above to create an account. An administrator can publish a
                matching batch when admissions open.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                const meta = getProgramme(course.category);
                return (
                  <article
                    key={course.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div
                      className={`relative h-48 overflow-hidden bg-gradient-to-br ${meta?.gradient || "from-slate-800 to-orange-500"}`}
                    >
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : meta ? (
                        <div className="flex h-full items-center justify-center">
                          <meta.icon className="h-20 w-20 text-white/80" />
                        </div>
                      ) : null}
                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#072A60] backdrop-blur">
                        {course.category || "Commerce"}
                      </span>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-black text-slate-900">{course.title}</h3>
                      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">
                        {course.description ||
                          "Structured classes, guided practice and learner support."}
                      </p>
                      <div className="mt-5 flex items-center justify-between border-y border-slate-100 py-4">
                        <span className="flex items-center gap-1 text-xl font-black text-[#072A60]">
                          <IndianRupee className="h-5 w-5" />
                          {money(course.priceInPaise).replace("₹", "")}
                        </span>
                        {course.startDate && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <CalendarDays className="h-4 w-4" />
                            {new Date(course.startDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>
                      <Link
                        to={
                          role === "STUDENT"
                            ? `/dashboard/student/dashboard?courseId=${encodeURIComponent(course.id)}&payment=1`
                            : `/register?programme=${encodeURIComponent(course.category || "")}&courseId=${encodeURIComponent(course.id)}`
                        }
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
                      >
                        {role === "STUDENT" ? "Continue to checkout" : "Register for this batch"}{" "}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {error && (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CourseCataloguePage;
