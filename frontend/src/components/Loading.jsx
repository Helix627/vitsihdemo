const Loading = ({ message = "Loading graph...", error, onRetry }) => {
  if (error) {
    return (
      <div className="loading-screen">
        <div className="error-card">
          <h2>Cannot connect to backend.</h2>
          <p>{error}</p>
          <button className="btn primary" onClick={onRetry} type="button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
};

export default Loading;
