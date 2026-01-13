// Test AI connection
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    console.log('🧪 Testing OpenRouter API connection...');
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENROUTER_API_KEY not configured',
        instructions: 'Get a free API key from https://openrouter.ai/keys and add to .env.local'
      }, { status: 500 });
    }
    
    console.log('🔑 API Key found (first 10 chars):', apiKey.substring(0, 10) + '...');
    
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'HireAI Test'
      }
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Say "API is working" in JSON format: {"status": "working"}'
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    });
    
    const content = response.choices[0].message.content;
    console.log('✅ API Response:', content);
    
    return NextResponse.json({
      success: true,
      message: 'OpenRouter API is working',
      response: content,
      model: response.model,
      usage: response.usage
    });
    
  } catch (error) {
    console.error('❌ API Test Failed:', error);
    console.error('❌ Error status:', error.status);
    console.error('❌ Error message:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      status: error.status,
      details: error.error || 'Unknown error'
    }, { status: 500 });
  }
}
