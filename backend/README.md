
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

Returns Cytoscape-compatible JSON with separated identifier nodes and alias nodes:
- `nodes`: `alias`, `pgp`, `email`, `bitcoin`
- `edges`: `uses_pgp`, `has_email`, `has_wallet`

### GET /stats

Returns dynamically computed stats:
```json
{
  "aliases": 50,
  "vendors": 50,
  "pgp_keys": 44,
  "emails": 40,
  "bitcoin_wallets": 35,
  "edges": 119,
  "total_nodes": 169
}
```

### GET /vendor/<id> (or /alias/<id>)

Returns one vendor alias and all connected identifiers (PGP keys, emails, bitcoin wallets) and correlated aliases.

### GET /pgp/<id>

Returns one PGP key and all associated vendor aliases.

### GET /email/<email>

Returns one Email address identifier and all associated vendor aliases.

### GET /bitcoin/<wallet>

Returns one Bitcoin wallet identifier and all associated vendor aliases.

### GET /node/<node_id>

Unified endpoint to fetch details of any node by its ID (`vendor_2`, `pgp_3109`, `email_xyz`, `btc_123`).

### GET /search?q=<text>

Searches across:
- Vendor aliases & usernames
- PGP key aliases & fingerprints
- Email addresses & domains
- Bitcoin wallets & formats

