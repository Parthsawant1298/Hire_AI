#!/bin/bash
# Test OpenRouter API with curl commands

echo "🧪 Testing OpenRouter API with curl..."
echo "=========================================="

# Test 1: Simple chat completion
echo "Test 1: Basic chat completion"
curl -X POST "https://openrouter.ai/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -H "HTTP-Referer: http://localhost:3000" \
  -H "X-Title: HireAI Test" \
  -d '{
    "model": "meta-llama/llama-3.2-3b-instruct:free",
    "messages": [
      {
        "role": "user",
        "content": "Say hello and confirm you are working"
      }
    ],
    "max_tokens": 100
  }' | jq .

echo -e "\n\n"

# Test 2: Interview questions generation
echo "Test 2: Generate interview questions"
curl -X POST "https://openrouter.ai/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -H "HTTP-Referer: http://localhost:3000" \
  -H "X-Title: HireAI Test" \
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
  }' | jq .

echo -e "\n\n"

# Test 3: Resume analysis
echo "Test 3: Resume analysis"
curl -X POST "https://openrouter.ai/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -H "HTTP-Referer: http://localhost:3000" \
  -H "X-Title: HireAI Test" \
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
  }' | jq .

echo -e "\n✅ Curl tests completed!"