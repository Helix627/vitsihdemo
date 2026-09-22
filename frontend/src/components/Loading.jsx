import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";

const Loading = ({ message = "Deciphering Intelligence...", error, onRetry }) => {
  if (error) {
    return (
      <div className="loading-screen">
        <div className="error-card">
          <div className="loading-logo-wrap error-icon">
            <AlertCircle size={48} color="#ef4444" strokeWidth={1.5} />
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)" }}>Connection Failed</h2>
          <p>{error}</p>
          <button className="btn primary" onClick={onRetry} type="button" style={{ marginTop: "16px" }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-logo-wrap">
          <Loader2 className="spinner-icon" size={42} color="var(--accent)" strokeWidth={1.5} />
        </div>
        <div className="loading-brand-text">
          <h1 className="loading-title" style={{ fontFamily: "var(--font-heading)" }}>ONION SLAYER</h1>
          <p className="loading-tagline">THREAT INTELLIGENCE PLATFORM</p>
        </div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default Loading;
