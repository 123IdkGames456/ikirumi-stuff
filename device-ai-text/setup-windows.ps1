$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Device AI Setup"
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "       IKIRUMI DEVICE AI SETUP" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "This installs local tools and downloads the small chat model."
Write-Host "It does not send your chats to a cloud AI service."
Write-Host ""

function Has-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Has-Command "winget")) {
    Write-Host "Windows Package Manager (winget) is missing. Update/install App Installer from Microsoft Store, then run this setup again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/4] Installing Ollama if needed..." -ForegroundColor Cyan
if (-not (Has-Command "ollama")) {
    winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements
    $env:Path = "$env:LOCALAPPDATA\Programs\Ollama;$env:Path"
}
$ollama = Get-Command "ollama" -ErrorAction SilentlyContinue
if (-not $ollama) {
    $possible = @("$env:LOCALAPPDATA\Programs\Ollama\ollama.exe", "$env:ProgramFiles\Ollama\ollama.exe")
    foreach ($p in $possible) { if (Test-Path $p) { $ollama = Get-Item $p; break } }
}
if (-not $ollama) {
    Write-Host "Ollama was installed but this terminal cannot find it yet. Restart Windows or open a new terminal, then run: ollama pull qwen2.5:1.5b" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
$ollamaExe = if ($ollama.Source) { $ollama.Source } else { $ollama.FullName }

Write-Host "[2/4] Downloading the chat model (Qwen 2.5 1.5B)..." -ForegroundColor Cyan
$ollamaProcess = Get-Process -Name "ollama app" -ErrorAction SilentlyContinue
if (-not $ollamaProcess) {
    Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 4
}
& $ollamaExe pull qwen2.5:1.5b
if ($LASTEXITCODE -ne 0) {
    Write-Host "The chat model download did not finish. Make sure Ollama is running, then run: ollama pull qwen2.5:1.5b" -ForegroundColor Yellow
}

$base = Join-Path $HOME "DeviceAI"
$forge = Join-Path $base "stable-diffusion-webui-forge"
New-Item -ItemType Directory -Force -Path $base | Out-Null

Write-Host "[3/4] Installing Git and Python 3.10 if needed..." -ForegroundColor Cyan
if (-not (Has-Command "git")) {
    winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
}
if (-not (Has-Command "py")) {
    winget install --id Python.Python.3.10 -e --accept-package-agreements --accept-source-agreements
}
Write-Host "If Git or Python was just installed and isn't available yet, restart this setup after installation." -ForegroundColor Yellow
if (-not (Has-Command "git")) {
    Write-Host "Git is not available in this terminal yet. Reopen PowerShell and run the setup again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
if (-not (Test-Path $forge)) {
    git clone https://github.com/lllyasviel/stable-diffusion-webui-forge.git $forge
} else {
    Write-Host "Forge folder already exists; leaving it in place: $forge"
}

Write-Host "[4/4] Opening the image-model download page and Forge folder..." -ForegroundColor Cyan
$models = Join-Path $forge "models\Stable-diffusion"
New-Item -ItemType Directory -Force -Path $models | Out-Null
Start-Process "https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5"
Start-Process explorer.exe $models

Write-Host ""
Write-Host "NEXT STEPS FOR IMAGE GENERATION:" -ForegroundColor Green
Write-Host "1. On the model page, download a compatible .safetensors checkpoint."
Write-Host "2. Put that file in: $models"
Write-Host "3. Start Forge by running webui-user.bat in: $forge"
Write-Host "4. In Forge, enable API access and configure CORS for the Device AI page."
Write-Host "5. In Device AI > Setup & settings, test the Ollama and image connections."
Write-Host ""
Write-Host "Chat model: qwen2.5:1.5b"
Write-Host "Forge folder: $forge"
Write-Host "Setup finished (some installations may require a restart)." -ForegroundColor Green
Read-Host "Press Enter to close"
