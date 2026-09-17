const SearchBar = ({
  query,
  onQueryChange,
  suggestions,
  onSelectSuggestion,
  isSearching,
  onClearSearch,
  onFit,
  onFullscreen,
}) => {
  const getSecondaryText = (item) => {
    if (item.type === "vendor") {
      return "Marketplace Vendor Root Persona";
    }
    if (item.type === "alias") {
      return item.normalized_value ? `Alias: ${item.normalized_value}` : "Vendor alias";
    }
    if (item.type === "username") {
      return item.normalized_value ? `Handle: @${item.normalized_value}` : "Marketplace username";
    }
    if (item.type === "pgp") {
      return item.normalized_value ? `PGP: ${item.normalized_value}` : "PGP Public Key";
    }
    if (item.type === "email") {
      return item.normalized_value ? `Email: ${item.normalized_value}` : "Contact Email";
    }
    if (item.type === "bitcoin") {
      return item.normalized_value ? `Wallet: ${item.normalized_value}` : "Bitcoin Settlement Address";
    }
    return "";
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "vendor":
        return "VENDOR";
      case "alias":
        return "ALIAS";
      case "username":
        return "USERNAME";
      case "pgp":
        return "PGP";
      case "email":
        return "EMAIL";
      case "bitcoin":
        return "BITCOIN";
      default:
        return (type || "").toUpperCase();
    }
  };

  return (
    <div className="search-bar-row">
      <div className="search-wrapper">
        <div className="search-input-box">
          <input
            type="text"
            value={query}
            className="search-input"
            placeholder="Search alias, PGP key, email address, or Bitcoin wallet..."
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && onClearSearch && (
            <button
              type="button"
              className="btn-search-clear-inline"
              onClick={onClearSearch}
              title="Clear search text"
            >
              ✕
            </button>
          )}
        </div>

        {isSearching && <div className="search-hint">Searching...</div>}

        {query && suggestions.length > 0 && (
          <ul className="suggestion-list">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="suggestion-item"
                  onClick={() => onSelectSuggestion(item)}
                >
                  <span className="suggestion-text">
                    <span className="suggestion-label">{item.label}</span>
                    <span className="suggestion-subtext">{getSecondaryText(item)}</span>
                  </span>
                  <span className={`pill ${item.type}`}>{getTypeLabel(item.type)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="search-actions">
        {query && onClearSearch && (
          <button
            type="button"
            className="btn btn-clear-filter"
            onClick={onClearSearch}
            title="Clear active search filter and restore full graph view"
          >
            ✕ Clear Search
          </button>
        )}
        {onFit && (
          <button
            type="button"
            className="btn"
            onClick={onFit}
            title="Fit graph to canvas"
          >
            ⤢ Fit
          </button>
        )}
        {onFullscreen && (
          <button
            type="button"
            className="btn"
            onClick={onFullscreen}
            title="View graph in fullscreen"
          >
            ⛶ Fullscreen
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
