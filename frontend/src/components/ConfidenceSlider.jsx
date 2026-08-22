const ConfidenceSlider = ({ value, onChange }) => {
  return (
    <div className="confidence-slider-wrap">
      <label className="slider-label" htmlFor="confidence-slider">
        Min Confidence: <strong>{(value * 100).toFixed(0)}%</strong>
      </label>
      <input
        id="confidence-slider"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="confidence-range-input"
        title="Filter graph edges by confidence score"
      />
    </div>
  );
};

export default ConfidenceSlider;
