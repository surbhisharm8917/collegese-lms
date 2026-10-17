import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FaArrowRight,
  FaBalanceScale,
  FaBookOpen,
  FaBriefcase,
  FaCalculator,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaGraduationCap,
  FaLandmark,
  FaRegClock,
  FaRoute,
  FaUserTie,
} from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PageKind = "profession" | "curriculum" | "roadmap";

type Highlight = {
  icon: IconType;
  title: string;
  body: string;
};

type PageConfig = {
  eyebrow: string;
  title: string;
  intro: string;
  heroStats: Array<{ value: string; label: string }>;
  highlights: Highlight[];
  stages: Array<{ title: string; body: string; progress: number }>;
  tabOne: {
    label: string;
    items: Array<{ title: string; body: string }>;
  };
  tabTwo: {
    label: string;
    items: Array<{ title: string; body: string }>;
  };
  spotlight: {
    title: string;
    body: string;
    points: string[];
  };
};

const pages: Record<PageKind, PageConfig> = {
  profession: {
    eyebrow: "CA Profession",
    title: "A profession built on trust, numbers, and strategic judgment.",
    intro:
      "Chartered Accountants guide businesses through accounting, tax, audit, compliance, finance, and decision-making. This page gives learners a premium overview of what the profession actually looks like beyond the exam syllabus.",
    heroStats: [
      { value: "Audit", label: "Assurance and controls" },
      { value: "Tax", label: "Direct and indirect taxation" },
      { value: "Finance", label: "Planning, reporting, advisory" },
    ],
    highlights: [
      {
        icon: FaBalanceScale,
        title: "Regulatory Confidence",
        body: "CAs help organizations follow financial reporting, tax, and compliance expectations with professional discipline.",
      },
      {
        icon: FaChartLine,
        title: "Business Advisory",
        body: "The role extends into forecasting, budgets, risk review, internal controls, and commercial decisions.",
      },
      {
        icon: FaUserTie,
        title: "Professional Identity",
        body: "A CA is expected to combine technical accuracy, ethics, communication, and client-ready judgment.",
      },
    ],
    stages: [
      {
        title: "Foundation Thinking",
        body: "Build command over accounting basics, law language, and economics logic.",
        progress: 34,
      },
      {
        title: "Intermediate Application",
        body: "Connect concepts across tax, costing, audit, corporate law, and financial management.",
        progress: 66,
      },
      {
        title: "Final Professionalism",
        body: "Move from solving questions to forming judgments, presenting advice, and handling complexity.",
        progress: 92,
      },
    ],
    tabOne: {
      label: "Core Roles",
      items: [
        {
          title: "Audit and Assurance",
          body: "Review systems, test records, and provide confidence on financial information.",
        },
        {
          title: "Taxation",
          body: "Plan, compute, review, and represent tax positions across business scenarios.",
        },
        {
          title: "Financial Advisory",
          body: "Support working capital, investment decisions, compliance strategy, and reporting.",
        },
      ],
    },
    tabTwo: {
      label: "Professional Skills",
      items: [
        {
          title: "Clarity Under Pressure",
          body: "Read facts quickly, identify the issue, and communicate the conclusion cleanly.",
        },
        {
          title: "Ethical Judgment",
          body: "Balance client goals with law, standards, professional conduct, and public trust.",
        },
        {
          title: "Commercial Awareness",
          body: "Understand how finance decisions affect cash flow, growth, risk, and governance.",
        },
      ],
    },
    spotlight: {
      title: "Best for students who want a respected commerce career",
      body: "This page can become the website's profession explainer for new students and parents evaluating CA as a long-term path.",
      points: [
        "What CAs do",
        "Where CAs work",
        "What skills matter",
        "How classes connect to career outcomes",
      ],
    },
  },
  curriculum: {
    eyebrow: "CA Curriculum",
    title: "A structured curriculum that turns commerce concepts into exam-ready command.",
    intro:
      "The CA curriculum rewards consistency, conceptual clarity, writing practice, and revision discipline. This page presents the course map in a student-friendly way.",
    heroStats: [
      { value: "Foundation", label: "Concepts and entry base" },
      { value: "Intermediate", label: "Application and depth" },
      { value: "Final", label: "Professional judgment" },
    ],
    highlights: [
      {
        icon: FaBookOpen,
        title: "Concept Classes",
        body: "Topic-first lectures break large subjects into manageable commerce learning blocks.",
      },
      {
        icon: FaClipboardList,
        title: "Practice Discipline",
        body: "Chapter tests, mock exams, and revision schedules keep preparation measurable.",
      },
      {
        icon: FaCalculator,
        title: "Problem Solving",
        body: "Accounting, costing, tax, and finance topics are practiced through exam-style cases.",
      },
    ],
    stages: [
      {
        title: "Foundation",
        body: "Accounting, business laws, quantitative aptitude, business economics, and commercial knowledge.",
        progress: 30,
      },
      {
        title: "Intermediate",
        body: "Advanced accounting, corporate laws, taxation, costing, audit, and financial management.",
        progress: 65,
      },
      {
        title: "Final",
        body: "Strategic financial management, audit, direct tax, indirect tax, reporting, and electives.",
        progress: 95,
      },
    ],
    tabOne: {
      label: "Study Blocks",
      items: [
        {
          title: "Accounting and Reporting",
          body: "Build accuracy in journal entries, standards, statements, and financial interpretation.",
        },
        {
          title: "Law and Audit",
          body: "Learn legal provisions, audit logic, controls, evidence, and professional responsibilities.",
        },
        {
          title: "Tax and Finance",
          body: "Practice computations, planning, working capital, costing, and decision-making tools.",
        },
      ],
    },
    tabTwo: {
      label: "Learning System",
      items: [
        {
          title: "Live Lectures",
          body: "Interactive sessions help students ask questions while the topic is fresh.",
        },
        {
          title: "Recordings",
          body: "Recorded lectures allow revision and self-paced catch-up before tests.",
        },
        {
          title: "Assessments",
          body: "Quizzes and assignments reveal whether students can apply concepts under exam conditions.",
        },
      ],
    },
    spotlight: {
      title: "Best for explaining what students will study",
      body: "This page can become the public curriculum section for batches, course detail pages, and admissions counseling.",
      points: [
        "Foundation overview",
        "Intermediate subject map",
        "Final-level expectations",
        "Testing and revision rhythm",
      ],
    },
  },
  roadmap: {
    eyebrow: "Career Roadmap",
    title: "From first commerce class to professional CA readiness.",
    intro:
      "A clear roadmap helps students understand the journey: learn the basics, practice consistently, attempt exams, complete practical training, and build professional confidence.",
    heroStats: [
      { value: "Learn", label: "Concept mastery" },
      { value: "Practice", label: "Tests and revision" },
      { value: "Perform", label: "Exam and career readiness" },
    ],
    highlights: [
      {
        icon: FaRoute,
        title: "Clear Milestones",
        body: "Students can see how each phase connects to exams, skill-building, and professional outcomes.",
      },
      {
        icon: FaRegClock,
        title: "Revision Cadence",
        body: "A practical timetable keeps learning, testing, and doubt-solving in balance.",
      },
      {
        icon: FaBriefcase,
        title: "Career Awareness",
        body: "Early exposure to roles in audit, taxation, finance, and advisory builds motivation.",
      },
    ],
    stages: [
      {
        title: "Orientation",
        body: "Understand CA as a profession, exam structure, time commitment, and study routine.",
        progress: 25,
      },
      {
        title: "Preparation",
        body: "Complete lectures, notes, question practice, chapter tests, and revision cycles.",
        progress: 70,
      },
      {
        title: "Professional Launch",
        body: "Move toward exam attempts, articleship exposure, communication skills, and specialization.",
        progress: 100,
      },
    ],
    tabOne: {
      label: "Student Journey",
      items: [
        {
          title: "Discover",
          body: "Learn what the CA course demands and how commerce subjects connect with career roles.",
        },
        {
          title: "Prepare",
          body: "Use structured classes, tests, and mentor feedback to build speed and confidence.",
        },
        {
          title: "Advance",
          body: "Grow from syllabus completion to presentation quality, exam strategy, and practical skill.",
        },
      ],
    },
    tabTwo: {
      label: "Career Tracks",
      items: [
        {
          title: "Practice and Audit",
          body: "Work with firms, assurance, compliance, internal control, and financial reporting.",
        },
        {
          title: "Corporate Finance",
          body: "Support finance teams across planning, analysis, taxation, reporting, and governance.",
        },
        {
          title: "Entrepreneurship",
          body: "Build advisory services, tax practice, consulting, or independent commerce ventures.",
        },
      ],
    },
    spotlight: {
      title: "Best for guiding students and parents",
      body: "This page can become the roadmap section for counseling calls, admission pages, and batch onboarding.",
      points: [
        "Study milestones",
        "Exam readiness",
        "Articleship awareness",
        "Career tracks after qualification",
      ],
    },
  },
};

