// app/api/interview/test-feedback/route.js
// TEST ENDPOINT - No auth required, for testing AI feedback generation only

import { NextResponse } from 'next/server';
import { analyzeVoiceInterview } from '@/lib/ai-services';

export async function POST(request) {
  try {
    console.log('🧪 TEST: Processing interview feedback...');
    
    const { messages } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    console.log('📊 TEST: Processing', messages.length, 'messages');

    // Build transcript from messages
    const transcriptLines = [];
    
    messages.forEach((msg, index) => {
      console.log(`TEST Message ${index}:`, JSON.stringify(msg).substring(0, 150));
      
      if (msg.role === 'assistant' || msg.type === 'assistant') {
        const text = msg.content || msg.text || msg.message || msg.transcript || '';
        if (text) transcriptLines.push(`AI: ${text}`);
      } else if (msg.role === 'user' || msg.type === 'user') {
        const text = msg.content || msg.text || msg.message || msg.transcript || '';
        if (text) transcriptLines.push(`Candidate: ${text}`);
      } else if (msg.type === 'transcript' && msg.transcript) {
        transcriptLines.push(`${msg.role || 'User'}: ${msg.transcript}`);
      } else if (msg.transcriptType === 'final') {
        const text = msg.transcript || msg.text || '';
        if (text) transcriptLines.push(`Candidate: ${text}`);
      }
    });

    const transcript = transcriptLines.join('\n');

    console.log('📝 TEST: Transcript lines collected:', transcriptLines.length);
    console.log('📝 TEST: Transcript length:', transcript.length);
    console.log('📝 TEST: Full transcript:\n', transcript);

    if (!transcript || transcript.length < 50) {
      console.error('❌ TEST: Transcript too short!');
      return NextResponse.json(
        { 
          error: 'Transcript too short or empty',
          transcriptLength: transcript.length,
          messageCount: messages.length,
          transcript: transcript
        },
        { status: 400 }
      );
    }

    // Analyze interview with AI
    console.log('🤖 TEST: Analyzing interview with AI...');
    
    const feedback = await analyzeVoiceInterview({
      transcript: transcript,
      questions: [],
      jobTitle: 'Test Machine Learning Position',
      interviewDuration: 300,
      answeredQuestions: messages.length / 2, // Rough estimate
      totalQuestions: 5,
      monitoringData: [],
      anomalies: []
    });

    console.log('✅ TEST: AI analysis complete:', {
      score: feedback.overallPerformance,
      hasFeedback: !!feedback.detailedFeedback
    });

    return NextResponse.json({
      success: true,
      score: feedback.overallPerformance,
      communicationSkills: feedback.communicationSkills,
      technicalKnowledge: feedback.technicalKnowledge,
      problemSolving: feedback.problemSolving,
      confidence: feedback.confidence,
      feedback: feedback.detailedFeedback,
      keyPoints: feedback.keyPoints,
      transcript: transcript,
      transcriptLength: transcript.length,
      messageCount: messages.length
    });

  } catch (error) {
    console.error('❌ TEST: Error:', error);
    console.error('❌ TEST: Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to process test feedback',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
