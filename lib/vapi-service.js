// lib/vapi-service.js - FIXED VERSION
import connectDB from '@/lib/mongodb';
import { getVAPIAssistantConfig } from '@/lib/webhook-config';

// Use PRIVATE key for server-side API calls
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
// Use PUBLIC key for client-side (already correct)
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const VAPI_BASE_URL = process.env.VAPI_BASE_URL || 'https://api.vapi.ai';

// Create VAPI Assistant for Interview
export async function createVAPIAssistant({ jobTitle, questions, duration }) {
  try {
    // Validate private key exists
    if (!VAPI_PRIVATE_KEY) {
      throw new Error('VAPI_PRIVATE_KEY environment variable is required for server-side operations');
    }

    const questionsText = questions.map((q, index) => 
      `${index + 1}. ${q.question} (Expected duration: ${q.expectedDuration}s)`
    ).join('\n');

    const systemPrompt = `
You are an AI interviewer conducting a ${duration}-minute interview for a ${jobTitle} position.

INTERVIEW QUESTIONS:
${questionsText}

INSTRUCTIONS:
1. Start with a warm greeting and brief introduction
2. Ask questions one by one in order
3. Allow candidate to fully answer before moving to next question
4. Ask follow-up questions if answers are too brief
5. Keep track of time and pace accordingly
6. End gracefully when time is up or all questions are covered
7. Be professional, encouraging, and conversational
8. If candidate asks about company/role, politely redirect to focus on their responses

IMPORTANT: 
- Wait for complete answers before proceeding
- Don't rush through questions
- Maintain natural conversation flow
- End with "Thank you for your time. Your interview has been completed."
`;

    // FIX 1: Shorten the name to meet 40 character limit
    const assistantName = `${jobTitle.slice(0, 25)} Interview`;

    const baseAssistantConfig = {
      name: assistantName, // FIXED: Shortened name
      model: {
        provider: "openai",
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: systemPrompt
          }
        ]
      },
      voice: {
        provider: "11labs",
        voiceId: "21m00Tcm4TlvDq8ikWAM", // Professional voice
        stability: 0.5,
        similarityBoost: 0.75
      },
      firstMessage: `Hello! Welcome to the ${jobTitle} interview. I'm excited to speak with you today. We have about ${duration} minutes together, and I'll be asking you several questions about your background and experience. Are you ready to begin?`,
      endCallFunctionEnabled: true,
      endCallMessage: "Thank you for your time. Your interview has been completed. Good luck!",
      maxDurationSeconds: duration * 60 + 300, // Add 5 minutes buffer
      silenceTimeoutSeconds: 60, // Increased to 60 seconds to prevent premature disconnection
      responseDelaySeconds: 1.5,
      llmRequestDelaySeconds: 1,
      numWordsToInterruptAssistant: 8, // Increased to reduce interruptions
      endCallPhrases: ["goodbye", "end interview", "that's all"],
      backgroundSound: "off", // FIX 2: Use "off" instead of "none"
      backchannelingEnabled: true,
      backgroundDenoisingEnabled: true,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en-US",
      },
      // Add audio configuration
      clientMessages: [
        "conversation-update",
        "function-call",
        "hang",
        "model-output",
        "speech-update",
        "transcript",
        "tool-calls",
        "voice-input"
      ],
      serverMessages: [
        "conversation-update",
        "end-of-call-report",
        "function-call",
        "hang",
        "model-output",
        "speech-update",
        "transcript",
        "tool-calls"
      ]
    };

    // Add webhook configuration with robust localhost fallback
    let assistantConfig = baseAssistantConfig;
    
    // For localhost development, always use basic config (no webhook)
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                        !process.env.NEXT_PUBLIC_APP_URL || 
                        process.env.NEXT_PUBLIC_APP_URL.includes('localhost');
    
    if (isLocalhost) {
      console.log('🏠 Using localhost VAPI config (webhooks disabled)');
      assistantConfig = {
        ...baseAssistantConfig,
        // Minimal config for localhost
        endCallFunctionEnabled: false, // No webhook callbacks
        metadata: {
          platform: 'hireai',
          environment: 'localhost-development',
          note: 'Webhooks disabled for local development'
        }
      };
    } else {
      console.log('🌐 Using production VAPI config (webhooks enabled)');
      try {
        assistantConfig = getVAPIAssistantConfig(baseAssistantConfig);
      } catch (error) {
        console.warn('Webhook config failed, using basic config:', error.message);
        assistantConfig = {
          ...baseAssistantConfig,
          // Fallback webhook configuration
          serverUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhook/vapi`,
          serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'default-webhook-secret'
        };
      }
    }

    console.log('Creating VAPI assistant with config:', JSON.stringify(assistantConfig, null, 2));

    const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, // Use PRIVATE key here
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assistantConfig)
    });

    console.log('VAPI response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('VAPI API error response:', error);
      throw new Error(`VAPI API error: ${error}`);
    }

    const assistant = await response.json();
    console.log('VAPI assistant created successfully:', assistant.id);
    return assistant;

  } catch (error) {
    console.error('Create VAPI assistant error:', error);
    throw new Error('Failed to create interview assistant');
  }
}

// Generate Interview Link
export function generateInterviewLink(assistantId, jobId) {
  // This creates a link that when clicked, starts the VAPI call
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  return `${baseUrl}/interview/${jobId}?assistant=${assistantId}`;
}

// Start VAPI Web Call (server-side)
export async function startVAPIWebCall(assistantId, metadata = {}) {
  try {
    // Use PUBLIC key for web calls
    const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    
    if (!VAPI_PUBLIC_KEY) {
      throw new Error('NEXT_PUBLIC_VAPI_PUBLIC_KEY environment variable is required for web calls');
    }

    const callConfig = {
      assistantId: assistantId,
      metadata: metadata
    };

    console.log('Creating web call with config:', callConfig);

    const response = await fetch(`${VAPI_BASE_URL}/call/web`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PUBLIC_KEY}`, // Use PUBLIC key for web calls
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('VAPI web call error:', error);
      throw new Error(`VAPI web call error: ${error}`);
    }

    const call = await response.json();
    console.log('VAPI web call created successfully:', call.id);
    return call;

  } catch (error) {
    console.error('Start VAPI web call error:', error);
    throw new Error(`Failed to start web call: ${error.message}`);
  }
}

