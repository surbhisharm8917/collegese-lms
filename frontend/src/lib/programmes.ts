import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Calculator,
  ChartNoAxesCombined,
  FileBadge,
  GraduationCap,
  Landmark,
  LibraryBig,
  NotebookTabs,
  Scale,
  School,
} from "lucide-react";

export const PROGRAMME_NAMES = [
  "Class 11",
  "Class 12",
  "CA Foundation",
  "CA Intermediate",
  "CA Final",
  "CSEET",
  "CS Executive",
  "CS Professional",
  "CMA Foundation",
  "CMA Intermediate",
  "CMA Final",
] as const;

export type ProgrammeName = (typeof PROGRAMME_NAMES)[number];

export interface ProgrammeMetadata {
  name: ProgrammeName;
  shortLabel: string;
  description: string;
  gradient: string;
  glow: string;
  icon: LucideIcon;
}

export const PROGRAMMES: readonly ProgrammeMetadata[] = [
  {
    name: "Class 11",
    shortLabel: "XI Commerce",
    description: "Build strong accounts, economics and business fundamentals.",
    gradient: "from-sky-700 via-blue-600 to-cyan-400",
    glow: "bg-cyan-300",
    icon: School,
  },
  {
    name: "Class 12",
    shortLabel: "XII Commerce",
    description: "Board-focused preparation with concept clarity and practice.",
    gradient: "from-indigo-800 via-violet-600 to-fuchsia-400",
    glow: "bg-fuchsia-300",
    icon: GraduationCap,
  },
  {
    name: "CA Foundation",
    shortLabel: "CA • Foundation",
    description: "A confident first step into the Chartered Accountancy pathway.",
    gradient: "from-emerald-800 via-teal-600 to-lime-400",
    glow: "bg-lime-300",
    icon: Landmark,
  },
  {
    name: "CA Intermediate",
    shortLabel: "CA • Intermediate",
    description: "Structured coverage for advanced accounting, law and taxation.",
    gradient: "from-blue-900 via-indigo-700 to-violet-500",
    glow: "bg-violet-300",
    icon: Calculator,
  },
  {
    name: "CA Final",
    shortLabel: "CA • Final",
    description: "Rigorous final-level preparation for professional mastery.",
    gradient: "from-slate-900 via-blue-900 to-orange-500",
    glow: "bg-orange-300",
    icon: FileBadge,
  },
  {
    name: "CSEET",
    shortLabel: "CS • Entrance",
    description: "Focused preparation for the Company Secretary entrance test.",
    gradient: "from-rose-800 via-pink-600 to-amber-400",
    glow: "bg-amber-300",
    icon: BookOpenCheck,
  },
  {
    name: "CS Executive",
    shortLabel: "CS • Executive",
    description: "Develop practical command of company law and governance.",
    gradient: "from-cyan-900 via-cyan-700 to-emerald-400",
    glow: "bg-emerald-300",
    icon: BriefcaseBusiness,
  },
  {
    name: "CS Professional",
    shortLabel: "CS • Professional",
    description: "Professional-level strategy, compliance and governance learning.",
    gradient: "from-purple-950 via-purple-700 to-pink-500",
    glow: "bg-pink-300",
    icon: Scale,
  },
  {
    name: "CMA Foundation",
    shortLabel: "CMA • Foundation",
    description: "Start cost and management accounting with clear fundamentals.",
    gradient: "from-amber-800 via-orange-600 to-yellow-400",
    glow: "bg-yellow-300",
    icon: LibraryBig,
  },
  {
    name: "CMA Intermediate",
    shortLabel: "CMA • Intermediate",
    description: "Strengthen costing, finance, operations and statutory knowledge.",
    gradient: "from-red-900 via-rose-700 to-orange-400",
    glow: "bg-orange-300",
    icon: NotebookTabs,
  },
  {
    name: "CMA Final",
    shortLabel: "CMA • Final",
    description: "Advanced strategic preparation for future finance leaders.",
    gradient: "from-slate-950 via-emerald-900 to-teal-500",
    glow: "bg-teal-300",
    icon: ChartNoAxesCombined,
  },
];

export const isProgrammeName = (value: string | null | undefined): value is ProgrammeName =>
  PROGRAMME_NAMES.includes(value as ProgrammeName);

export const getProgramme = (name: string | null | undefined) =>
  PROGRAMMES.find((programme) => programme.name === name);
