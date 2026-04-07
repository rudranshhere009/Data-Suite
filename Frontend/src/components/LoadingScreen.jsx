import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-slate-300">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
