/**
 * TRINETRA — AppShell
 *
 * Root layout wrapper: Sidebar + Topbar + main content slot.
 * Manages:
 * - API health check on mount
 * - Page title for topbar
 * - Global search select → graph navigation
 * - Refresh callback for child pages
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { checkHealth } from "../services/api";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/investigations": "Investigations",
  "/actors": "Actors",
  "/graph": "Relationship Graph",
  "/evidence": "Evidence",
  "/timeline": "Timeline",
  "/reports": "Reports",
};

function getPageTitle(pathname) {
  if (pathname.startsWith("/actors/")) return "Actor Profile";
  return PAGE_TITLES[pathname] ?? "TRINETRA";
}

export default function AppShell({ children, onSearchSelect, onRefresh }) {
  const [apiOnline, setApiOnline] = useState(null); // null = checking
  const location = useLocation();

  const checkApi = useCallback(async () => {
    try {
      await checkHealth();
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  }, []);

  // Initial health check
  useEffect(() => {
    checkApi();
    // Re-check every 30 seconds
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, [checkApi]);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="app-shell">
      <Sidebar apiOnline={apiOnline === true} />
      <Topbar
        pageTitle={pageTitle}
        apiOnline={apiOnline === true}
        onRefresh={onRefresh}
        onSearchSelect={onSearchSelect}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
