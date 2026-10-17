import { BookOpenCheck, ChartNoAxesCombined, ShieldCheck, Video } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const points = [
  { icon: Video, label: "Live, guided classes" },
  { icon: BookOpenCheck, label: "Structured practice" },
  { icon: ChartNoAxesCombined, label: "Clear progress insights" },
  { icon: ShieldCheck, label: "Secure assessments" },
];
const AuthArtPanel = ({ headline, sub }: { headline: string; sub: string }) => (
  <aside className="relative hidden min-h-screen w-1/2 overflow-hidden bg-[#111c44] lg:flex lg:items-center lg:justify-center">
    <div
      aria-hidden="true"
      className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_18%_15%,rgba(99,102,241,.38),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(245,180,39,.22),transparent_25%)]"
    />
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-25"
      viewBox="0 0 800 900"
      fill="none"
    >
      <path
        d="M-80 210C180 50 410 80 880 280M-80 710C260 500 560 530 880 660"
        stroke="white"
        strokeOpacity=".25"
      />
      <g fill="white">
        {Array.from({ length: 48 }).map((_, index) => (
          <circle
            key={index}
            cx={56 + (index % 6) * 138}
            cy={74 + Math.floor(index / 6) * 112}
            r="1.5"
            fillOpacity=".45"
          />
        ))}
      </g>
    </svg>
    <div className="relative z-10 w-full max-w-lg px-12 text-white">
      <BrandLogo inverse imageClassName="h-12 w-12" />
      <p className="mt-16 text-xs font-extrabold uppercase tracking-[.24em] text-amber-300">
        Your learning desk
      </p>
      <h2 className="font-display mt-4 text-4xl leading-[1.1] xl:text-5xl">{headline}</h2>
      <p className="mt-5 max-w-md text-base leading-7 text-indigo-100/75">{sub}</p>
      <div className="mt-10 grid grid-cols-2 gap-3">
        {points.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex min-h-20 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
              <Icon size={19} />
            </span>
            <span className="text-sm font-bold leading-5 text-indigo-50">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-10 border-l-2 border-amber-400 pl-4 text-sm italic leading-6 text-indigo-100/65">
        “Consistency turns difficult subjects into dependable strengths.”
      </p>
    </div>
  </aside>
);
export default AuthArtPanel;
