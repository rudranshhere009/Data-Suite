import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import LoadingScreen from './components/LoadingScreen';
import Header from './components/Header';
import MainContent from './components/MainContent';
import Footer from './components/Footer';
import Auth from './components/Auth';
// Removed: import { getShipDetails, getShipRoute } from './services/aisApi';

// Main App component that handles the authenticated state
const AppContent = () => {
  const { isAuthenticated, isLoading, handleAuthSuccess } = useAuth();
  const [activeTab, setActiveTab] = useState("map");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshData, setRefreshData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Removed: searchedShipDetails, searchedShipRoute, showShipProfile, showMapPopup state variables

  // Removed: onSearchShip and handleShowMap functions

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show authentication screen if not logged in
  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Main application interface
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100">
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        refreshData={refreshData}
        isRefreshing={isRefreshing}
        setIsRefreshing={setIsRefreshing}
      />
      
      <MainContent 
        activeTab={activeTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setRefreshData={setRefreshData}
        isRefreshing={isRefreshing}
        // Removed: searchedShipDetails, searchedShipRoute, showShipProfile, showMapPopup, onShowMap, onCloseMapPopup, onSearchShip
      />
      
      <Footer />
    </div>
  );
};

// Root App component with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