// Get Call Details
export async function getVAPICall(callId) {
  try {
    if (!VAPI_PRIVATE_KEY) {
      throw new Error('VAPI_PRIVATE_KEY environment variable is required');
    }

    const response = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}` // Use PRIVATE key
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch call details');
    }

    const call = await response.json();
    return call;

  } catch (error) {
    console.error('Get VAPI call error:', error);
    throw new Error('Failed to get call details');
  }
}

// Process VAPI Webhook
export async function processVAPIWebhook(webhookData) {
  try {
    const { type, call } = webhookData;

    switch (type) {
      case 'call-started':
        console.log('Interview call started:', call.id);
        break;

      case 'call-ended':
        console.log('Interview call ended:', call.id);
        // Process the completed interview
        return await processCompletedInterview(call);

      case 'transcript':
        console.log('Interview transcript:', call.transcript);
        break;

      default:
        console.log('Unknown webhook type:', type);
    }

    return { success: true };

  } catch (error) {
    console.error('Process VAPI webhook error:', error);
    throw error;
  }
}

// Process Completed Interview
async function processCompletedInterview(call) {
  try {
    const { 
      id: callId,
      transcript,
      duration,
      assistantId,
      metadata 
    } = call;

    // Extract job and application info from metadata or URL
    const jobId = metadata?.jobId;
    const userId = metadata?.userId;

    if (!jobId || !userId) {
      console.error('Missing job or user ID in call metadata');
      return { success: false, error: 'Missing required IDs' };
    }

    // Get the job and questions
    const { Job, Application } = await import('@/models/job');
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const application = await Application.findOne({ jobId, userId });
    if (!application) {
      throw new Error('Application not found');
    }

    // Analyze the interview performance
    const { analyzeVoiceInterview } = await import('@/lib/ai-services');
    
    const interviewAnalysis = await analyzeVoiceInterview({
      transcript: transcript || '',
      questions: job.interviewQuestions,
      jobTitle: job.jobTitle,
      interviewDuration: duration,
      answeredQuestions: calculateAnsweredQuestions(transcript, job.interviewQuestions),
      totalQuestions: job.interviewQuestions.length
    });

    // Update application with interview results
    application.voiceInterviewCompleted = true;
    application.voiceInterviewScore = interviewAnalysis.overallPerformance;
    application.voiceInterviewFeedback = {
      ...interviewAnalysis,
      interviewDuration: duration,
      answeredQuestions: calculateAnsweredQuestions(transcript, job.interviewQuestions),
      totalQuestions: job.interviewQuestions.length
    };

    // Calculate final score (resume 60% + interview 40%)
    application.finalScore = Math.round(
      (application.atsScore * 0.6) + (interviewAnalysis.overallPerformance * 0.4)
    );

    application.status = 'interview_completed';
    application.interviewCompletedAt = new Date();

    await application.save();

    // Update job completion count
    job.completedInterviews = (job.completedInterviews || 0) + 1;
    await job.save();

    return { 
      success: true, 
      callId,
      applicationId: application._id,
      finalScore: application.finalScore
    };

  } catch (error) {
    console.error('Process completed interview error:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to estimate answered questions from transcript
function calculateAnsweredQuestions(transcript, questions) {
  if (!transcript || !questions.length) return 0;
  
  // Simple heuristic: count meaningful responses
  const responses = transcript.split(/interviewer|assistant/i).filter(r => 
    r.trim().length > 50 // Filter out short responses
  );
  
  return Math.min(responses.length, questions.length);
}

export async function createAdaptiveVAPIAssistant({ 
  jobTitle, 
  questions, 
  duration, 
  candidateName,
  resumeHighlights 
}) {
  try {
    if (!VAPI_PRIVATE_KEY) {
      throw new Error('VAPI_PRIVATE_KEY environment variable is required');
    }

    const questionsText = questions.map((q, index) => 
      `${index + 1}. ${q.question} (Expected: ${q.expectedDuration}s, Type: ${q.type})`
    ).join('\n');

    const resumeContext = resumeHighlights ? 
      `\nCandidate Background: ${resumeHighlights}` : '';

    const systemPrompt = `
You are an expert AI interviewer for a ${jobTitle} position interviewing ${candidateName || 'the candidate'}.

INTERVIEW QUESTIONS:
${questionsText}

CANDIDATE CONTEXT:${resumeContext}

INTERVIEW GUIDELINES:
1. Start warmly: "Hello ${candidateName || 'there'}! Thanks for joining us today."
2. Ask questions naturally, one at a time
3. Listen for complete answers before proceeding
4. Ask relevant follow-ups if answers are brief or unclear
5. If candidate mentions specific experiences, explore them briefly
6. Keep professional but conversational tone
7. Manage time: ${duration} minutes total
8. End with: "Thank you for your time. Your interview is now complete."

IMPORTANT:
- Adapt questions based on their responses
- Don't rush - quality over quantity
- Be encouraging and professional
- If they ask about company details, say "I'll have someone follow up on that"
`;

    // FIX 1: Shorten the name to meet 40 character limit
    const assistantName = `${jobTitle.slice(0, 20)} - ${candidateName?.slice(0, 10) || 'Candidate'}`;

    const assistantConfig = {
      name: assistantName, // FIXED: Shortened name
      model: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.6,
        messages: [
          {
            role: "system", 
            content: systemPrompt
          }
        ]
      },
      voice: {
        provider: "11labs",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        stability: 0.6,
        similarityBoost: 0.8,
        style: 0.2
      },
      firstMessage: `Hello ${candidateName ? candidateName : 'there'}! Thanks for joining us today for the ${jobTitle} interview. I'm excited to learn more about you. We have about ${duration} minutes together. Are you ready to begin?`,
      endCallMessage: "Thank you for your time today. Your interview has been completed successfully. You should hear back from our team soon. Have a great day!",
      maxDurationSeconds: (duration * 60) + 180, // Add 3 minutes buffer
      silenceTimeoutSeconds: 60, // Increased to prevent premature disconnection
      responseDelaySeconds: 1.5,
      llmRequestDelaySeconds: 1,
      numWordsToInterruptAssistant: 8, // Increased to reduce interruptions
      endCallPhrases: ["goodbye", "end interview", "that's all"],
      backgroundSound: "off", // FIX 2: Use "off" instead of "none"
      backchannelingEnabled: true,
      backgroundDenoisingEnabled: true,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en-US",
        smart_format: true
      },
      metadata: {
        candidateName: candidateName || 'Unknown',
        jobTitle: jobTitle,
        interviewType: 'ai_voice_interview'
      }
    };

    const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, // Use PRIVATE key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assistantConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`VAPI API error: ${error}`);
    }

    const assistant = await response.json();
    return assistant;

  } catch (error) {
    console.error('Create adaptive VAPI assistant error:', error);
    throw new Error('Failed to create adaptive interview assistant');
  }
}

export default {
  createVAPIAssistant,
  generateInterviewLink,
  startVAPIWebCall,
  getVAPICall,
  processVAPIWebhook
};