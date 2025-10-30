# PowerShell script to test OpenRouter API with curl
Write-Host "🧪 Testing OpenRouter API with PowerShell curl..." -ForegroundColor Green
Write-Host "=================================================="

# Test 1: Simple chat completion
Write-Host "`nTest 1: Basic chat completion" -ForegroundColor Yellow
$response1 = curl -X POST "https://openrouter.ai/api/v1/chat/completions" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer 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" `
  -H "HTTP-Referer: http://localhost:3000" `
  -H "X-Title: HireAI Test" `
  -d '{
    "model": "meta-llama/llama-3.2-3b-instruct:free",
    "messages": [
      {
        "role": "user",
        "content": "Say hello and confirm you are working"
      }
    ],
    "max_tokens": 100
  }' 2>$null

Write-Host $response1 -ForegroundColor Cyan

# Test 2: Interview questions generation
Write-Host "`n`nTest 2: Generate interview questions" -ForegroundColor Yellow
$response2 = curl -X POST "https://openrouter.ai/api/v1/chat/completions" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer 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" `
  -H "HTTP-Referer: http://localhost:3000" `
  -H "X-Title: HireAI Test" `
  -d '{
    "model": "meta-llama/llama-3.2-3b-instruct:free",
    "messages": [
      {
        "role": "user",
        "content": "You are an expert HR professional. Generate 3 interview questions for a Software Developer position. Return ONLY a JSON array in this format: [{\"question\": \"Question text\", \"type\": \"technical\", \"difficulty\": \"medium\", \"expectedDuration\": 120}]"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }' 2>$null

Write-Host $response2 -ForegroundColor Cyan

# Test 3: Resume analysis
Write-Host "`n`nTest 3: Resume analysis" -ForegroundColor Yellow
$response3 = curl -X POST "https://openrouter.ai/api/v1/chat/completions" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer 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" `
  -H "HTTP-Referer: http://localhost:3000" `
  -H "X-Title: HireAI Test" `
  -d '{
    "model": "meta-llama/llama-3.2-3b-instruct:free",
    "messages": [
      {
        "role": "user",
        "content": "Analyze this resume for a Software Developer position: John Doe, 3 years experience, JavaScript, React, Node.js. Return JSON with atsScore, skillsMatch, experienceMatch, overallFit (0-100 each)."
      }
    ],
    "temperature": 0.3,
    "max_tokens": 800
  }' 2>$null

Write-Host $response3 -ForegroundColor Cyan

Write-Host "`n✅ PowerShell curl tests completed!" -ForegroundColor Green