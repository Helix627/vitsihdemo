# System Architecture & Technical Specification

**Project:** Darknet Vendor Relationship Intelligence & Confidentiality Analysis Platform  
**Role:** Lead Software Architect & Senior AI Engineer  
**Status:** Comprehensive Baseline Architecture & Gap Analysis (Phase 0)  
**Target Deployment:** Hybrid Intelligence Web Platform (Academic Review / Production-Ready Architecture)

---

## 1. Executive Summary & System Vision

The **Darknet Vendor Relationship Intelligence Platform** is an AI-assisted cybersecurity intelligence and data confidentiality assessment application. It ingests, correlates, and analyzes disparate intelligence data points across darknet marketplaces, underground forums, and leaked databases to identify threat actor identities, uncover hidden vendor syndicates, and score confidentiality risks of compromised intelligence feeds.

The platform unites two foundational analytical pipelines:
1. **Deterministic Relationship Pipeline:** Direct, evidence-backed attribution graph connecting vendor aliases through shared cryptographic assets (PGP fingerprints), financial identifiers (Bitcoin/Monero addresses), communication channels (emails, XMPP), and marketplace profiles with near 100% confidence.
2. **Probabilistic Relationship & Inference Pipeline:** Multi-modal predictive graph analysis utilizing string similarity metrics (Jaccard, Levenshtein, N-gram), Bayesian inference, graph topology/community detection, and behavioral heuristics to predict hidden alias ownership, shared operating syndicates, and infrastructure reuse with quantifiable probability scores.

Complementing the graph intelligence is the **Data Analysis & Confidentiality Scoring Engine**, which ingests arbitrary unstructured and semi-structured intelligence documents (raw text, CSV, JSON, server logs), normalizes diverse entity types, extracts intelligence markers, and calculates aggregate and entity-level confidentiality risk scores based on configurable risk matrix weighting.

---

## 2. Repository & Project Structure

```text
vitsh/
│
├── ARCHITECTURE.md                  # Comprehensive architectural specification & roadmap
│
├── backend/                         # Flask Backend Application
│   ├── app.py                       # Flask entrypoint & route definitions
│   ├── config.py                    # Database and server configuration
│   ├── db.py                        # MySQL connection management
│   ├── generate_vendor_profiles.py  # Synthetic intelligence profile generator (Faker)
│   ├── graph_builder.py             # NetworkX graph construction, querying, & search
│   ├── requirements.txt             # Python package dependencies
│   └── README.md                    # Backend setup instructions & API notes
│
└── frontend/                        # React Frontend Application (Vite)
    ├── index.html                   # HTML entrypoint
    ├── package.json                 # Frontend dependencies & scripts
    ├── vite.config.js               # Vite build configuration
    ├── README.md                    # Frontend documentation
    ├── public/                      # Static assets & icons
    └── src/
        ├── main.jsx                 # React root render
        ├── App.jsx                  # Application shell & state orchestration
        ├── App.css                  # Base layout styles
        ├── index.css                # Global theme variables & typography
        ├── components/              # UI Components
        │   ├── GraphView.jsx        # Cytoscape.js visualization canvas
        │   ├── Sidebar.jsx          # Metric cards, node detail inspector, & legend
        │   ├── Topbar.jsx           # Graph control panel & theme toggle
        │   ├── SearchBar.jsx        # Debounced multi-entity search with suggestions
        │   ├── StatsCard.jsx        # Reusable metric badge
        │   └── Loading.jsx          # Loading spinner & backend error fallback
        ├── hooks/
        │   └── useDebounce.js       # Debounce hook for real-time search queries
        ├── services/
        │   └── api.js               # Axios API client
        └── styles/
            └── graph.css            # Component styles & design system
```

---

