# PowerShell script to test OpenRouter API using Invoke-RestMethod
Write-Host "🧪 Testing OpenRouter API with PowerShell..." -ForegroundColor Green
Write-Host "============================================="

# Common headers
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer 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"
    "HTTP-Referer" = "http://localhost:3000"
    "X-Title" = "HireAI Test"
}

$uri = "https://openrouter.ai/api/v1/chat/completions"

# Test 1: Simple chat completion
Write-Host "`nTest 1: Basic chat completion" -ForegroundColor Yellow
try {
    $body1 = @{
        model = "meta-llama/llama-3.2-3b-instruct:free"
        messages = @(
            @{
                role = "user"
                content = "Say hello and confirm you are working"
            }
        )
        max_tokens = 100
    } | ConvertTo-Json -Depth 10

    $response1 = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body1
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Response: $($response1.choices[0].message.content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Interview questions generation
Write-Host "`nTest 2: Generate interview questions" -ForegroundColor Yellow
try {
    $body2 = @{
        model = "meta-llama/llama-3.2-3b-instruct:free"
        messages = @(
            @{
                role = "user"
                content = "You are an expert HR professional. Generate 3 interview questions for a Software Developer position. Return ONLY a JSON array in this format: [{`"question`": `"Question text`", `"type`": `"technical`", `"difficulty`": `"medium`", `"expectedDuration`": 120}]"
            }
        )
        temperature = 0.7
        max_tokens = 1000
    } | ConvertTo-Json -Depth 10

    $response2 = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body2
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Response: $($response2.choices[0].message.content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Resume analysis
Write-Host "`nTest 3: Resume analysis" -ForegroundColor Yellow
try {
    $body3 = @{
        model = "meta-llama/llama-3.2-3b-instruct:free"
        messages = @(
            @{
                role = "user"
                content = "Analyze this resume for a Software Developer position: John Doe, 3 years experience, JavaScript, React, Node.js. Return JSON with atsScore, skillsMatch, experienceMatch, overallFit (0-100 each)."
            }
        )
        temperature = 0.3
        max_tokens = 800
    } | ConvertTo-Json -Depth 10

    $response3 = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body3
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Response: $($response3.choices[0].message.content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 PowerShell API tests completed!" -ForegroundColor Green