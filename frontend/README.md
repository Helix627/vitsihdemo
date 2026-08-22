# TRINETRA — Frontend

Threat Intelligence Investigation Platform (React + Vite).

## Stack

- React 19 + Vite
- React Router 7
- Cytoscape.js (relationship graph)
- Axios (single API instance in `src/services/api.js`)

No Redux, no UI frameworks. All HTTP calls live in the API service.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The frontend expects the Flask backend on `http://localhost:5000`
(see `backend/README.md`). If it is unreachable, every page shows an
explicit offline state with retry.

### Backend environment

The backend needs MySQL credentials before `python app.py`:

```powershell
$env:DB_PASSWORD="your_mysql_password"
python app.py   # from backend/
```

## Endpoints consumed

| Endpoint | Used for |
|---|---|
| `GET /` | Health check (topbar/sidebar status) |
| `GET /graph` | Cytoscape graph, evidence rows, actor directory |
| `GET /stats` | Dashboard statistic cards |
| `GET /vendor/<id>` | Node details + actor profile |
| `GET /pgp/<id>` | Node details |
| `GET /search?q=` | Topbar search, investigation entity linking |

## Data integrity rules

- Only fields actually returned by the API are rendered.
- Missing fields show "Not available from current intelligence source."
- No fabricated confidence scores, timestamps, or threat classifications.
- Graph-derived metrics are labeled separately from backend statistics.
- Investigations workspace is session-local only (no persistence endpoint exists).
- Login is a demo gate; no authentication endpoint exists yet.

## Scripts

```bash
npm run lint    # oxlint
npm run build   # production build to dist/
```
