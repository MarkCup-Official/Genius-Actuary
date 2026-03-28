param(
    [int]$BackendPort = 8000
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$RunDir = Join-Path $Root ".codex-test"
$BackendLog = Join-Path $RunDir "backend.out.log"
$BackendErrorLog = Join-Path $RunDir "backend.err.log"
$SummaryLog = Join-Path $RunDir "test-summary.log"
$BackendPidFile = Join-Path $RunDir "backend-test-pid.txt"
$VenvDir = Join-Path $BackendDir ".venv313"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"

New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
Set-Content -Path $SummaryLog -Encoding UTF8 -Value ""

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
    Add-Content -Path $SummaryLog -Value "==> $Message"
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

function Assert-PathExists {
    param(
        [string]$PathValue,
        [string]$Message
    )

    if (-not $PathValue) {
        throw $Message
    }
}

function Stop-TestBackend {
    if (-not (Test-Path $BackendPidFile)) {
        return
    }

    try {
        $pidValue = Get-Content -Path $BackendPidFile -ErrorAction Stop
        if ($pidValue) {
            $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
            }
        }
    } finally {
        Remove-Item $BackendPidFile -Force -ErrorAction SilentlyContinue
    }
}

function Wait-ForHttpOk {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                return
            }
        } catch {
            Start-Sleep -Milliseconds 750
        }
    }

    throw "Timed out waiting for $Url"
}

$PyLauncher = Resolve-CommandPath -Candidates @("py")
$NodePath = Resolve-CommandPath -Candidates @("node")
$NpmPath = Resolve-CommandPath -Candidates @("npm.cmd", "npm")

Assert-PathExists -PathValue $PyLauncher -Message "Python launcher 'py' was not found. Please install Python 3.13 first."
Assert-PathExists -PathValue $NodePath -Message "Node.js was not found in PATH. Please install Node.js 22.x or add it to PATH."
Assert-PathExists -PathValue $NpmPath -Message "npm was not found. Install Node.js LTS first with: winget install OpenJS.NodeJS.LTS ; then reopen PowerShell and rerun this script."

try {
    Stop-TestBackend

    Write-Step "Preparing backend virtual environment"
    if (-not (Test-Path $VenvPython)) {
        Push-Location $BackendDir
        try {
            & $PyLauncher -3.13 -m venv $VenvDir
        } finally {
            Pop-Location
        }
    }

    Write-Step "Installing backend dependencies"
    Push-Location $BackendDir
    try {
        & $VenvPython -m pip install -r requirements.txt 2>&1 | Tee-Object -FilePath $SummaryLog -Append
    } finally {
        Pop-Location
    }

    Write-Step "Installing frontend dependencies"
    Push-Location $FrontendDir
    try {
        if (Test-Path (Join-Path $FrontendDir "node_modules")) {
            & $NpmPath install 2>&1 | Tee-Object -FilePath $SummaryLog -Append
        } else {
            & $NpmPath ci 2>&1 | Tee-Object -FilePath $SummaryLog -Append
        }
    } finally {
        Pop-Location
    }

    Write-Step "Running frontend lint"
    Push-Location $FrontendDir
    try {
        & $NpmPath run lint 2>&1 | Tee-Object -FilePath $SummaryLog -Append
    } finally {
        Pop-Location
    }

    Write-Step "Running frontend tests"
    Push-Location $FrontendDir
    try {
        & $NpmPath run test:run 2>&1 | Tee-Object -FilePath $SummaryLog -Append
    } finally {
        Pop-Location
    }

    Write-Step "Running frontend build"
    Push-Location $FrontendDir
    try {
        & $NpmPath run build 2>&1 | Tee-Object -FilePath $SummaryLog -Append
    } finally {
        Pop-Location
    }

    Write-Step "Starting backend smoke test"
    $backendProcess = Start-Process `
        -FilePath $VenvPython `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$BackendPort") `
        -WorkingDirectory $BackendDir `
        -RedirectStandardOutput $BackendLog `
        -RedirectStandardError $BackendErrorLog `
        -PassThru
    Set-Content -Path $BackendPidFile -Value $backendProcess.Id -Encoding ASCII

    Wait-ForHttpOk -Url "http://127.0.0.1:$BackendPort/health"

    Write-Step "Checking backend endpoints"
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -Method Get
    $bootstrap = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/api/frontend/bootstrap" -Method Get -SessionVariable bootstrapSession

    if ($health.status -ne "ok") {
        throw "Backend /health returned an unexpected payload."
    }

    if (-not $bootstrap.app_name) {
        throw "Backend /api/frontend/bootstrap did not return app_name."
    }

    Write-Step "Creating and advancing a backend session"
    $createBody = @{
        mode = "single_decision"
        problem_statement = "Smoke test session"
    } | ConvertTo-Json

    $created = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$BackendPort/api/sessions" `
        -Method Post `
        -ContentType "application/json" `
        -Body $createBody `
        -WebSession $bootstrapSession

    if (-not $created.session_id) {
        throw "Session creation did not return session_id."
    }

    $sessionId = $created.session_id
    $session = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$BackendPort/api/sessions/$sessionId" `
        -Method Get `
        -WebSession $bootstrapSession

    if (-not $session.session_id) {
        throw "Fetching the created session failed."
    }

    $stepBody = @{
        answers = @{}
    } | ConvertTo-Json

    $continued = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$BackendPort/api/sessions/$sessionId/step" `
        -Method Post `
        -ContentType "application/json" `
        -Body $stepBody `
        -WebSession $bootstrapSession

    if (-not $continued.session_id) {
        throw "Continuing the session failed."
    }

    Write-Host ""
    Write-Host "All tests passed." -ForegroundColor Green
    Write-Host "Summary log       : $SummaryLog"
    Write-Host "Backend stdout log: $BackendLog"
    Write-Host "Backend stderr log: $BackendErrorLog"
} finally {
    Stop-TestBackend
}