## 3. High-Level Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer["Frontend Application (React + Cytoscape.js)"]
        UI_Top["Topbar (Controls, Layout, Theme)"]
        UI_Search["SearchBar (Debounced Query Autocomplete)"]
        UI_Graph["GraphView (Interactive Canvas: Force-directed / Concentric)"]
        UI_Sidebar["Sidebar (Network Stats, Graph Metrics, Entity Inspector)"]
        UI_Analysis["Data Analysis & Ingestion View (Target Phase)"]
    end

    subgraph APILayer["Backend API (Flask RESTful Layer)"]
        API_Graph["/graph & /stats"]
        API_Entities["/vendor, /pgp, /email, /bitcoin, /node"]
        API_Search["/search?q="]
        API_Analysis["/api/v1/analyze (Intake & Confidentiality Scoring)"]
        API_Prob["/api/v1/infer (Probabilistic Predictions)"]
    end

    subgraph ServiceLayer["Modular Core Business Logic"]
        subgraph GraphEngine["Graph Analytics Engine"]
            NX_Builder["NetworkX Graph Construction"]
            Det_Pipeline["Deterministic Relationship Engine (100% Confidence)"]
            Prob_Pipeline["Probabilistic Inference Engine (Similarity, Bayes, Topology)"]
        end

        subgraph IntakeEngine["Intelligence Intake & Normalization Engine"]
            Norm_Core["Data Normalizer (Casing, Trim, Crypto, PGP, Phone, Email)"]
            Entity_Extract["Entity Resolution & Attribute Extraction"]
            Conf_Engine["Confidentiality Scoring Engine (Weighted Risk Matrix)"]
        end
    end

    subgraph StorageLayer["Data & Persistence Layer"]
        DB_Vendors[("Vendors")]
        DB_PGP[("Vendor_pgp_keys")]
        DB_Profiles[("Vendor_Profile")]
        DB_ProbEdges[("Probabilistic_Edges (Target)")]
        DB_AnalysisLogs[("Intelligence_Submissions (Target)")]
    end

    ClientLayer -->|HTTP / JSON via Axios| APILayer
    APILayer --> ServiceLayer
    ServiceLayer --> StorageLayer
```

---

## 4. Current Implementation vs. Target Vision Analysis

### 4.1 What Has Been Implemented (Verified in Codebase)

| Component | Status | Implementation Details |
| :--- | :--- | :--- |
| **MySQL Database** | **Implemented** | `Vendors`, `Vendor_pgp_keys`, and `Vendor_Profile` tables populated and queried via `mysql-connector-python`. |
| **Vendor Profile Generator** | **Implemented** | `generate_vendor_profiles.py` dynamically creates profiles with synthetic usernames, email addresses, and Bitcoin addresses mapped to vendor records. |
| **NetworkX Graph Engine** | **Implemented** | `graph_builder.py` constructs a heterogeneous graph with 4 distinct node classes (`alias`, `pgp`, `email`, `bitcoin`) and 3 edge types (`uses_pgp`, `has_email`, `has_wallet`). |
| **Flask API Server** | **Implemented** | `app.py` exposes REST endpoints for graph topology, summary stats, unified node lookups, entity-specific details, and real-time search. |
| **Cytoscape.js Visualization** | **Implemented** | `GraphView.jsx` provides interactive rendering with layout switching (`cose`, `concentric`, `circle`, `breadthfirst`, `grid`), hover neighborhood highlights, selection halo, and animated focus/zoom. |
| **Search & Discovery** | **Implemented** | Debounced search (`SearchBar.jsx`) matches across usernames, aliases, PGP fingerprints, emails, domains, and Bitcoin wallets with typed suggestion dropdowns. |
| **Inspector & Stats Sidebar** | **Implemented** | `Sidebar.jsx` displays aggregate node/edge counts, client-calculated graph metrics (connected components, density, avg degree), and detailed relationship breakdowns for selected nodes. |

---

## 5. Detailed Component Specifications

### 5.1 Database Schema Analysis

#### Current Schema (as utilized in Python modules)
```sql
-- 1. Vendors Table
CREATE TABLE Vendors (
    vendor_id INT PRIMARY KEY AUTO_INCREMENT,
    user_name VARCHAR(255) NOT NULL
);

-- 2. Vendor PGP Keys Table
CREATE TABLE Vendor_pgp_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alias VARCHAR(255),
    fingerprint VARCHAR(255),
    vendor_ids TEXT -- Comma-separated list of vendor_id foreign references
);

