$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunDir = Join-Path $Root ".codex-demo"
$PidFile = Join-Path $RunDir "demo-pids.json"

if (-not (Test-Path $PidFile)) {
    Write-Host "No running demo metadata found."
    exit 0
}

try {
    $pidInfo = Get-Content -Raw $PidFile | ConvertFrom-Json
    foreach ($name in @("backend_pid", "frontend_pid")) {
        $value = $pidInfo.$name
        if ($value) {
            $process = Get-Process -Id $value -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $value -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped process $value"
            }
        }
    }
} finally {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "Demo stopped."
