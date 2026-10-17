import React from "react";

const Unauthorized: React.FC = () => {
  return (
    <div className="flex w-full h-screen bg-white">
      <div className="relative hidden md:block w-1/2 h-full">
        <img
          src="/assets/Unauthorized.png"
          alt="Unauthorized illustration"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex items-center justify-center w-full md:w-1/2 h-full p-4">
        <div className="flex flex-col items-center p-8 bg-white rounded-lg max-w-7xl w-full mx-4">
          <div className="flex md:hidden items-center justify-center p-4">
            <div className="relative w-[300px] h-[300px]">
              <img
                src="/assets/Unauthorized.png"
                alt="Unauthorized illustration"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left md:ml-10">
            <div className="p-8 border-4 border-orange-200 rounded-lg">
              <h2 className="text-3xl sm:text-4xl font-bold text-orange-400 mb-2">Access denied</h2>
              <p className="text-gray-700 text-lg sm:text-xl mb-6">
                You do not have permission to view this page. <br /> Please contact your
                Administrator.
              </p>
              <button
                onClick={() => (window.location.href = "/login")}
                className="px-6 py-3 bg-orange-400 text-white font-bold text-lg rounded-md hover:bg-orange-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
