@echo off
echo 🧪 Testing OpenRouter API with Windows curl...
echo ============================================

echo.
echo Test: Basic API connection
curl -X POST "https://openrouter.ai/api/v1/chat/completions" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer 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" ^
  -H "HTTP-Referer: http://localhost:3000" ^
  -H "X-Title: HireAI Test" ^
  -d "{\"model\": \"meta-llama/llama-3.2-3b-instruct:free\", \"messages\": [{\"role\": \"user\", \"content\": \"Hello, please respond with 'API is working'\"}], \"max_tokens\": 50}"

echo.
echo.
echo ✅ Curl test completed!
pause