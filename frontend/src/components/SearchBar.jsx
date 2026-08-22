const SearchBar = ({
  query,
  onQueryChange,
  suggestions,
  onSelectSuggestion,
  isSearching,
}) => {
  const getSecondaryText = (item) => {
    if (item.type === "alias" || item.type === "vendor") {
      const parts = [item.username ? `@${item.username}` : "", item.alias].filter(Boolean);
      return parts.join(" | ") || "Vendor alias";
    }
    if (item.type === "pgp") {
      return item.fingerprint ? `PGP: ${item.fingerprint}` : "PGP Key";
    }
    if (item.type === "email") {
      return item.domain ? `Email on ${item.domain}` : item.email || "Email address";
    }
    if (item.type === "bitcoin") {
      return item.wallet_type ? `Bitcoin: ${item.wallet_type}` : item.bitcoin_wallet || "Bitcoin wallet";
    }
    return "";
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "alias":
      case "vendor":
        return "Alias";
      case "pgp":
        return "PGP";
      case "email":
        return "Email";
      case "bitcoin":
        return "BTC";
      default:
        return type;
    }
  };

  return (
    <div className="search-wrapper">
      <input
        type="text"
        value={query}
        className="search-input"
        placeholder="Search alias, PGP key, email address, or Bitcoin wallet..."
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
                <span className={`pill ${item.type}`}>{getTypeLabel(item.type)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
