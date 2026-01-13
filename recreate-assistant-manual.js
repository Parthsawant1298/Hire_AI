// Manually recreate assistant for ml intern job
import { readFileSync } from 'fs';
import { MongoClient, ObjectId } from 'mongodb';

// Load env
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const VAPI_PRIVATE_KEY = envVars.VAPI_PRIVATE_KEY;
const JOB_ID = '6963aaad68afe52fcdeb3c55';

async function recreateAssistant() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('hireai');
    
    // Get job details
    const job = await db.collection('jobs').findOne({ _id: new ObjectId(JOB_ID) });
    if (!job) {
      throw new Error('Job not found');
    }
    
    console.log('Found job:', job.jobTitle);
    console.log('Current assistant ID:', job.vapiAssistantId);
    
    // Create new assistant
    console.log('\nCreating new VAPI assistant...');
    
    const questionsText = (job.interviewQuestions || []).map((q, index) => 
      `${index + 1}. ${q.question} (Expected duration: ${q.expectedDuration || 120}s)`
    ).join('\n');
    
    const duration = job.voiceInterviewDuration || 15;
    
    const systemPrompt = `
You are an AI interviewer conducting a ${duration}-minute interview for a ${job.jobTitle} position.

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

IMPORTANT: End with "Thank you for your time. Your interview has been completed."
`;

    const assistantConfig = {
      name: `${job.jobTitle.slice(0, 25)} Interview`,
      model: {
        provider: "openai",
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        messages: [{ role: "system", content: systemPrompt }]
      },
      voice: {
        provider: "11labs",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        stability: 0.5,
        similarityBoost: 0.75
      },
      firstMessage: `Hello! Welcome to the ${job.jobTitle} interview. I'm excited to speak with you today. We have about ${duration} minutes together, and I'll be asking you several questions about your background and experience. Are you ready to begin?`,
      endCallMessage: "Thank you for your time. Your interview has been completed. Good luck!",
      maxDurationSeconds: duration * 60 + 300,
      silenceTimeoutSeconds: 60,
      responseDelaySeconds: 1.5,
      llmRequestDelaySeconds: 1,
      numWordsToInterruptAssistant: 8,
      backgroundSound: "off",
      backchannelingEnabled: true,
      backgroundDenoisingEnabled: true,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en-US"
      }
    };
    
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assistantConfig)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`VAPI API error: ${error}`);
    }
    
    const newAssistant = await response.json();
    console.log('✅ New assistant created:', newAssistant.id);
    
    // Update job in database
    console.log('\nUpdating job in database...');
    const interviewLink = `http://localhost:3000/interview/${JOB_ID}?assistant=${newAssistant.id}`;
    
    await db.collection('jobs').updateOne(
      { _id: new ObjectId(JOB_ID) },
      { 
        $set: {
          vapiAssistantId: newAssistant.id,
          interviewLink: interviewLink
        }
      }
    );
    
    console.log('✅ Job updated with new assistant ID');
    console.log('\nInterview link:', interviewLink);
    console.log('\n🎉 Done! You can now start the interview.');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

recreateAssistant();
