param(
    [string]$MySqlUser = "root",
    [string]$Database = "main_db",
    [switch]$SkipDataImport,
    [switch]$GenerateSynthetic
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$VenvPath = Join-Path $ProjectRoot ".venv"
$PythonPath = Join-Path $VenvPath "Scripts\python.exe"
$MySqlCandidates = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe"
)

function Find-MySql {
    $mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue
    if ($mysql) { return $mysql.Source }

    foreach ($candidate in $MySqlCandidates) {
        if (Test-Path $candidate) { return $candidate }
    }

    throw "mysql.exe was not found. Install MySQL Client or add its bin folder to PATH."
}

function Invoke-MySqlFile([string]$Mysql, [string]$FilePath) {
    Write-Host "Applying $FilePath..."
    Get-Content $FilePath -Raw | & $Mysql -u $MySqlUser -p $Database
    if ($LASTEXITCODE -ne 0) { throw "MySQL failed while applying $FilePath (exit code $LASTEXITCODE)." }
}

Write-Host "Preparing CTI Platform in $ProjectRoot"
$mysql = Find-MySql

if (-not (Test-Path $PythonPath)) {
    Write-Host "Creating Python virtual environment..."
    & python -m venv $VenvPath
    if ($LASTEXITCODE -ne 0) { throw "Python virtual environment creation failed." }
}

Write-Host "Installing Python dependencies..."
& $PythonPath -m pip install --upgrade pip
& $PythonPath -m pip install -r (Join-Path $ProjectRoot "requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Python dependency installation failed." }

Write-Host "Creating database if needed..."
& $mysql -u $MySqlUser -p -e "CREATE DATABASE IF NOT EXISTS $Database"
if ($LASTEXITCODE -ne 0) { throw "Database creation failed." }

if (-not $SkipDataImport) {
    Invoke-MySqlFile $mysql (Join-Path $ProjectRoot "data\main_db.sql")
}

Invoke-MySqlFile $mysql (Join-Path $ProjectRoot "backend\database\schema.sql")

$env:DB_USER = $MySqlUser
$env:DB_NAME = $Database
Write-Host "Migrating legacy vendor data into normalized identity tables..."
Push-Location (Join-Path $ProjectRoot "backend")
try {
    & $PythonPath -m services.migration_service
    if ($LASTEXITCODE -ne 0) { throw "Database migration failed." }

    if ($GenerateSynthetic) {
        Write-Host "Generating optional ShadowBay and NightMarket data..."
        & $PythonPath run_synthetic_generation.py --no-csv
        if ($LASTEXITCODE -ne 0) { throw "Synthetic data generation failed." }
    }
} finally {
    Pop-Location
}

Write-Host "Installing frontend dependencies..."
Push-Location (Join-Path $ProjectRoot "frontend")
try {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
} finally {
    Pop-Location
}

Write-Host "Setup complete. Start the backend with:"
Write-Host "  cd backend; .\.venv\Scripts\python.exe app.py"
Write-Host "Start the frontend in another terminal with:"
Write-Host "  cd frontend; npm run dev"
