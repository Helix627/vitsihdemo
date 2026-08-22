/**
 * TRINETRA — Application Root
 *
 * Responsibilities:
 * - Demo gate (no auth endpoint exists; sessionStorage flag, frontend-only)
 * - Route definitions
 * - Global search select -> navigate to /graph with focus entity
 * - Refresh signal fan-out to data-driven pages
 */

import { useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Investigations from "./pages/Investigations";
import ActorProfile, { ActorsDirectory } from "./pages/ActorProfile";
import RelationshipGraph from "./pages/RelationshipGraph";
import EvidencePage from "./pages/Evidence";
import TimelinePage from "./pages/TimelinePage";
import Reports from "./pages/Reports";
import Login from "./pages/Login";

const SESSION_KEY = "trinetra.session";

export default function App() {
  const [entered, setEntered] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [refreshSignal, setRefreshSignal] = useState(0);
  const navigate = useNavigate();

  const handleEnter = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setEntered(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshSignal((t) => t + 1);
  }, []);

  /**
   * Search result selected in the topbar.
   * Navigate to the graph page carrying the entity so it can be
   * focused if present, or reported as absent — never fabricated.
   */
  const handleSearchSelect = useCallback(
    (result) => {
      if (!result?.id) return;
      navigate("/graph", { state: { focusEntity: result } });
    },
    [navigate]
  );

  if (!entered) {
    return <Login onEnter={handleEnter} />;
  }

  return (
    <AppShell onSearchSelect={handleSearchSelect} onRefresh={handleRefresh}>
      <Routes>
        <Route
          path="/"
          element={<Dashboard refreshSignal={refreshSignal} />}
        />
        <Route path="/investigations" element={<Investigations />} />
        <Route path="/actors" element={<ActorsDirectory />} />
        <Route path="/actors/:id" element={<ActorProfile />} />
        <Route
          path="/graph"
          element={<RelationshipGraph refreshSignal={refreshSignal} />}
        />
        <Route
          path="/evidence"
          element={<EvidencePage refreshSignal={refreshSignal} />}
        />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route
          path="/reports"
          element={<Reports refreshSignal={refreshSignal} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
