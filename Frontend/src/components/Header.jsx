import React from 'react';
import { useAuth } from './AuthProvider';

const Header = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  refreshData,
  isRefreshing,
  setIsRefreshing
}) => {
  const { handleLogout } = useAuth();

  return (
    <div className="bg-white shadow-sm border-b border-gray-200"> {/* Added dark classes */}
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - Hamburger menu (only visible on map tab) */}
        <div className="flex items-center space-x-4">
          {activeTab === "map" && (
            <button
              className="hamburger-menu-header text-gray-800" // Added dark class
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <div className="hamburger-line-header bg-gray-800"></div> {/* Added dark class */}
              <div className="hamburger-line-header bg-gray-800"></div> {/* Added dark class */}
              <div className="hamburger-line-header bg-gray-800"></div> {/* Added dark class */}
            </button>
          )}
        </div>
        
        {/* Center - Title */}
        <div className="flex-1 flex items-center justify-center space-x-4">
          <h1 className="text-xl font-bold text-gray-800">
            AIS Maritime Tracking System
          </h1>
        </div>
        
        {/* Right side - Tab buttons, Refresh, and User info */}
        <div className="flex space-x-4 items-center">
          <button
            onClick={() => setActiveTab("map")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "map"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300" // Added dark classes
            }`}
          >
            Live Map
          </button>
          
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300" // Added dark classes
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("forecasting")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "forecasting"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Forecasting
          </button>
          
          <button
            onClick={() => setActiveTab("trends")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "trends"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300" // Added dark classes
            }`}
          >
            Trends
          </button>
          
          
          
          <button
            onClick={() => setActiveTab("routes")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "routes"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300" // Added dark classes
            }`}
          >
            Routes
          </button>
          
          {/* Refresh Button - only visible on map tab */}
          {activeTab === "map" && refreshData && (
            <button
              onClick={async () => {
                console.log("🔄 Refresh button clicked");
                setIsRefreshing(true);
                
                // Show loading for 0.5 seconds minimum
                const loadingPromise = new Promise(resolve => setTimeout(resolve, 500));
                const dataPromise = refreshData();
                
                await Promise.all([loadingPromise, dataPromise]);
                setIsRefreshing(false);
              }}
              disabled={isRefreshing}
              className={`p-2 rounded-md font-medium transition-colors ${
                isRefreshing 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-green-600 hover:bg-green-700"
              } text-white`}
              title="Refresh Data"
              aria-label="Refresh Data"
            >
              <svg 
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h5M20 20v-5h-5M17.657 6.343A8 8 0 006.343 17.657M6.343 6.343A8 8 0 0117.657 17.657"
                />
              </svg>
            </button>
          )}
          
          {/* User info and logout */}
          <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-300 text-gray-700"> {/* Added dark class */}
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;