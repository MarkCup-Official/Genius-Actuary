param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 8080
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDemoDir = Join-Path $Root "frontend-demo"
$RunDir = Join-Path $Root ".codex-demo"
$BackendLog = Join-Path $RunDir "backend.out.log"
$BackendErrorLog = Join-Path $RunDir "backend.err.log"
$FrontendLog = Join-Path $RunDir "frontend.out.log"
$FrontendErrorLog = Join-Path $RunDir "frontend.err.log"
$PidFile = Join-Path $RunDir "demo-pids.json"

New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

function Test-CommandExists {
    param([string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
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
}

if (-not (Test-CommandExists "python")) {
    throw "Python was not found. Please install Python and make sure it is available in PATH."
}

Stop-ExistingDemo

Write-Host "Installing backend requirements..." -ForegroundColor Cyan
Push-Location $BackendDir
try {
    & python -m pip install -r requirements.txt | Tee-Object -FilePath $BackendLog
} finally {
    Pop-Location
}

Write-Host "Starting backend on http://127.0.0.1:$BackendPort ..." -ForegroundColor Cyan
$backendProcess = Start-Process `
    -FilePath "python" `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$BackendPort") `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $BackendLog `
    -RedirectStandardError $BackendErrorLog `
    -PassThru

Write-Host "Starting frontend demo on http://127.0.0.1:$FrontendPort ..." -ForegroundColor Cyan
$frontendProcess = Start-Process `
    -FilePath "python" `
    -ArgumentList @("-m", "http.server", "$FrontendPort", "--bind", "127.0.0.1") `
    -WorkingDirectory $FrontendDemoDir `
    -RedirectStandardOutput $FrontendLog `
    -RedirectStandardError $FrontendErrorLog `
    -PassThru

@{
    backend_pid = $backendProcess.Id
    frontend_pid = $frontendProcess.Id
    backend_url = "http://127.0.0.1:$BackendPort"
    frontend_url = "http://127.0.0.1:$FrontendPort"
    backend_log = $BackendLog
    backend_error_log = $BackendErrorLog
    frontend_log = $FrontendLog
    frontend_error_log = $FrontendErrorLog
} | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Demo started." -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:$FrontendPort" -ForegroundColor Green
Write-Host "Backend : http://127.0.0.1:$BackendPort/health" -ForegroundColor Green
Write-Host "Backend stdout log: $BackendLog"
Write-Host "Backend stderr log: $BackendErrorLog"
Write-Host "Frontend stdout log: $FrontendLog"
Write-Host "Frontend stderr log: $FrontendErrorLog"
Write-Host ""
Write-Host "Stop command:" -ForegroundColor Yellow
Write-Host "powershell -ExecutionPolicy Bypass -File .\stop-demo.ps1"
