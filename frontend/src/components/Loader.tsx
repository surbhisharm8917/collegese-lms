import React from "react";

interface LoaderProps {
  /** Optional message below the spinner */
  message?: string;
  /** Take full viewport height (default: false, uses min-h-[60vh]) */
  fullScreen?: boolean;
  /** Compact mode – small inline spinner (no centering wrapper) */
  inline?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ message, fullScreen = false, inline = false }) => {
  /* ── Compact inline spinner ────────────────────────────── */
  if (inline) {
    return (
      <div className="flex items-center justify-center py-6" role="status" aria-label="Loading">
        <div className="relative h-6 w-6">
          <div className="absolute inset-0 rounded-full border-2 border-gray-100" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
        </div>
        {message && <span className="ml-2.5 text-sm text-gray-400">{message}</span>}
      </div>
    );
  }

  /* ── Full / section loader ─────────────────────────────── */
  return (
    <div
      className={`flex items-center justify-center ${fullScreen ? "min-h-screen" : "min-h-[60vh]"}`}
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-5">
        {/* Spinner */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-orange-500 animate-spin" />
        </div>

        {/* Message */}
        {message && <p className="text-sm text-gray-400 animate-pulse">{message}</p>}
      </div>
    </div>
  );
};

export default Loader;
