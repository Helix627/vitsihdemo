import React from "react";

const Loading = ({ message = "Deciphering Darknet Infrastructure & Actor Graphs...", error, onRetry }) => {
  if (error) {
    return (
      <div className="loading-screen">
        <div className="error-card">
          <div className="loading-logo-wrap">
            <img src="/onion_logo.png" alt="Onion Slayer" className="loading-logo error-logo" />
          </div>
          <h2>Cannot connect to CTI backend</h2>
          <p>{error}</p>
          <button className="btn primary" onClick={onRetry} type="button">
            ⚡ Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-logo-wrap">
          <div className="radar-pulse-ring ring-1" />
          <div className="radar-pulse-ring ring-2" />
          <img src="/onion_logo.png" alt="Onion Slayer" className="loading-logo pulse-anim" />
        </div>
        <div className="loading-brand-text">
          <h1 className="loading-title">ONION SLAYER</h1>
          <p className="loading-tagline">UNMASKING THREATS. SECURING TOMORROW.</p>
        </div>
        <div className="loading-status-bar">
          <div className="loading-progress-line" />
        </div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default Loading;
