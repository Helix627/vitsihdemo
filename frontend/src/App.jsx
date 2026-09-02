import { useCallback, useEffect, useMemo, useState } from "react";

import ExportModal from "./components/ExportModal";
import GraphView from "./components/GraphView";
import IdentityAnalyzer from "./components/IdentityAnalyzer";
import AnalystReviewPanel from "./components/AnalystReviewPanel";
import InfrastructureDashboard from "./components/InfrastructureDashboard";
import Loading from "./components/Loading";
import SearchBar from "./components/SearchBar";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import useDebounce from "./hooks/useDebounce";
import {
  fetchByPath,
  fetchGraph,
  fetchNodeDetailsById,
  fetchStats,
  searchNodes,
} from "./services/api";
import "./styles/graph.css";

const DEFAULT_STATS = {
  aliases: 0,
  vendors: 0,
  usernames: 0,
  pgp_keys: 0,
  emails: 0,
  bitcoin_wallets: 0,
  edges: 0,
  total_nodes: 0,
  communities_count: 0,
};

const emptyGraph = {
  nodes: [],
  edges: [],
};

const computeGraphMetrics = (graph, minConfidence = 0.0) => {
  const nodes = (graph.nodes || []).map((node) => node.data.id);
  const edges = (graph.edges || [])
    .filter((edge) => {
      const weight = parseFloat(edge.data.confidence ?? edge.data.weight ?? 1.0);
      return weight >= minConfidence;
    })
    .map((edge) => [edge.data.source, edge.data.target]);

  if (!nodes.length) {
    return { connectedComponents: 0, density: "0.0000", averageDegree: "0.00", visibleEdges: 0 };
  }

  const adjacency = new Map(nodes.map((id) => [id, new Set()]));
  for (const [source, target] of edges) {
    adjacency.get(source)?.add(target);
    adjacency.get(target)?.add(source);
  }

  let connectedComponents = 0;
  const visited = new Set();
  for (const node of nodes) {
    if (visited.has(node)) continue;
    connectedComponents += 1;
    const stack = [node];

    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      adjacency.get(current)?.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      });
    }
  }

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const averageDegree = nodeCount > 0 ? ((2 * edgeCount) / nodeCount).toFixed(2) : "0.00";
  const density =
    nodeCount > 1 ? ((2 * edgeCount) / (nodeCount * (nodeCount - 1))).toFixed(4) : "0.0000";

  return { connectedComponents, density, averageDegree, visibleEdges: edgeCount };
};

