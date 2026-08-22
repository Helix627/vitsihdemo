const SearchBar = ({
  query,
  onQueryChange,
  suggestions,
  onSelectSuggestion,
  isSearching,
}) => {
  const getSecondaryText = (item) => {
    if (item.type === "vendor") {
      const parts = [item.username, item.alias, item.email].filter(Boolean);
      return parts.join(" | ") || "Vendor profile";
    }

    return item.fingerprint || "PGP key";
  };

  return (
    <div className="search-wrapper">
      <input
        type="text"
        value={query}
        className="search-input"
        placeholder="Search vendor username or PGP alias"
        onChange={(event) => onQueryChange(event.target.value)}
      />

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
                <span className={`pill ${item.type}`}>{item.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
