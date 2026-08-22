
# Graph Backend (Review 1 Prototype)

This backend reads vendor and PGP key data from MySQL, builds a NetworkX graph, and exposes REST APIs for a React + Cytoscape.js frontend.

## Stack

- Python 3.11
- Flask
- Flask-CORS
- mysql-connector-python
- NetworkX

## Project Structure

```text
backend/
|
|- app.py
|- db.py
|- graph_builder.py
|- requirements.txt
|- config.py
|- README.md
```

## Setup

```bash
python -m venv venv

pip install -r requirements.txt

python app.py
```

## MySQL Config

The backend reads DB settings from environment variables first, then uses defaults.

- `DB_HOST` (default: `localhost`)
- `DB_USER` (default: `root`)
- `DB_PASSWORD` (default: empty)
- `DB_NAME` (default: `main_db`)

### PowerShell example

If your root user has a password, set it before running the app:

```powershell
$env:DB_PASSWORD="your_mysql_password"
python app.py
```

If your DB user is not root:

```powershell
$env:DB_USER="your_user"
$env:DB_PASSWORD="your_mysql_password"
$env:DB_NAME="main_db"
python app.py
```

You can still hardcode these values in `config.py`, but env vars are safer.

## Behavior

- Loads only the first 50 vendors (`ORDER BY vendor_id ASC LIMIT 50`)
- Parses comma-separated `vendor_ids` from `Vendor_pgp_keys`
- Ignores malformed vendor IDs safely
- Ignores vendor IDs not found in the first 50 vendors
- Includes only PGP keys connected to those 50 vendors
- Builds graph once when the server starts

## Endpoints

### GET /

Returns:

```text
Backend Running
```

### GET /graph

Returns Cytoscape-compatible JSON:

- `nodes`: vendor and PGP nodes
- `edges`: vendor -> PGP relationships

Node metadata includes:

- `type`
- `label`
- `fingerprint` (PGP only)
- `color`
- `shape`

### GET /stats

Returns dynamically computed stats:

```json
{
  "vendors": 50,
  "pgp_keys": 38,
  "edges": 74
}
```

(Counts depend on your data.)

### GET /vendor/<id>

Returns one vendor and all associated PGP keys from the in-memory graph.

### GET /pgp/<id>

Returns one PGP key and all associated vendors from the in-memory graph.

### GET /search?q=<text>

Searches:

- vendor username
- PGP alias

Returns matching vendor and PGP nodes.