const CAPublicPage = ({ type }: { type: PageKind }) => {
  const page = pages[type];

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
      <Navbar />

      <main className="flex-1">
        <section className="border-b border-slate-100 bg-[linear-gradient(135deg,#F8FAFC_0%,#FFFFFF_42%,#FFF3EA_100%)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
            <div>
              <BrandLogo className="mb-8" imageClassName="h-10 w-10" />
              <Badge className="border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-50">
                {page.eyebrow}
              </Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-[#072A60] sm:text-5xl lg:text-6xl">
                {page.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">{page.intro}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-11 rounded-full bg-orange-500 px-6 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
                >
                  <Link to="/register">
                    Join a Batch
                    <FaArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-full border-slate-200 px-6 text-[#072A60] hover:bg-slate-50"
                >
                  <Link to="/ca-curriculum">Explore Curriculum</Link>
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden rounded-lg border-slate-200 bg-white/90 shadow-xl shadow-slate-200/70">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                <CardTitle className="flex items-center gap-2 text-xl text-[#072A60]">
                  <FaGraduationCap className="h-5 w-5 text-orange-500" />
                  CA Learning Snapshot
                </CardTitle>
                <CardDescription>
                  A quick visual summary for students exploring this pathway.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                {page.heroStats.map((stat) => (
                  <div key={stat.value} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-2xl font-extrabold text-[#072A60]">{stat.value}</span>
                      <span className="text-right text-sm text-slate-500">{stat.label}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
                Premium Overview
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">What students should know</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-500">
              These sections are designed as polished website-ready content blocks that can be
              expanded with batch details, faculty profiles, videos, and testimonials.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {page.highlights.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="rounded-lg border-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
                >
                  <CardHeader>
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[#072A60] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg text-slate-950">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-7 text-slate-600">{item.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <Badge className="border-transparent bg-[#072A60] text-white hover:bg-[#072A60]">
                Structured Path
              </Badge>
              <h2 className="mt-4 text-3xl font-bold text-[#072A60]">How the journey builds</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Use this section as a premium roadmap block for explaining progression, preparation
                depth, and the value of consistent coaching.
              </p>
            </div>

            <div className="space-y-4">
              {page.stages.map((stage) => (
                <Card key={stage.title} className="rounded-lg border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-semibold text-slate-950">{stage.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{stage.body}</p>
                      </div>
                      <span className="text-sm font-bold text-orange-500">{stage.progress}%</span>
                    </div>
                    <Progress
                      value={stage.progress}
                      className="mt-4 h-2 bg-slate-100 [&>div]:bg-orange-500"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <Tabs defaultValue="first" className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
                Details
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">Explore the key areas</h2>
              <TabsList className="mt-6 h-auto flex-wrap justify-start rounded-lg bg-slate-100 p-1">
                <TabsTrigger value="first" className="rounded-md px-4 py-2">
                  {page.tabOne.label}
                </TabsTrigger>
                <TabsTrigger value="second" className="rounded-md px-4 py-2">
                  {page.tabTwo.label}
                </TabsTrigger>
              </TabsList>
            </div>

            <div>
              <TabsContent value="first" className="mt-0">
                <div className="grid gap-4">
                  {page.tabOne.items.map((item) => (
                    <DetailRow key={item.title} title={item.title} body={item.body} />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="second" className="mt-0">
                <div className="grid gap-4">
                  {page.tabTwo.items.map((item) => (
                    <DetailRow key={item.title} title={item.title} body={item.body} />
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </section>

        <section className="px-6 pb-16">
          <Card className="mx-auto max-w-7xl overflow-hidden rounded-lg border-slate-200 bg-[linear-gradient(135deg,#072A60_0%,#0B3D83_72%,#FF5A00_150%)] text-white shadow-xl shadow-slate-900/20">
            <CardContent className="grid gap-8 p-8 lg:grid-cols-[1fr_0.9fr] lg:p-10">
              <div>
                <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                  Website-ready block
                </Badge>
                <h2 className="mt-5 text-3xl font-bold">{page.spotlight.title}</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
                  {page.spotlight.body}
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <FaCheckCircle className="text-orange-300" />
                  Content hooks
                </h3>
                <Separator className="mb-4 bg-white/15" />
                <ul className="space-y-3">
                  {page.spotlight.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-white/85">
                      <span className="mt-1 h-2 w-2 rounded-full bg-orange-300" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

const DetailRow = ({ title, body }: { title: string; body: string }) => (
  <Card className="rounded-lg border-slate-200 shadow-sm">
    <CardContent className="flex gap-4 p-5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
        <FaLandmark className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-7 text-slate-600">{body}</p>
      </div>
    </CardContent>
  </Card>
);

export default CAPublicPage;
