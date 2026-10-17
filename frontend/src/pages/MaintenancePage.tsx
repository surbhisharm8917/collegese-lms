import { useState, useEffect } from "react";
import { BRAND } from "@/lib/brand";

const MAINTENANCE_END_TIME = new Date().getTime() + 2 * 60 * 60 * 1000;

const MaintenancePage = () => {
  const [timeLeft, setTimeLeft] = useState(MAINTENANCE_END_TIME - new Date().getTime());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const remaining = MAINTENANCE_END_TIME - now;
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getFormattedTime = (milliseconds: number) => {
    if (milliseconds <= 0) return "00:00:00:00";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days.toString().padStart(2, "0")}:${hours
      .toString()
      .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-6 text-center">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg border border-slate-200">
        <div className="mb-6">
          <img
            src={BRAND.assets.webLogo}
            alt={`${BRAND.name} logo`}
            className="h-28 mx-auto filter drop-shadow-md"
          />
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#072A60] mt-4">{BRAND.name}</h2>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Under Maintenance</h1>
        <p className="text-gray-700 text-lg mb-6">
          We're currently performing updates to improve your commerce learning experience.
        </p>

        {timeLeft > 0 && (
          <div className="mt-6">
            <p className="text-gray-800 text-2xl md:text-3xl font-bold">
              ⏳ Time Remaining:{" "}
              <span className="text-orange-600">{getFormattedTime(timeLeft)}</span>
            </p>
            <p className="text-gray-500 text-sm mt-2">(DD:HH:MM:SS)</p>
          </div>
        )}

        <p className="text-gray-500 text-sm mt-6">
          The site will be back online shortly. Thank you for your patience!
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;