function App() {
  const [activeTab, setActiveTab] = useState("graph");
  const [graph, setGraph] = useState(emptyGraph);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState("cose");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.0);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [cy, setCy] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  // Phase 4: Timeline
  const [timeRange, setTimeRange] = useState([null, null]);
  // Phase 5: Export
  const [exportOpen, setExportOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedThreshold = useDebounce(confidenceThreshold, 200);
  const metrics = useMemo(
    () => computeGraphMetrics(graph, debouncedThreshold),
    [graph, debouncedThreshold]
  );

  // Load complete graph data on initial mount or manual refresh
  const loadData = useCallback(async () => {
    setError("");
    const [startTs, endTs] = timeRange;
    try {
      const [graphData, statsData, suggData] = await Promise.all([
        fetchGraph(60, 0.0, startTs, endTs),
        fetchStats(),
        fetch("/api/v1/identity/suggestions").then((r) => r.json()).catch(() => ({ suggestions: [] })),
      ]);
      setGraph(graphData);
      setStats(statsData);
      setPendingCount(suggData.suggestions?.length || 0);
    } catch (requestError) {
      const message = requestError?.message || "Network request failed";
      setError(message);
    } finally {
      setInitialLoading(false);
    }
  }, [timeRange]);

  // Phase 4: Timeline range change handler — refetches graph with date filter
  const handleTimelineChange = useCallback(async (startTs, endTs) => {
    setTimeRange([startTs, endTs]);
    try {
      const graphData = await fetchGraph(60, 0.0, startTs, endTs);
      setGraph(graphData);
    } catch (err) {
      console.error("Timeline graph reload failed:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const runSearch = async () => {
      const query = debouncedSearch.trim();
      if (!query) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await searchNodes(query);
        const aliasItems = (result.aliases || result.vendors || []).map((item) => ({
          ...item,
          type: "alias",
        }));
        const userItems = (result.usernames || []).map((item) => ({
          ...item,
          type: "username",
        }));
        const pgpItems = (result.pgp_keys || []).map((item) => ({
          ...item,
          type: "pgp",
        }));
        const emailItems = (result.emails || []).map((item) => ({
          ...item,
          type: "email",
        }));
        const btcItems = (result.bitcoin_wallets || []).map((item) => ({
          ...item,
          type: "bitcoin",
        }));

        setSuggestions([...aliasItems, ...userItems, ...pgpItems, ...emailItems, ...btcItems]);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    runSearch();
  }, [debouncedSearch]);

  const fetchNodeDetails = useCallback(async (node) => {
    const nodeType = node.type || "vendor";
    setSelectedNodeId(node.id);

    try {
      if (node.detail_url) {
        const details = await fetchByPath(node.detail_url);
        setSelectedData({ ...details, kind: nodeType });
        return;
      }

      const details = await fetchNodeDetailsById(node.id);
      setSelectedData({ ...details, kind: nodeType });
    } catch (fetchError) {
      console.error("Failed to load node details", fetchError);
      setSelectedData(null);
    }
  }, []);

  const handleSuggestionSelect = async (item) => {
    setSearchQuery(item.label);
    setSuggestions([]);
    if (activeTab !== "graph") {
      setActiveTab("graph");
    }

    // If node is not currently in cy elements, reload graph
    if (cy && !cy.getElementById(item.id).length) {
      try {
        const graphData = await fetchGraph(80, 0.0);
        setGraph(graphData);
      } catch (err) {
        console.error("Failed refreshing graph for searched node", err);
      }
    }

    setFocusRequest({
      id: item.id,
      label: item.label,
      type: item.type,
      normalized_value: item.normalized_value,
      vendor_id: item.vendor_id,
      identity_id: item.identity_id,
      time: Date.now(),
    });
    await fetchNodeDetails(item);
  };

  const handleFit = () => {
    if (cy) cy.fit(cy.elements(), 50);
  };

  const handleResetZoom = () => {
    if (cy) {
      cy.zoom(1);
      cy.center();
    }
  };

  const handleExport = () => {
    if (!cy) return;
    const imageData = cy.png({ bg: "#0f172a", full: true, scale: 2 });
    const link = document.createElement("a");
    link.href = imageData;
    link.download = "identity-resolution-graph.png";
    link.click();
  };

  const handleFullscreen = () => {
    const graphRoot = document.querySelector(".graph-layout");
    if (!graphRoot) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    graphRoot.requestFullscreen();
  };

  if (initialLoading) {
    return <Loading error={error} onRetry={loadData} />;
  }

  return (
    <div className="app-shell">
      <Topbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        layout={layout}
        onLayoutChange={setLayout}
        onFit={handleFit}
        onResetZoom={handleResetZoom}
        onRefresh={loadData}
        onExport={handleExport}
        onFullscreen={handleFullscreen}
        theme={theme}
        onThemeToggle={() => setTheme((state) => (state === "light" ? "dark" : "light"))}
        pendingSuggestionsCount={pendingCount}
        onOpenExport={() => setExportOpen(true)}
        onTimelineChange={handleTimelineChange}
        timeRange={timeRange}
      />

      {/* Phase 5 — Export Modal */}
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        timeRange={timeRange}
        graphData={graph}
        stats={stats}
      />

      {activeTab === "graph" && (
        <SearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          suggestions={suggestions}
          isSearching={isSearching}
          onSelectSuggestion={handleSuggestionSelect}
        />
      )}

      {activeTab === "graph" && (
        <main className="graph-layout">
          <section className="graph-panel fade-in">
            <GraphView
              graph={graph}
              layout={layout}
              confidenceThreshold={confidenceThreshold}
              onNodeClick={fetchNodeDetails}
              onCyReady={setCy}
              selectedNodeId={selectedNodeId}
              focusRequest={focusRequest}
            />
          </section>

          <Sidebar
            stats={{ ...stats, edges: metrics.visibleEdges }}
            selectedData={selectedData}
            metrics={metrics}
            onSelectNode={handleSuggestionSelect}
          />
        </main>
      )}

      {activeTab === "infrastructure" && (
        <main className="analyzer-view-wrap fade-in">
          <InfrastructureDashboard
            onSelectVendor={(v) => {
              setActiveTab("graph");
              handleSuggestionSelect({ label: v, id: v, type: "vendor" });
            }}
            onViewInGraph={async (nodeId, vendorName) => {
              setActiveTab("graph");
              if (vendorName) {
                handleSuggestionSelect({ label: vendorName, id: nodeId, type: "onion" });
              } else {
                setFocusRequest({ id: nodeId, time: Date.now() });
              }
            }}
            onRefreshGraph={() => loadData()}
          />
        </main>
      )}

      {activeTab === "review" && (
        <main className="analyzer-view-wrap fade-in">
          <AnalystReviewPanel
            onApproveSuccess={() => loadData()}
            onRejectSuccess={() => loadData()}
            onRefreshGraph={() => loadData()}
          />
        </main>
      )}

      {activeTab === "analyzer" && (
        <main className="analyzer-view-wrap fade-in">
          <IdentityAnalyzer
            onSelectVendor={(v) => {
              setActiveTab("graph");
              handleSuggestionSelect({ label: v, id: v, type: "vendor" });
            }}
            onDataEvolved={() => loadData()}
          />
        </main>
      )}
    </div>
  );
}

export default App;
