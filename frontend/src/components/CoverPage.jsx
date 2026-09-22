import React, { useEffect, useState } from 'react';
import { Users, GitBranch, Layers, ShieldAlert, ArrowRight, Activity } from 'lucide-react';
import '../styles/CoverPage.css';

const CoverPage = ({ onBeginInvestigation, theme = 'dark' }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxStyle = {
    transform: `translateY(${scrollY * 0.15}px)`
  };

  return (
    <div className={`cover-page-container theme-${theme}`}>
      <div className="hero-section">
        <div className="image-container">
          <div className="gradient-overlay top"></div>
          <img 
            src="https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1200&q=80" 
            alt="Iceberg representing web depths"
            className="iceberg-img"
            style={parallaxStyle}
          />
          <div className="gradient-overlay bottom"></div>
          
          {/* Handwritten Annotations */}
          <div className="annotations">
            <div className="annotation surface">
              <span className="handwritten">SURFACE WEB</span>
              <p className="desc">public data, social media, forums</p>
              <div className="line"></div>
            </div>
            <div className="annotation deep">
              <span className="handwritten">DEEP WEB</span>
              <p className="desc">private databases, internal systems, documents</p>
              <div className="line"></div>
            </div>
            <div className="annotation dark">
              <span className="handwritten">DARK WEB</span>
              <p className="desc">anonymous markets, forums, encrypted networks</p>
              <div className="line"></div>
            </div>
          </div>
        </div>

        <div className="content-overlay">
          <div className="text-content">
            <h1 className="headline">See what lies beneath.</h1>
            <h2 className="sub-headline">From hidden fragments to connected intelligence.</h2>
            <p className="handwritten-tagline">
              {theme === 'dark' 
                ? 'The internet is deeper than you think.' 
                : 'Same internet. Different depths.'}
            </p>
            <button className="cta-button" onClick={onBeginInvestigation}>
              Begin Investigation <ArrowRight size={20} className="cta-icon" />
            </button>
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <div className="stats-container">
          <div className="stat-item">
            <Users className="stat-icon" size={24} />
            <div className="stat-details">
              <span className="stat-label">Entities</span>
              <span className="stat-value">1,284 <span className="stat-change">+12%</span></span>
            </div>
          </div>
          <div className="stat-item">
            <GitBranch className="stat-icon" size={24} />
            <div className="stat-details">
              <span className="stat-label">Relationships</span>
              <span className="stat-value">342 <span className="stat-change">+8%</span></span>
            </div>
          </div>
          <div className="stat-item">
            <Layers className="stat-icon" size={24} />
            <div className="stat-details">
              <span className="stat-label">Clusters</span>
              <span className="stat-value">47 <span className="stat-change">+5%</span></span>
            </div>
          </div>
          <div className="stat-item">
            <ShieldAlert className="stat-icon" size={24} />
            <div className="stat-details">
              <span className="stat-label">Review</span>
              <span className="stat-value">18 <span className="stat-change">+3%</span></span>
            </div>
          </div>
        </div>
        
        <div className="recent-activity">
          <Activity size={16} className="activity-icon" />
          <span className="activity-text">New relationship detected • MagicHat → Agora • 12m ago</span>
          <button className="view-all">View all <ArrowRight size={14} /></button>
        </div>
      </div>
    </div>
  );
};

export default CoverPage;
