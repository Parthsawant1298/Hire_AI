# Start all verification services
# Run this script: .\start_all_services.ps1

Write-Host "🚀 Starting HireAI Verification Services" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Start Face Service (Port 8001)
Write-Host "1️⃣ Starting Face Verification Service (Port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python face_service.py"
Start-Sleep -Seconds 2

# Start Voice Service (Port 8003)
Write-Host "2️⃣ Starting Voice Verification Service (Port 8003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python voice_service.py"
Start-Sleep -Seconds 2

# Start Next.js Server (Port 3000)
Write-Host "3️⃣ Starting Next.js Development Server (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
Start-Sleep -Seconds 3

Write-Host "`n✅ All services started!" -ForegroundColor Green
Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
Write-Host "   - Face Service: http://localhost:8001/health" -ForegroundColor White
Write-Host "   - Voice Service: http://localhost:8003/health" -ForegroundColor White
Write-Host "   - Next.js App: http://localhost:3000" -ForegroundColor White

Write-Host "`n💡 Test connection with: python test_verification_connection.py" -ForegroundColor Yellow
Write-Host "`nPress any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
