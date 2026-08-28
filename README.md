# CTI Platform

A Flask and React dashboard for vendor identity resolution and marketplace relationship analysis.

## Prerequisites

- Windows PowerShell
- Python 3.11 or newer
- Node.js LTS and npm
- MySQL 8.x with the MySQL client (`mysql.exe`)

## First-time setup

Open PowerShell in the repository root. If MySQL uses a password other than the default expected by the backend, set it in this terminal before running setup:

```powershell
$env:DB_PASSWORD="your_mysql_password"
.\setup.ps1
```

The script will:

1. Create `.venv` if needed and install the root Python requirements.
2. Create `main_db` if needed.
3. Import the committed legacy data dump.
4. Create normalized and runtime tables from `backend/database/schema.sql`.
5. Migrate legacy vendor/profile/PGP data into the normalized identity tables.
6. Install frontend packages with `npm ci`.

The data dump is large. To provision only an empty database schema, skip importing it:

```powershell
.\setup.ps1 -SkipDataImport
```

ShadowBay and NightMarket are generated synthetic marketplaces and are not included in the legacy dump. Generate them explicitly after the baseline setup:

```powershell
.\setup.ps1 -SkipDataImport:$false -GenerateSynthetic
```

Do not run that option if you do not want synthetic records added to the database.

If PowerShell blocks scripts, enable locally for your user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

If `mysql.exe` is installed but not on PATH, `setup.ps1` checks the standard MySQL and XAMPP installation folders. Otherwise install the MySQL client or add its `bin` directory to PATH.

## Run the application

Start the backend in one terminal:

```powershell
cd backend
..\.venv\Scripts\Activate.ps1
python app.py
```

The backend API runs at `http://localhost:5000`.

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open the `Local` URL printed by Vite, normally `http://localhost:5173`.

If another Vite application already uses port 5173, run this project on another port:

```powershell
npm run dev -- --port 5174
```

## Database configuration

The backend reads these environment variables:

- `DB_HOST` (default `localhost`)
- `DB_USER` (default `root`)
- `DB_PASSWORD` (default `root`)
- `DB_NAME` (default `main_db`)

These variables must be set in the terminal that starts the backend. Do not commit real passwords.

## Useful checks

```powershell
# Check the backend
Invoke-RestMethod http://localhost:5000/

# Check marketplace data
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $mysql -u root -p -e "USE main_db; SELECT market_id, COUNT(*) AS vendors FROM vendors GROUP BY market_id ORDER BY market_id;"
```

Expected synthetic marketplace IDs are `101` for ShadowBay and `102` for NightMarket.

## Development commands

Backend tests, from `backend`:

```powershell
python -m unittest discover -s tests
```

Frontend build, from `frontend`:

```powershell
npm run build
```

More focused notes are available in [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).