-- 3. Vendor Profile Table
CREATE TABLE Vendor_Profile (
    vendor_id INT PRIMARY KEY,
    alias VARCHAR(255),
    username VARCHAR(255),
    email VARCHAR(255) NULL,
    bitcoin_wallet VARCHAR(64) NULL,
    CONSTRAINT fk_vendor_profile_vendor
        FOREIGN KEY (vendor_id) REFERENCES Vendors(vendor_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
```

#### Identified Database Schema Deficiencies & Technical Debt
1. **Denormalized `vendor_ids` in `Vendor_pgp_keys`:** Storing comma-separated vendor IDs requires custom parsing logic (`_parse_vendor_ids`) in Python and precludes foreign key constraints, indexes, and relational joins.
2. **Missing Normalization for Identifiers:** Emails, Bitcoin wallets, and external identifiers are stored as single scalar attributes in `Vendor_Profile` rather than supporting multi-wallet, multi-email vendor configurations.
3. **Absence of Probabilistic & Submission Tables:** No schema exists yet to persist probabilistic edge predictions, normalization audit trails, or data analysis submissions.

---

### 5.2 Backend API Specifications

| Method | Endpoint | Description | Query / Path Parameters | Response Payload Structure |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Health check endpoint | None | Plaintext `"Backend Running"` |
| `GET` | `/graph` | Full Cytoscape graph payload | None | `{"nodes": [...], "edges": [...]}` |
| `GET` | `/stats` | Graph-wide summary statistics | None | `{"aliases": int, "pgp_keys": int, "emails": int, "bitcoin_wallets": int, "edges": int, "total_nodes": int}` |
| `GET` | `/vendor/<vendor_id>` | Vendor alias details & linked identifiers | `vendor_id`: int | `{"vendor": {...}, "pgp_keys": [...], "emails": [...], "bitcoin_wallets": [...], "correlated_aliases": [...]}` |
| `GET` | `/pgp/<pgp_id>` | PGP key details & associated vendors | `pgp_id`: int | `{"pgp": {...}, "aliases": [...]}` |
| `GET` | `/email/<email>` | Email identifier & linked vendors | `email`: string | `{"email": {...}, "aliases": [...]}` |
| `GET` | `/bitcoin/<wallet>` | Bitcoin wallet & linked vendors | `wallet`: string | `{"bitcoin": {...}, "aliases": [...]}` |
| `GET` | `/node/<node_id>` | Universal polymorphic node resolver | `node_id`: string (`vendor_1`, `pgp_2`, `email_x`, `btc_y`) | Polymorphic entity detail dictionary matching node type |
| `GET` | `/search` | Global multi-attribute entity search | `q`: search query string | `{"aliases": [...], "pgp_keys": [...], "emails": [...], "bitcoin_wallets": [...]}` |

---

### 5.3 Graph Generation Process

```mermaid
sequenceDiagram
    autonumber
    participant App as Flask Server (app.py)
    participant GB as Graph Builder (graph_builder.py)
    participant DB as MySQL (main_db)
    participant Client as React Client (Cytoscape.js)

    Note over App,GB: Server Startup Phase
    App->>GB: load_graph()
    GB->>DB: Query first 50 Vendors LEFT JOIN Vendor_Profile
    DB-->>GB: Vendor rows (vendor_id, user_name, alias, username, email, bitcoin_wallet)
    loop For each vendor row
        GB->>GB: Add Node: 'vendor_{id}' (Type: alias, Emerald Ellipse)
        opt If profile has email
            GB->>GB: Add Node: 'email_{clean}' (Type: email, Blue Hexagon)
            GB->>GB: Add Edge: 'has_email' (vendor -> email)
        end
        opt If profile has bitcoin wallet
            GB->>GB: Add Node: 'btc_{clean}' (Type: bitcoin, Gold Round-Rect)
            GB->>GB: Add Edge: 'has_wallet' (vendor -> btc)
        end
    end
    GB->>DB: Query all Vendor_pgp_keys (id, alias, fingerprint, vendor_ids)
    DB-->>GB: PGP rows
    loop For each PGP row
        GB->>GB: Parse comma-separated vendor_ids
        GB->>GB: Add Node: 'pgp_{id}' (Type: pgp, Orange Diamond)
        loop For each linked vendor
            GB->>GB: Add Edge: 'uses_pgp' (vendor -> pgp)
        end
    end

    Note over Client,App: Client Request Phase
    Client->>App: GET /graph
    App->>GB: get_graph_json()
    GB-->>App: Cytoscape formatted JSON {nodes, edges}
    App-->>Client: 200 OK JSON
    Client->>Client: Render Cytoscape elements with stylesheet & force-directed cose layout
```

---

### 5.4 React Component Hierarchy & State Flow

```text
[App.jsx] - Root Orchestrator
 │
 ├── State:
 │    ├── graph: { nodes: [], edges: [] }
 │    ├── stats: { aliases, pgp_keys, emails, bitcoin_wallets, edges, total_nodes }
 │    ├── metrics: { connectedComponents, density, averageDegree } (computed client-side)
 │    ├── layout: "cose" | "concentric" | "breadthfirst" | "circle" | "grid"
 │    ├── selectedData: Entity details payload
 │    ├── selectedNodeId: string
 │    ├── searchQuery: string
 │    ├── suggestions: Array<SearchResultItem>
 │    ├── focusRequest: { id, time }
 │    └── theme: "light" | "dark"
 │
 ├── [Topbar.jsx]
 │    ├── Layout selector dropdown
 │    ├── Viewport action buttons (Fit, Reset Zoom, Center, Fullscreen, Export PNG, Refresh)
 │    └── Theme toggle
 │
 ├── [SearchBar.jsx]
 │    ├── Input field (tied to useDebounce hook)
 │    └── Suggestion dropdown list with entity type badges (Alias, PGP, Email, BTC)
 │
 ├── [GraphView.jsx]
 │    ├── CytoscapeComponent canvas wrapper
 │    ├── Dynamic layout dispatcher
 │    ├── Mouseover/mouseout neighborhood dimmer & edge highlighter
 │    ├── Tap listener -> triggers fetchNodeDetails in App.jsx
 │    └── Double-tap neighborhood zoom animator
 │
 └── [Sidebar.jsx]
      ├── [StatsCard.jsx] (Total Aliases, PGP Keys, Emails, BTC Wallets, Relationships)
      ├── Graph Metrics Panel (Components, Density, Avg Degree)
      ├── Selected Entity Inspector:
      │    ├── Alias/Vendor View (Aliases, usernames, linked PGP keys, emails, BTC, Correlated Aliases)
      │    ├── PGP Key View (Fingerprint, linked vendor list)
      │    ├── Email View (Email address, domain, linked vendor list)
      │    └── Bitcoin Wallet View (Address, format type, linked vendor list)
      └── Visual Legend Panel
```

---

## 6. Target Architectural Blueprints for Missing Pipelines

### 6.1 Modular Backend Restructuring (Target Package Architecture)

To comply with SOLID principles and eliminate tight coupling, the backend must be refactored into a layered modular architecture:

```text
backend/
├── app.py                         # Application factory (create_app)
├── config.py                      # Environment-based configuration
├── requirements.txt
├── api/                           # Flask Blueprint REST API controllers
│   ├── __init__.py
│   ├── routes_graph.py            # /graph, /stats, /node endpoints
│   ├── routes_entities.py         # /vendor, /pgp, /email, /bitcoin
│   ├── routes_search.py           # /search
│   ├── routes_analysis.py         # /api/v1/analyze (Intake & Confidentiality)
│   └── routes_inference.py        # /api/v1/infer (Probabilistic predictions)
├── services/                      # Pure business logic layer
│   ├── graph_service.py           # NetworkX graph manipulation & metrics
│   ├── deterministic_service.py   # Deterministic correlation rules & edge builder
│   ├── probabilistic_service.py   # Similarity metrics, Bayesian inference, ML models
│   ├── normalization_service.py   # Canonical normalization pipelines
│   └── confidentiality_service.py # Risk scoring matrix calculation
├── models/                        # Domain models & data schemas
│   ├── entity_models.py           # Vendor, PGP, Email, Wallet dataclasses/Pydantic
│   ├── graph_models.py            # Node, Edge, RelationshipType schemas
│   └── analysis_models.py         # AnalysisRequest, NormalizedEntity, RiskReport
├── database/                      # Data Access Layer (Repository Pattern)
│   ├── connection.py              # Connection pooling & lifecycle
│   └── repositories.py            # SQL query abstractions for Vendors, Profiles, PGP
└── utils/                         # Helper utilities & validators
    ├── crypto_utils.py            # Bitcoin/PGP format validation
    └── text_utils.py              # Levenshtein, Jaccard, Tokenizers
```

---

### 6.2 Deterministic vs. Probabilistic Relationship Architecture

```mermaid
graph LR
    subgraph DeterministicEngine["Deterministic Pipeline (Confidence ~ 100%)"]
        D1["Direct PGP Fingerprint Match"] --> DE["Edge: uses_pgp"]
        D2["Exact Email Match"] --> DE2["Edge: has_email"]
        D3["Exact Crypto Address Match"] --> DE3["Edge: has_wallet"]
        D4["Exact Alias Reuse Match"] --> DE4["Edge: shared_alias"]
    end

    subgraph ProbabilisticEngine["Probabilistic Pipeline (Probability 0.0 - 1.0)"]
        P1["Username Jaccard / Levenshtein Similarity"] --> PE["Inferred Edge: probable_alias"]
        P2["Email Domain & Username Regex Pattern Match"] --> PE
        P3["Wallet Clustering & Reuse Probability"] --> PE
        P4["Writing Style & Linguistic Heuristics"] --> PE
        P5["Graph Topology / Common Neighbor Adamic-Adar"] --> PE
    end

    DE --> EdgeMetadata["Edge Metadata: {type, confidence: 1.0, source: 'evidence', timestamp}"]
    PE --> ProbMetadata["Edge Metadata: {type, probability: p, reason: str, model_score: float, algorithm: str}"]
```

#### Deterministic Edge Model
- **Confidence:** $1.0$ (or near 100%)
- **Attributes:** `relationship_type`, `confidence`, `source_evidence`, `created_at`

#### Probabilistic Edge Model
- **Confidence / Probability:** $p \in [0.0, 1.0]$
- **Attributes:** `probability`, `reason_description`, `model_score`, `algorithm` (e.g., `"jaccard_similarity"`, `"bayesian_inference"`, `"adamic_adar"`)
- **UI Control:** React toggle allowing investigators to switch between Deterministic Only, Probabilistic Only, or Combined view with a threshold slider ($p \ge \theta$).

---

### 6.3 Data Normalization & Confidentiality Scoring Engine

```mermaid
flowchart TD
    RawInput["Raw Intelligence Submission (Text / JSON / CSV / Logs)"] --> Parser["Intake Parser & Tokenizer"]
    Parser --> Normalizer["Normalization Pipeline"]

    subgraph NormalizationPipeline["Normalization & Canonicalization"]
        N_Text["Whitespace Trim, Lower/Upper Standardization, Unicode NFKC"]
        N_Email["Email: RFC 5322 validation, lowercase, domain canonicalization"]
        N_Phone["Phone: E.164 international standard (+1..., +44...)"]
        N_Crypto["Crypto: Base58 / Bech32 / EIP-55 hex validation & checksum"]
        N_PGP["PGP: Strip headers, 40-character uppercase hexadecimal fingerprint"]
    end

    Normalizer --> N_Text
    Normalizer --> N_Email
    Normalizer --> N_Phone
    Normalizer --> N_Crypto
    Normalizer --> N_PGP

    N_Text --> Entities["Structured Normalized Entities"]
    N_Email --> Entities
    N_Phone --> Entities
    N_Crypto --> Entities
    N_PGP --> Entities

    Entities --> ScoreEngine["Confidentiality Scoring Engine"]

    subgraph RiskMatrix["Configurable Confidentiality Weight Matrix"]
        W_Email["Email: 5%"]
        W_Phone["Phone: 10%"]
        W_Wallet["Crypto Wallet: 15%"]
        W_Address["Physical Address: 15%"]
        W_PGP["PGP Key / Fingerprint: 20%"]
        W_ID["Identity Documents (SSN, Passport): 30%"]
        W_Fin["Financial (Credit Cards, IBAN): 35%"]
        W_Med["Medical Records: 40%"]
        W_Cred["Credentials (Cleartext Password, Private Key): 50%"]
    end

    ScoreEngine --> RiskMatrix
    RiskMatrix --> ScoreCalc["Aggregate Score Calculation & Level Classification"]
    ScoreCalc --> OutputReport["Confidentiality Risk Assessment Report:
    - Overall Score (Percentage %)
    - Risk Tier: Low / Medium / High / Critical
    - Top Contributor Breakdown
    - Extracted & Normalized Entities"]
```

#### Mathematical Formulation for Confidentiality Risk
Let $E = \{e_1, e_2, \dots, e_k\}$ be the multiset of extracted sensitive entity types, and $w(e_i) \in [0, 1]$ be their respective base confidentiality weights.

The aggregate confidentiality risk score $C(E)$ can be calculated using a saturating multi-attribute risk accumulation function:
$$C(E) = \min\left(100\%, \quad 100 \times \left( 1 - \prod_{i=1}^k (1 - w(e_i)) \right) \right)$$

This ensures diminishing returns as more low-risk entities are added, while a single critical credential ($w = 0.50$) combined with identity documents ($w = 0.30$) rapidly escalates the score to High/Critical tiers:
- **Low:** $0\% \le C < 25\%$
- **Medium:** $25\% \le C < 60\%$
- **High:** $60\% \le C < 85\%$
- **Critical:** $85\% \le C \le 100\%$

---

## 7. Technical Debt & Identified Gaps

1. **Monolithic Backend Functions:** `backend/graph_builder.py` is over 680 lines combining data ingestion, styling constants, graph queries, neighbor traversals, and Cytoscape serialization in one file.
2. **In-Memory Global State (`GRAPH`):** The graph is loaded into global memory at startup (`load_graph()`). It is not automatically refreshed on DB updates and cannot scale across multiple WSGI worker processes without a caching/database layer.
3. **Database Denormalization:** `Vendor_pgp_keys.vendor_ids` stores comma-separated strings instead of an associative mapping table.
4. **Hardcoded Limit (`VENDOR_LIMIT = 50`):** Graph loading is strictly capped at 50 vendors for prototype performance, lacking pagination or on-demand dynamic sub-graph loading.
5. **No Data Analysis & Intake UI:** Frontend is currently a single-page graph dashboard; no navigation or dedicated views exist for raw intelligence submission, entity normalization, or confidentiality scoring.
6. **No Probabilistic Engine Implemented:** Inferred edges and confidence toggles are not yet connected in the backend or frontend.

---

## 8. Phased Development Roadmap

```mermaid
gantt
    title Master Development Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 0: Baseline & Architecture
    Repository Analysis & ARCHITECTURE.md          :done, 2026-08-22, 1d
    section Phase 1: Modular Backend Refactoring
    Layered Directory Structure & Repositories     :active, 2026-08-23, 2d
    Blueprint API Routes & Service Separation     :2026-08-25, 2d
    section Phase 2: Deterministic & Probabilistic Graph
    Deterministic Edge Metadata Standardization   :2026-08-27, 2d
    Probabilistic Similarity & Bayesian Engine    :2026-08-29, 3d
    Cytoscape Edge Filtering & Confidence Sliders :2026-09-01, 2d
    section Phase 3: Data Analysis & Normalization
    Canonical Normalization Engine (Regex/Crypto) :2026-09-03, 2d
    Confidentiality Scoring Engine & Risk Matrix  :2026-09-05, 2d
    React Data Analysis & Ingestion Page          :2026-09-07, 3d
    section Phase 4: Multi-Page Frontend & Polishing
    React Router & Navigation Structure           :2026-09-10, 2d
    Comprehensive Node Details & Export Reports   :2026-09-12, 2d
    End-to-End Testing & Verification             :2026-09-14, 2d
```

### Phase Breakdown

- **Phase 1: Backend Modularization & Database Hygiene**
  - Refactor `backend/` into `api/`, `services/`, `models/`, `database/`, and `utils/`.
  - Introduce proper relational mapping and repository abstractions.
  - Implement request validation and structured error handling.

- **Phase 2: Probabilistic Graph Pipeline & UI Controls**
  - Implement Jaccard, string similarity, and Bayesian inference modules.
  - Enrich edges with `probability`, `reason`, `algorithm`, and `model_score`.
  - Add UI controls in `GraphView` for filtering deterministic vs. probabilistic edges with dynamic confidence thresholds.

- **Phase 3: Intelligence Data Analysis & Confidentiality Scoring Engine**
  - Build text/CSV/JSON intake parser and normalizer (email, phone, crypto, PGP, unicode).
  - Implement the configurable risk-weight matrix and mathematical scoring algorithm.
  - Build the React **Data Analysis** page with live entity recognition, normalization display, and risk gauge charts.

- **Phase 4: Multi-Page Navigation, Future AI Foundation & Final Verification**
  - Add client-side routing (`Home`, `Graph`, `Data Analysis`, `Search`, `Node Details`, `Statistics`, `Settings`).
  - Standardize API contract documentation with Swagger / OpenAPI.
  - Comprehensive unit and integration testing suite.
