import React from 'react';
import { ArrowRight } from 'lucide-react';
import '../styles/CoverPage.css';

const CoverPage = ({ onBeginInvestigation, theme }) => {
  return (
    <div className={`cover-page ${theme === "light" ? "light-mode" : ""}`}>
      {/* Iceberg Hero Image — centered, the visual heart of the page */}
      <div className="iceberg-container">
        <img
          src={theme === "light" ? "/iceberg_light.jpg" : "/iceberg_hero.jpg"}
          alt="Iceberg - what lies beneath the surface"
          className="iceberg-img"
        />
        {/* Gradient overlays to blend iceberg into the dark background */}
        <div className="iceberg-overlay-top" />
        <div className="iceberg-overlay-bottom" />
        <div className="iceberg-overlay-left" />
        <div className="iceberg-overlay-right" />
      </div>

      {/* Iceberg Labels */}
      <div className="iceberg-labels">
        <div className="iceberg-label label-surface">
          <svg className="label-arrow arrow-1" viewBox="0 0 50 50" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 40,10 Q 20,15 10,40" />
            <path d="M 10,40 L 15,30 M 10,40 L 25,40" />
          </svg>
          <span className="label-title">Surface Web</span>
          <span className="label-desc">Public data, social media,{'\n'}forums, websites</span>
        </div>
        <div className="iceberg-label label-deep">
          <svg className="label-arrow arrow-2" viewBox="0 0 50 50" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 40,10 Q 25,25 10,30" />
            <path d="M 10,30 L 18,22 M 10,30 L 20,35" />
          </svg>
          <span className="label-title">Deep Web</span>
          <span className="label-desc">Private databases,{'\n'}internal systems, documents</span>
        </div>
        <div className="iceberg-label label-dark">
          <svg className="label-arrow arrow-3" viewBox="0 0 50 50" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 40,40 Q 20,35 10,10" />
            <path d="M 10,10 L 20,10 M 10,10 L 15,20" />
          </svg>
          <span className="label-title">Dark Web</span>
          <span className="label-desc">Anonymous markets,{'\n'}forums, encrypted networks</span>
        </div>
      </div>

      {/* Left Content: Headline + CTA */}
      <div className="cover-text-block">
        <h1 className="cover-headline">
          See what lies<br />beneath.
        </h1>
        <p className="cover-description">
          Onion Slayer connects the dots across<br />
          the open web, deep web and dark web<br />
          to reveal the real actors behind the threats.
        </p>
        <button className="cover-cta" onClick={onBeginInvestigation}>
          Start Investigation <ArrowRight size={16} />
        </button>
      </div>

      {/* Network Graph Visualization */}
      <div className="network-graph">
        {/* Central Onion Icon */}
        <div className="graph-center-node">
          <img src="/onion_logo.png" alt="" className="graph-center-icon" />
        </div>
        {/* Orbiting Labeled Nodes */}
        <div className="graph-node node-wallets"><span className="graph-node-dot" /><span className="graph-node-label">Wallets</span></div>
        <div className="graph-node node-pgp"><span className="graph-node-dot" /><span className="graph-node-label">PGP</span></div>
        <div className="graph-node node-aliases"><span className="graph-node-dot" /><span className="graph-node-label">Aliases</span></div>
        <div className="graph-node node-markets"><span className="graph-node-dot" /><span className="graph-node-label">Markets</span></div>
        <div className="graph-node node-infra"><span className="graph-node-dot" /><span className="graph-node-label">Infrastructure</span></div>
        <div className="graph-node node-identities"><span className="graph-node-dot" /><span className="graph-node-label">Identities</span></div>
        <div className="graph-node node-relationships"><span className="graph-node-dot" /><span className="graph-node-label">Relationships</span></div>

        {/* Connecting Lines (SVG) */}
        <svg className="graph-lines" viewBox="0 0 300 300" fill="none">
          {/* Lines from center (150,150) to each node */}
          <line x1="150" y1="150" x2="80" y2="55" stroke="var(--border-soft)" strokeWidth="1.5" />
          <line x1="150" y1="150" x2="210" y2="50" stroke="var(--border-soft)" strokeWidth="1.5" />
          <line x1="150" y1="150" x2="260" y2="110" stroke="var(--border-soft)" strokeWidth="1.5" />
          <line x1="150" y1="150" x2="50" y2="130" stroke="var(--border-soft)" strokeWidth="1.5" />
          <line x1="150" y1="150" x2="220" y2="220" stroke="var(--border-soft)" strokeWidth="1.5" />
          <line x1="150" y1="150" x2="80" y2="240" stroke="var(--border-soft)" strokeWidth="1.5" />
          <line x1="150" y1="150" x2="210" y2="270" stroke="var(--border-soft)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Bottom Tagline */}
      <div className="cover-bottom-tagline">
        <div className="tagline-line" />
        <span className="tagline-text">From hidden fragments to connected intelligence.</span>
      </div>
    </div>
  );
};

export default CoverPage;
