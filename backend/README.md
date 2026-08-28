# CTI Platform Backend

Flask backend for the vendor identity-resolution graph and analysis APIs. It uses MySQL, NetworkX, and the normalized identity schema.

For a complete fresh-clone setup, use the root [README.md](../README.md) and run `..\setup.ps1` from the repository root.

## Manual setup

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\requirements.txt
```

Import the legacy data and canonical schema, then migrate the data:

```powershell
Get-Content .\data\main_db.sql -Raw | mysql -u root -p main_db
Get-Content .\backend\database\schema.sql -Raw | mysql -u root -p main_db
cd .\backend
python -m services.migration_service
```

The synthetic ShadowBay and NightMarket records are optional:

```powershell
python run_synthetic_generation.py --no-csv
```

## Run

Set database variables in the same terminal used to start Flask:

```powershell
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="your_mysql_password"
$env:DB_NAME="main_db"
python app.py
```

The API runs at `http://localhost:5000`.

## Configuration

- `DB_HOST` defaults to `localhost`
- `DB_USER` defaults to `root`
- `DB_PASSWORD` defaults to `root`
- `DB_NAME` defaults to `main_db`

## Endpoints

- `GET /` health check
- `GET /graph` Cytoscape graph payload
- `GET /statistics` graph statistics
- `GET /vendor/<id>` vendor details
- `GET /identity/<id>` identity details
- `GET /search?q=<text>` multi-entity search
- `GET /identity/suggestions` pending analyst suggestions
