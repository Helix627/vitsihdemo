# Vendor-PGP Graph Frontend

React dashboard for visualizing vendor and PGP key relationships using Cytoscape.js.

## Stack

- React (Vite)
- Cytoscape.js
- Axios
- Plain CSS

## Setup

For a complete fresh-clone setup, use the root [README.md](../README.md). The commands below are for the frontend only.

```bash
npm install
npm run dev
```

Frontend runs on Vite default URL and calls backend at `http://localhost:5000`.

## Backend Endpoints Used

- `GET /graph`
- `GET /stats`
- `GET /vendor/<id>`
- `GET /pgp/<id>`
- `GET /search?q=`

## Features

- Full-screen graph visualization area with interactive pan, zoom, drag, and box selection
- Layout switcher (`cose`, `breadthfirst`, `circle`, `grid`)
- Node hover highlighting with neighbor focus
- Node click details panel (vendor and PGP views)
- Search suggestions with animated focus and zoom to selected node
- Stats cards + graph metrics (components, density, average degree)
- Graph controls: fit, reset zoom, center, refresh data, export PNG, fullscreen
- Light and dark mode toggle
- Backend connection error UI with retry

## Project Structure

```text
src/
	components/
		GraphView.jsx
		Sidebar.jsx
		Topbar.jsx
		SearchBar.jsx
		StatsCard.jsx
		Loading.jsx
	hooks/
		useDebounce.js
	services/
		api.js
	styles/
		graph.css
	App.jsx
	main.jsx
```
