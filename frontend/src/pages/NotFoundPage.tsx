import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-6">
      {/* Subtle radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_50%_40%,rgba(251,146,60,0.06),transparent)]"
      />

      <div className="relative z-10 max-w-md text-center">
        {/* Large 404 watermark */}
        <p className="select-none text-[10rem] font-black leading-none tracking-tighter text-gray-100 sm:text-[12rem]">
          404
        </p>

        {/* Message */}
        <div className="-mt-10 sm:-mt-14">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Page not found
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            The page you're looking for doesn't exist or has been moved. Let's get you back on
            track.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-orange-200 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go back
          </button>
          <button
            onClick={() => navigate("/home")}
            className="group inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
          >
            <Home className="h-3.5 w-3.5" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
