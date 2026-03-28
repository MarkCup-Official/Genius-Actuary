$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunDir = Join-Path $Root ".codex-demo"
$PidFile = Join-Path $RunDir "demo-pids.json"

function Stop-ProcessIfRunning {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped process $ProcessId"
        return $true
    }

    return $false
}

function Stop-ByListeningPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        return
    }

    $owningProcessIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $owningProcessIds) {
        if ($processId -and $processId -ne 0) {
            [void](Stop-ProcessIfRunning -ProcessId $processId)
        }
    }
}

function Remove-RunArtifacts {
    if (-not (Test-Path $RunDir)) {
        return
    }

    Get-ChildItem -Path $RunDir -File -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.Name -eq "demo-pids.json") {
            return
        }

        try {
            Remove-Item $_.FullName -Force -ErrorAction Stop
        } catch {
            Write-Warning "Could not remove run artifact: $($_.FullName)"
        }
    }
}

$stoppedSomething = $false

if (Test-Path $PidFile) {
    try {
        $pidInfo = Get-Content -Raw $PidFile | ConvertFrom-Json
        foreach ($name in @("backend_pid", "frontend_pid")) {
            $value = $pidInfo.$name
            if ($value) {
                $stopped = Stop-ProcessIfRunning -ProcessId ([int]$value)
                if ($stopped) {
                    $stoppedSomething = $true
                }
            }
        }

        if ($pidInfo.backend_url -match ":(\d+)$") {
            Stop-ByListeningPort -Port ([int]$Matches[1])
        }

        if ($pidInfo.frontend_url -match ":(\d+)$") {
            Stop-ByListeningPort -Port ([int]$Matches[1])
        }
    } catch {
        Write-Warning "Could not parse demo metadata. Falling back to default demo ports."
        Stop-ByListeningPort -Port 8000
        Stop-ByListeningPort -Port 5173
    } finally {
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
} else {
    Stop-ByListeningPort -Port 8000
    Stop-ByListeningPort -Port 5173
}

Start-Sleep -Milliseconds 800
Remove-RunArtifacts

if ($stoppedSomething) {
    Write-Host "Demo stopped."
} else {
    Write-Host "Demo stop completed. No tracked demo processes were running."
}
