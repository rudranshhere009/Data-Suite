import React from 'react';
import '../styles/components/Welcome.css';

const Welcome = () => {
  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <div className="welcome-icon">
          <i className="material-icons">anchor</i>
        </div>
        <h1 className="welcome-title">Welcome to the Routes Section</h1>
        <p className="welcome-description">
          Track and analyze maritime routes with precision. Use the search bar above to find any ship by its name or MMSI number. You can view detailed ship profiles, visualize routes on an interactive map, analyze speed and course with our graph tools, and detect anomalies in destination changes.
        </p>
        <p className="welcome-instruction">
          Start by searching for a ship to begin your analysis.
        </p>
      </div>
    </div>
  );
};

export default Welcome;
