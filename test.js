import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'HireAI Test'
  }
});

async function test() {
  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemma-3n-e2b-it:free',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 50
    });
    console.log('✅ Success:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Status:', error.status);
  }
}

test();