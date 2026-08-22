const StatsCard = ({ label, value }) => (
  <div className="stats-card">
    <p className="stats-label">{label}</p>
    <p className="stats-value">{value}</p>
  </div>
);

export default StatsCard;
