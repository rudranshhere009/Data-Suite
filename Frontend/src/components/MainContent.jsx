import React from 'react';
import Map from "./Map";
import ApiDashboard from "./ApiDashboard";
import TrendsDashboard from "./TrendsDashboard";
import RoutesDashboard from "./RoutesDashboard";
import TrafficForecasting from "./TrafficForecasting";

const MainContent = ({
  activeTab,
  sidebarOpen,
  setSidebarOpen,
  setRefreshData,
  isRefreshing,
}) => {
  return (
    <div className="flex-1 overflow-hidden">
      {activeTab === "map" && (
        <div className="h-full w-full">
          <Map 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen}
            setRefreshData={setRefreshData}
            isRefreshing={isRefreshing}
          />
        </div>
      )}
      
      {activeTab === "dashboard" && (
        <div className="h-full w-full overflow-auto p-6">
          <ApiDashboard />
        </div>
      )}

      {activeTab === "trends" && (
        <div className="h-full w-full overflow-auto p-6">
          <TrendsDashboard />
        </div>
      )}

      

      {activeTab === "routes" && (
        <div className="h-full w-full overflow-auto p-6">
          <RoutesDashboard
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            setRefreshData={setRefreshData}
            isRefreshing={isRefreshing}
          />
        </div>
      )}

      {activeTab === "forecasting" && (
        <div className="h-full w-full overflow-auto p-6">
          <TrafficForecasting />
        </div>
      )}
    </div>
  );
};

export default MainContent;