/**
 * TRINETRA — Topbar
 *
 * Contains: current page title, global search, backend status, refresh, avatar.
 * Search results navigate the graph via onSearchSelect callback.
 */

import SearchBar from "./SearchBar";

export default function Topbar({
  pageTitle,
  apiOnline,
  onRefresh,
  onSearchSelect,
}) {
  return (
    <header className="topbar">
      {/* Page title */}
      <div className="topbar__title">{pageTitle}</div>

      {/* Global search */}
      <div className="topbar__center">
        <SearchBar onSelectResult={onSearchSelect} />
      </div>

      {/* Right section */}
      <div className="topbar__right">
        {/* Backend status badge */}
        <div className="topbar__status" aria-label={apiOnline ? "Backend connected" : "Backend offline"}>
          <div className={`topbar__status-dot topbar__status-dot--${apiOnline ? "online" : "offline"}`} />
          <span>{apiOnline ? "Connected" : "Offline"}</span>
        </div>

        {/* Refresh button */}
        <button
          className="btn btn--ghost btn--icon"
          onClick={onRefresh}
          title="Refresh all data"
          aria-label="Refresh all data"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>

        {/* Avatar placeholder */}
        <div className="topbar__avatar" title="Analyst" aria-label="Analyst account">
          A
        </div>
      </div>
    </header>
  );
}
