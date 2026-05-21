$env:PATH = "C:\Program Files\Git\cmd;C:\Program Files\nodejs;$env:PATH"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "Dev\app\backend"
$frontend = Join-Path $root "Dev\app\frontend"

Write-Host "Starting backend on :3001 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; npm run dev" -WindowStyle Normal

Write-Host "Starting frontend on :5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm run dev" -WindowStyle Normal

Write-Host "Both servers launched. Close their windows to stop them." -ForegroundColor Green
