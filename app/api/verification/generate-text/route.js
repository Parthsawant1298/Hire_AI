// app/api/verification/generate-text/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  // 1. Initialize body outside try/catch to be available in catch block
  let body = {};
  
  try {
    // 2. Safe Body Parsing (Prevents "Unexpected end of JSON input")
    const text = await request.text();
    if (text && text.trim().length > 0) {
      body = JSON.parse(text);
    }
    
    // Default to 'profile' if missing
    const purpose = body.purpose || 'profile'; 
    
    // Validate purpose parameter
    if (!['profile', 'verification', 'test'].includes(purpose)) {
      // Don't throw, just default to profile to keep it robust
      console.warn(`Invalid purpose '${purpose}', defaulting to profile`);
    }
    
    // Define fallback texts
    const fallbackTexts = {
      profile: "Welcome to our innovative voice verification system. This technology helps ensure secure authentication through advanced voice recognition algorithms. The system analyzes unique vocal characteristics including pitch patterns, frequency distribution, and speech rhythm. By speaking this text clearly and naturally, you are creating a secure voice profile that protects your account from unauthorized access. This biometric authentication method provides an additional layer of security beyond traditional passwords.",
      verification: "Please read this verification text clearly and naturally. The voice recognition system will compare your speech patterns with your previously recorded profile. Maintain consistent speaking pace and volume throughout this passage. Advanced artificial intelligence algorithms analyze acoustic features to confirm your identity. This secure authentication process typically takes less than thirty seconds to complete successfully.",
      test: "This is a test of our voice verification system. Please speak clearly and naturally while reading this text. The system analyzes various vocal characteristics including tone, pace, and pronunciation patterns. Advanced speech recognition technology processes these acoustic features to create a unique voice fingerprint for secure authentication."
    };
    
    // 3. API Key Check
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    
    // If no API key, return fallback immediately (Graceful degradation)
    if (!apiKey) {
      console.warn('No API key found, using fallback text');
      return NextResponse.json({
        success: true,
        text: fallbackTexts[purpose] || fallbackTexts.profile,
        source: 'fallback_no_key'
      });
    }
    
    // 4. OpenRouter AI API call
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'Voice Verification Text Generator'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          {
            role: 'system',
            content: `You are a voice verification text generator. Generate a meaningful paragraph that takes exactly 30 seconds to read at normal speaking pace (approximately 150-180 words). The text should be:
            - Professional and neutral
            - Easy to pronounce
            - Contains diverse phonetic sounds for voice analysis
            - Relevant to recruitment/technology context
            - No special characters or numbers
            - Natural flowing sentences`
          },
          {
            role: 'user',
            content: purpose === 'profile' 
              ? 'Generate a 30-second text for initial voice profile setup during user registration.'
              : 'Generate a 30-second text for voice verification test before interview.'
          }
        ],
        max_tokens: 250,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`Failed to generate text from LLM: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new Error('No text generated from LLM');
    }

    return NextResponse.json({
      success: true,
      text: generatedText,
      wordCount: generatedText.split(' ').length,
      estimatedDuration: Math.round(generatedText.split(' ').length / 2.5),
      source: 'llm'
    });

  } catch (error) {
    console.error('Text generation error:', error);
    
    // 5. Robust Fallback in Catch Block
    // We reuse the body variable parsed at the top. We DO NOT call request.json() again.
    
    const fallbackTexts = {
      profile: "Welcome to our artificial intelligence powered recruitment platform. This system utilizes advanced machine learning algorithms to enhance the hiring process. Our technology analyzes candidate profiles, conducts virtual reality interview simulations, and provides comprehensive performance evaluations. The platform connects talented professionals with innovative companies worldwide. Through voice analysis and facial recognition, we ensure secure and accurate candidate verification. Our mission is to revolutionize traditional recruitment methods using cutting-edge technology solutions.",
      verification: "This verification process ensures the security and integrity of our recruitment platform. Advanced biometric analysis confirms candidate identity through facial recognition and voice pattern matching. Our artificial intelligence system processes multiple data points to verify authenticity. The technology maintains privacy while enhancing security measures. Successful verification enables access to interview opportunities and career development resources. We appreciate your cooperation in maintaining platform security standards.",
      test: "This is a test verification text to ensure your audio equipment is working correctly. Please speak clearly and naturally. The system is checking your microphone input levels and background noise to ensure a high-quality recording environment for your upcoming interview."
    };

    const purposeParam = body.purpose || 'profile';
    const fallbackText = fallbackTexts[purposeParam] || fallbackTexts.profile;

    return NextResponse.json({
      success: true,
      text: fallbackText,
      wordCount: fallbackText.split(' ').length,
      estimatedDuration: 30,
      fallback: true,
      source: 'fallback_error_handler',
      error: error.message
    });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate verification text.' },
    { status: 405 }
  );
}