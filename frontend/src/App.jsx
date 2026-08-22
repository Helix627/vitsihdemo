import { useCallback, useEffect, useMemo, useState } from "react";

import GraphView from "./components/GraphView";
import Loading from "./components/Loading";
import SearchBar from "./components/SearchBar";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import useDebounce from "./hooks/useDebounce";
import {
  fetchByPath,
  fetchGraph,
  fetchPgpDetails,
  fetchStats,
  fetchVendorDetails,
  searchNodes,
} from "./services/api";
import "./styles/graph.css";

const DEFAULT_STATS = {
  vendors: 0,
  pgp_keys: 0,
  edges: 0,
};

const emptyGraph = {
  nodes: [],
  edges: [],
};

const parseEntityId = (nodeId) => {
  const parts = nodeId.split("_");
  return Number(parts[1]);
};

const computeGraphMetrics = (graph) => {
  const nodes = graph.nodes.map((node) => node.data.id);
  const edges = graph.edges.map((edge) => [edge.data.source, edge.data.target]);

  if (!nodes.length) {
    return { connectedComponents: 0, density: "0.000", averageDegree: "0.00" };
  }

  const adjacency = new Map(nodes.map((id) => [id, new Set()]));
  for (const [source, target] of edges) {
    adjacency.get(source)?.add(target);
    adjacency.get(target)?.add(source);
  }

  let connectedComponents = 0;
  const visited = new Set();
  for (const node of nodes) {
    if (visited.has(node)) {
      continue;
    }
    connectedComponents += 1;
    const stack = [node];

    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current)) {
        continue;
      }

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
  const averageDegree = ((2 * edgeCount) / nodeCount).toFixed(2);
  const density =
    nodeCount > 1
      ? ((2 * edgeCount) / (nodeCount * (nodeCount - 1))).toFixed(3)
      : "0.000";

  return { connectedComponents, density, averageDegree };
};

function App() {
  const [graph, setGraph] = useState(emptyGraph);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState("cose");
  const [selectedData, setSelectedData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const [theme, setTheme] = useState("light");
  const [cy, setCy] = useState(null);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const metrics = useMemo(() => computeGraphMetrics(graph), [graph]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [graphData, statsData] = await Promise.all([fetchGraph(), fetchStats()]);
      setGraph(graphData);
      setStats(statsData);
    } catch (requestError) {
      const message = requestError?.message || "Network request failed";
      setError(message);
    } finally {
      setLoading(false);
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
        const vendorItems = (result.vendors || []).map((item) => ({
          ...item,
          type: "vendor",
        }));
        const pgpItems = (result.pgp_keys || []).map((item) => ({
          ...item,
          type: "pgp",
        }));

        setSuggestions([...vendorItems, ...pgpItems]);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    runSearch();
  }, [debouncedSearch]);

  const fetchNodeDetails = useCallback(async (node) => {
    const nodeType = node.type;

    setSelectedNodeId(node.id);

    try {
      if (node.detail_url) {
        const details = await fetchByPath(node.detail_url);
        setSelectedData({ ...details, kind: nodeType });
        return;
      }

      const entityId = parseEntityId(node.id);
      if (Number.isNaN(entityId)) {
        return;
      }

      if (nodeType === "vendor") {
        const details = await fetchVendorDetails(entityId);
        setSelectedData({ ...details, kind: "vendor" });
      } else if (nodeType === "pgp") {
        const details = await fetchPgpDetails(entityId);
        setSelectedData({ ...details, kind: "pgp" });
      }
    } catch {
      setSelectedData(null);
    }
  }, []);

  const handleSuggestionSelect = async (item) => {
    setSearchQuery(item.label);
    setSuggestions([]);
    setFocusRequest({ id: item.id, time: Date.now() });
    await fetchNodeDetails(item);
  };

  const handleFit = () => {
    if (!cy) {
      return;
    }
    cy.fit(cy.elements(), 50);
  };

  const handleResetZoom = () => {
    if (!cy) {
      return;
    }
    cy.zoom(1);
    cy.center();
  };

  const handleCenter = () => {
    if (!cy) {
      return;
    }
    cy.center();
  };

  const handleExport = () => {
    if (!cy) {
      return;
    }

    const imageData = cy.png({ bg: "#ffffff", full: true, scale: 2 });
    const link = document.createElement("a");
    link.href = imageData;
    link.download = "vendor-graph.png";
    link.click();
  };

  const handleFullscreen = () => {
    const graphRoot = document.querySelector(".graph-layout");
    if (!graphRoot) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    graphRoot.requestFullscreen();
  };

  if (loading || error) {
    return <Loading error={error} onRetry={loadData} />;
  }

  return (
    <div className="app-shell">
      <Topbar
        layout={layout}
        onLayoutChange={setLayout}
        onFit={handleFit}
        onResetZoom={handleResetZoom}
        onCenter={handleCenter}
        onRefresh={loadData}
        onExport={handleExport}
        onFullscreen={handleFullscreen}
        theme={theme}
        onThemeToggle={() => setTheme((state) => (state === "light" ? "dark" : "light"))}
      />

      <SearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        suggestions={suggestions}
        isSearching={isSearching}
        onSelectSuggestion={handleSuggestionSelect}
      />

      <main className="graph-layout">
        <section className="graph-panel fade-in">
          <GraphView
            graph={graph}
            layout={layout}
            onNodeClick={fetchNodeDetails}
            onCyReady={setCy}
            selectedNodeId={selectedNodeId}
            focusRequest={focusRequest}
          />
        </section>

        <Sidebar stats={stats} selectedData={selectedData} metrics={metrics} />
      </main>
    </div>
  );
}

export default App;
