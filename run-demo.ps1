param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$RunDir = Join-Path $Root ".codex-demo"
$BackendInstallLog = Join-Path $RunDir "backend.install.log"
$BackendInstallErrorLog = Join-Path $RunDir "backend.install.err.log"
$BackendLog = Join-Path $RunDir "backend.out.log"
$BackendErrorLog = Join-Path $RunDir "backend.err.log"
$FrontendInstallLog = Join-Path $RunDir "frontend.install.log"
$FrontendInstallErrorLog = Join-Path $RunDir "frontend.install.err.log"
$FrontendLog = Join-Path $RunDir "frontend.out.log"
$FrontendErrorLog = Join-Path $RunDir "frontend.err.log"
$PidFile = Join-Path $RunDir "demo-pids.json"
$FrontendUrl = "http://127.0.0.1:$FrontendPort"
$BackendHealthUrl = "http://127.0.0.1:$BackendPort/health"
$BackendDebugUiUrl = "$FrontendUrl/debug/login"

New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

function Test-CommandExists {
    param([string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Resolve-CommandPath {
    param([string[]]$Candidates)

    foreach ($candidate in $Candidates) {
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }

    return $null
}

function Wait-ForHttpOk {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                return
            }
        } catch {
            Start-Sleep -Milliseconds 750
        }
    }

    throw "Timed out waiting for $Url"
}

