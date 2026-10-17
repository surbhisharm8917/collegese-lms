import { ArrowUpRight } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

const groups = [
  {
    heading: "Learning",
    links: [
      { label: "CA Profession", href: "/ca-profession" },
      { label: "CA Curriculum", href: "/ca-curriculum" },
      { label: "Career Roadmap", href: "/ca-roadmap" },
      { label: "Certificates", href: "/register" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Help Center", href: "/grievance" },
      { label: "Curriculum Guide", href: "/ca-curriculum" },
      { label: "Commerce Education", href: "/ca-profession" },
      { label: "Student Support", href: "/grievance" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Grievance", href: "/grievance" },
    ],
  },
];
const Footer = () => (
  <footer className="mt-auto overflow-hidden bg-[#101a3d] text-white">
    <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <div className="grid gap-12 border-b border-white/10 pb-14 lg:grid-cols-[1.5fr_2fr] lg:gap-20">
        <div>
          <BrandLogo inverse imageClassName="h-11 w-11" />
          <p className="mt-6 max-w-md text-sm leading-7 text-indigo-100/70">
            {BRAND.description} Thoughtful teaching, measurable practice, and dependable
            support—without the noise.
          </p>
          <a
            href="/grievance"
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-extrabold text-slate-950 hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Contact support <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.heading}>
              <h2 className="text-xs font-extrabold uppercase tracking-[.18em] text-amber-300">
                {group.heading}
              </h2>
              <ul className="mt-5 space-y-1">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-100/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5 pt-7 text-xs text-indigo-100/55 sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
        </p>
        <a href="/grievance" className="inline-flex min-h-11 items-center gap-2 hover:text-white">
          Contact support <ArrowUpRight size={14} />
        </a>
      </div>
    </div>
  </footer>
);
export default Footer;
