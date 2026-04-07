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

  const tabs = [
    { id: 'map', label: 'Live Map' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'forecasting', label: 'Forecasting' },
    { id: 'trends', label: 'Trends' },
    { id: 'routes', label: 'Routes' },
  ];

  return (
    <header className="bg-slate-950/95 backdrop-blur border-b border-slate-800 shadow-lg">
      <div className="px-3 md:px-6 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {activeTab === 'map' && (
            <button
              className="hamburger-menu-header text-slate-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <div className="hamburger-line-header bg-slate-100"></div>
              <div className="hamburger-line-header bg-slate-100"></div>
              <div className="hamburger-line-header bg-slate-100"></div>
            </button>
          )}
          <h1 className="text-sm md:text-xl font-extrabold text-slate-100 tracking-tight truncate">
            AIS Maritime Tracking System
          </h1>
        </div>

        <div className="flex items-center justify-end gap-2 md:gap-3 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 md:px-4 py-2 rounded-lg font-semibold text-sm md:text-base whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'map' && refreshData && (
            <button
              onClick={async () => {
                setIsRefreshing(true);
                const loadingPromise = new Promise((resolve) => setTimeout(resolve, 500));
                const dataPromise = refreshData();
                await Promise.all([loadingPromise, dataPromise]);
                setIsRefreshing(false);
              }}
              disabled={isRefreshing}
              className={`p-2.5 rounded-xl font-medium transition-all duration-200 ${
                isRefreshing
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md hover:shadow-lg'
              } text-white`}
              title="Refresh Data"
              aria-label="Refresh Data"
            >
              <svg
                className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : 'animate-pulse'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"
                />
              </svg>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="px-3 py-2 text-xs md:text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