function Stop-ExistingDemo {
    if (-not (Test-Path $PidFile)) {
        return
    }

    try {
        $pidInfo = Get-Content -Raw $PidFile | ConvertFrom-Json
        foreach ($name in @("backend_pid", "frontend_pid")) {
            $value = $pidInfo.$name
            if ($value) {
                $process = Get-Process -Id $value -ErrorAction SilentlyContinue
                if ($process) {
                    Stop-Process -Id $value -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {
        Write-Warning "Could not parse the previous PID file. Skipping old process cleanup."
    }

    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
}

function Reset-LogFile {
    param([string]$Path)

    if (Test-Path $Path) {
        try {
            Remove-Item $Path -Force -ErrorAction Stop
        } catch {
            $archivedName = "{0}.{1}.old" -f $Path, (Get-Date -Format "yyyyMMddHHmmss")
            Move-Item -Path $Path -Destination $archivedName -Force -ErrorAction SilentlyContinue
        }
    }
}

function Invoke-LoggedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$StdOutLog,
        [Parameter(Mandatory = $true)]
        [string]$StdErrLog,
        [Parameter(Mandatory = $true)]
        [string]$DisplayName
    )

    Reset-LogFile -Path $StdOutLog
    Reset-LogFile -Path $StdErrLog

    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $StdOutLog `
        -RedirectStandardError $StdErrLog `
        -PassThru `
        -Wait `
        -NoNewWindow

    if ($process.ExitCode -ne 0) {
        Write-Host ""
        Write-Host "$DisplayName failed. Recent stderr:" -ForegroundColor Red
        if (Test-Path $StdErrLog) {
            Get-Content $StdErrLog -Tail 40
        }
        throw "$DisplayName failed with exit code $($process.ExitCode)."
    }
}

if (-not (Test-CommandExists "python")) {
    throw "Python was not found. Please install Python and make sure it is available in PATH."
}

$NpmPath = Resolve-CommandPath -Candidates @("npm.cmd", "npm")
if (-not $NpmPath) {
    throw "npm was not found. Install Node.js LTS first with: winget install OpenJS.NodeJS.LTS ; then reopen PowerShell and rerun this script."
}

Stop-ExistingDemo

foreach ($path in @(
    $BackendInstallLog,
    $BackendInstallErrorLog,
    $BackendLog,
    $BackendErrorLog,
    $FrontendInstallLog,
    $FrontendInstallErrorLog,
    $FrontendLog,
    $FrontendErrorLog
)) {
    Reset-LogFile -Path $path
}

Write-Host "Installing backend requirements..." -ForegroundColor Cyan
Invoke-LoggedProcess `
    -FilePath "python" `
    -ArgumentList @("-m", "pip", "install", "-r", "requirements.txt") `
    -WorkingDirectory $BackendDir `
    -StdOutLog $BackendInstallLog `
    -StdErrLog $BackendInstallErrorLog `
    -DisplayName "Backend dependency installation"

Write-Host "Starting backend on http://127.0.0.1:$BackendPort ..." -ForegroundColor Cyan
$backendProcess = Start-Process `
    -FilePath "python" `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$BackendPort") `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $BackendLog `
    -RedirectStandardError $BackendErrorLog `
    -PassThru

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $FrontendDir ".env"))) {
    Copy-Item -Path (Join-Path $FrontendDir ".env.example") -Destination (Join-Path $FrontendDir ".env")
}

if (Test-Path (Join-Path $FrontendDir "node_modules")) {
    Invoke-LoggedProcess `
        -FilePath $NpmPath `
        -ArgumentList @("install") `
        -WorkingDirectory $FrontendDir `
        -StdOutLog $FrontendInstallLog `
        -StdErrLog $FrontendInstallErrorLog `
        -DisplayName "Frontend dependency installation"
} else {
    Invoke-LoggedProcess `
        -FilePath $NpmPath `
        -ArgumentList @("ci") `
        -WorkingDirectory $FrontendDir `
        -StdOutLog $FrontendInstallLog `
        -StdErrLog $FrontendInstallErrorLog `
        -DisplayName "Frontend dependency installation"
}

Write-Host "Starting frontend on http://127.0.0.1:$FrontendPort ..." -ForegroundColor Cyan
$frontendProcess = Start-Process `
    -FilePath $NpmPath `
    -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "$FrontendPort") `
    -WorkingDirectory $FrontendDir `
    -RedirectStandardOutput $FrontendLog `
    -RedirectStandardError $FrontendErrorLog `
    -PassThru

@{
    backend_pid = $backendProcess.Id
    frontend_pid = $frontendProcess.Id
    backend_url = "http://127.0.0.1:$BackendPort"
    frontend_url = $FrontendUrl
    backend_debug_ui_url = $BackendDebugUiUrl
    backend_install_log = $BackendInstallLog
    backend_install_error_log = $BackendInstallErrorLog
    backend_log = $BackendLog
    backend_error_log = $BackendErrorLog
    frontend_install_log = $FrontendInstallLog
    frontend_install_error_log = $FrontendInstallErrorLog
    frontend_log = $FrontendLog
    frontend_error_log = $FrontendErrorLog
} | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8

Wait-ForHttpOk -Url $BackendHealthUrl
Wait-ForHttpOk -Url $FrontendUrl

Start-Process $FrontendUrl
Start-Process $BackendDebugUiUrl

Write-Host ""
Write-Host "App started." -ForegroundColor Green
Write-Host "Frontend: $FrontendUrl" -ForegroundColor Green
Write-Host "Backend : $BackendHealthUrl" -ForegroundColor Green
Write-Host "Backend debug UI: $BackendDebugUiUrl" -ForegroundColor Green
Write-Host "Backend install log: $BackendInstallLog"
Write-Host "Backend install err: $BackendInstallErrorLog"
Write-Host "Backend stdout log: $BackendLog"
Write-Host "Backend stderr log: $BackendErrorLog"
Write-Host "Frontend install log: $FrontendInstallLog"
Write-Host "Frontend install err: $FrontendInstallErrorLog"
Write-Host "Frontend stdout log: $FrontendLog"
Write-Host "Frontend stderr log: $FrontendErrorLog"
Write-Host ""
Write-Host "Stop command:" -ForegroundColor Yellow
Write-Host "powershell -ExecutionPolicy Bypass -File .\stop-demo.ps1"
