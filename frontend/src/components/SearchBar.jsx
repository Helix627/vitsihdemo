/**
 * TRINETRA — SearchBar
 *
 * Global search bar in the topbar.
 * Debounced via useSearch hook (300ms).
 * Dropdown results via SearchResults component.
 * On result click: navigates graph to node or shows "not in graph" message.
 */

import { useRef, useEffect, useState } from "react";
import { useSearch } from "../hooks/useSearch";
import SearchResults from "./SearchResults";

export default function SearchBar({ onSelectResult }) {
  const { query, results, loading, error, search, clearSearch } = useSearch();
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    search(val);
    setOpen(val.trim().length > 0);
  }

  function handleSelect(result) {
    setOpen(false);
    if (inputRef.current) inputRef.current.blur();
    onSelectResult?.(result);
  }

  function handleClear() {
    clearSearch();
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      clearSearch();
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} style={styles.wrapper}>
      <div style={styles.inputWrap}>
        <svg
          style={styles.searchIcon}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          style={styles.input}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search entities…"
          aria-label="Search entities"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            style={styles.clearBtn}
            onClick={handleClear}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      {showDropdown && (
        <SearchResults
          results={results}
          loading={loading}
          error={error}
          query={query}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    width: "100%",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "10px",
    color: "var(--text-muted)",
    pointerEvents: "none",
    flexShrink: 0,
  },
  input: {
    width: "100%",
    height: "34px",
    paddingLeft: "32px",
    paddingRight: "32px",
    paddingTop: "0",
    paddingBottom: "0",
    border: "1px solid var(--border-panel)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-hover)",
    fontSize: "0.8125rem",
    color: "var(--text-primary)",
    outline: "none",
    transition: "border-color 150ms, background 150ms",
  },
  clearBtn: {
    position: "absolute",
    right: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    fontSize: "0.7rem",
    padding: "2px",
    lineHeight: 1,
  },
};
