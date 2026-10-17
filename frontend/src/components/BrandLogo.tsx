import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  taglineClassName?: string;
};
const BrandLogo = ({
  compact = false,
  inverse = false,
  className,
  imageClassName,
  textClassName,
  taglineClassName,
}: BrandLogoProps) => (
  <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80",
        inverse && "ring-white/20",
        imageClassName,
      )}
    >
      <img
        src={BRAND.assets.mark}
        alt=""
        className="h-full w-full object-cover"
        aria-hidden="true"
      />
    </span>
    {!compact && (
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span
          className={cn(
            "truncate text-[15px] font-extrabold tracking-[-.025em]",
            inverse ? "text-white" : "text-slate-950",
            textClassName,
          )}
        >
          {BRAND.name}
        </span>
        <span
          className={cn(
            "mt-1.5 truncate text-[9px] font-bold uppercase tracking-[.2em]",
            inverse ? "text-indigo-100/75" : "text-indigo-700/65",
            taglineClassName,
          )}
        >
          {BRAND.tagline}
        </span>
      </span>
    )}
  </span>
);
export default BrandLogo;
