import React from 'react';
import '../styles/components/Welcome.css';

const featureCards = [
  {
    label: 'AIS overlays',
    value: 'Live vessel context with quick ship lookup'
  },
  {
    label: 'Route playback',
    value: 'Map views, course trends, and track review'
  },
  {
    label: 'Risk signals',
    value: 'Destination anomaly checks before decisions'
  }
];

const Welcome = () => {
  return (
    <section className="welcome-container">
      <div className="welcome-content">
        <div className="welcome-eyebrow">
          <span className="welcome-eyebrow-line" aria-hidden="true"></span>
          <span className="welcome-eyebrow-text">Route intelligence deck</span>
        </div>

        <div className="welcome-top-row">
          <div className="welcome-icon">
            <i className="material-icons">anchor</i>
          </div>
          <div className="welcome-status">
            <span className="welcome-status-dot" aria-hidden="true"></span>
            Search ready
          </div>
        </div>

        <h1 className="welcome-title">
          Welcome to the <span>Routes Section</span>
        </h1>
        <p className="welcome-description">
          Track and analyze maritime routes with precision. Use the search bar above to
          find a ship by name or MMSI, open detailed profiles, explore tracks on the
          interactive map, review speed and course patterns, and surface anomaly signals
          in one workflow.
        </p>

        <div className="welcome-highlights">
          {featureCards.map((card) => (
            <div key={card.label} className="welcome-highlight">
              <span className="welcome-highlight-label">{card.label}</span>
              <p className="welcome-highlight-value">{card.value}</p>
            </div>
          ))}
        </div>

        <p className="welcome-instruction">
          Start by searching for a ship above to begin your analysis.
        </p>
      </div>
    </section>
  );
};

export default Welcome;
