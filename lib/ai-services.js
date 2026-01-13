// lib/ai-services.js
import OpenAI from 'openai';

// Helper function to create OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured. Please add it to .env.local file.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'HireAI Interview Platform'
    }
  });
}

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
        console.log(`Rate limited. Retrying in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Generate Interview Questions
export async function generateInterviewQuestions({ 
  jobTitle, 
  jobDescription, 
  jobRequirements, 
  jobType, 
  interviewDuration 
}) {
  try {
    const questionsNeeded = Math.max(5, Math.floor(interviewDuration / 2)); // 2 minutes per question average
    
    const prompt = `
    Generate ${questionsNeeded} interview questions for a ${jobType} position.
    
    Job Title: ${jobTitle}
    Job Description: ${jobDescription}
    Requirements: ${jobRequirements}
    Interview Duration: ${interviewDuration} minutes
    
    Create a mix of:
    - 30% Technical questions (specific to the role)
    - 30% Behavioral questions (teamwork, leadership, problem-solving)
    - 25% Situational questions (how they handle specific scenarios)
    - 15% General questions (motivation, career goals)
    
    Return ONLY a JSON array in this exact format:
    [
      {
        "question": "Question text here",
        "type": "technical|behavioral|situational|general",
        "difficulty": "easy|medium|hard",
        "expectedDuration": 120
      }
    ]
    
    Make questions relevant, professional, and appropriate for the role level.
    `;

    const openai = getOpenAIClient();
    
    // Use retry with backoff for AI calls
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `You are an expert HR professional and interview specialist. Generate high-quality, relevant interview questions based on job requirements.

${prompt}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
    });

    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    // Validate and ensure proper format
    return questions.map(q => ({
      question: q.question || '',
      type: ['technical', 'behavioral', 'situational', 'general'].includes(q.type) ? q.type : 'general',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      expectedDuration: q.expectedDuration || 120
    }));

  } catch (error) {
    console.error('AI question generation error:', error);
    
    // Fallback questions if AI fails
    return getDefaultQuestions(jobType);
  }
}

// Analyze Resume against Job Description
export async function analyzeResume({ resumeText, jobDescription, jobRequirements, jobTitle }) {
  try {
    // Check if we have actual resume content
    const isPdfPlaceholder = resumeText.includes('[Note: This is a PDF resume');
    
    if (isPdfPlaceholder) {
      // REJECT PDF files that can't be read - NO FAKE SCORES!
      throw new Error('PDF_EXTRACTION_FAILED: Unable to extract text from PDF. Please upload a text-based PDF or Word document.');
    }
    
    // Validate resume has meaningful content
    if (!resumeText || resumeText.trim().length < 100) {
      throw new Error('INSUFFICIENT_CONTENT: Resume content is too short or empty. Please provide a complete resume.');
    }
    
    // Use REAL AI analysis for all resumes
    const analysisPrompt = `
    Analyze this resume against the job requirements and provide detailed scoring and feedback.
    
    Job Title: ${jobTitle}
    Job Description: ${jobDescription}
    Job Requirements: ${jobRequirements}
    
    Resume Content:
    ${resumeText}
    
    Provide analysis in this EXACT JSON format:
    {
      "atsScore": 85,
      "skillsMatch": 90,
      "experienceMatch": 80,
      "overallFit": 85,
      "strengths": ["Strong technical skills", "Relevant experience"],
      "weaknesses": ["Limited leadership experience", "Missing specific certification"],
      "recommendations": ["Consider highlighting project management experience", "Add relevant certifications"],
      "detailedFeedback": "Detailed analysis paragraph here..."
    }
    
    Scoring should be 0-100. Be thorough but constructive in feedback.
    Analyze the ACTUAL content provided - do NOT generate random or generic scores.
    Base all scores on the specific skills, experience, and qualifications in the resume.
    `;

    console.log('🤖 Analyzing resume with REAL AI (OpenRouter/Gemma)...');
    
    const openai = getOpenAIClient();
    
    // Use retry with backoff for AI calls
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `You are an expert ATS system and recruitment specialist. Analyze resumes objectively based on ACTUAL content provided. Provide constructive, specific feedback based on the resume text. Do NOT generate generic or random scores.

${analysisPrompt}`
          }
        ],
        temperature: 0.3, // Low temperature for consistent, objective analysis
        max_tokens: 1500
      });
    });

    const content = response.choices[0].message.content.trim();
    console.log('✅ AI analysis completed successfully');
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid analysis response format from AI');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate scores are within range and reasonable
    const validatedAnalysis = {
      atsScore: Math.max(0, Math.min(100, analysis.atsScore || 0)),
      skillsMatch: Math.max(0, Math.min(100, analysis.skillsMatch || 0)),
      experienceMatch: Math.max(0, Math.min(100, analysis.experienceMatch || 0)),
      overallFit: Math.max(0, Math.min(100, analysis.overallFit || 0)),
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      detailedFeedback: analysis.detailedFeedback || 'Analysis completed successfully.'
    };
    
    console.log(`📊 Resume scored: ATS ${validatedAnalysis.atsScore}%, Overall Fit ${validatedAnalysis.overallFit}%`);

    return validatedAnalysis;

  } catch (error) {
    console.error('❌ Resume analysis error:', error);
    
    // Re-throw specific errors to be handled by the API
    if (error.message.includes('PDF_EXTRACTION_FAILED')) {
      throw error;
    }
    if (error.message.includes('INSUFFICIENT_CONTENT')) {
      throw error;
    }
    
    // For other AI failures, throw error instead of returning fake scores
    throw new Error('AI_ANALYSIS_FAILED: Unable to analyze resume. Please try again or contact support.');
  }
}

// Analyze Voice Interview Performance - Self-contained analysis (no external API required)
export async function analyzeVoiceInterview({
  transcript,
  questions,
  jobTitle,
  interviewDuration,
  answeredQuestions,
  totalQuestions,
  monitoringData = [],
  anomalies = []
}) {
  try {
    console.log('🤖 Starting REAL AI interview analysis...');
    console.log('📝 Transcript length:', transcript?.length || 0);

    if (!transcript || transcript.length < 50) {
      throw new Error('Transcript too short for analysis');
    }

    // Calculate basic metrics
    const transcriptLength = transcript.length;
    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    // Security/integrity scoring
    let integrityScore = 100;
    let securityFlags = [];
    
    if (anomalies && anomalies.length > 0) {
      console.log('🚨 Processing anomalies:', anomalies.length);
      anomalies.forEach(anomaly => {
        if (anomaly.faceAnomaly?.type === 'person_switch') {
          integrityScore -= 30;
          securityFlags.push('Multiple persons detected during interview');
        }
        if (anomaly.faceAnomaly?.severity === 'high') {
          integrityScore -= 15;
          securityFlags.push('Face verification issues detected');
        }
        if (anomaly.voiceAnomaly?.severity === 'high') {
          integrityScore -= 15;
          securityFlags.push('Voice verification anomalies detected');
        }
      });
    }

    // **REAL AI ANALYSIS** - Send transcript to Gemma for actual evaluation
    console.log('🤖 Sending transcript to Gemma for real analysis...');
    
    const prompt = `
You are an expert HR interviewer analyzing a voice interview transcript for a ${jobTitle} position.

INTERVIEW TRANSCRIPT:
${transcript}

INTERVIEW METADATA:
- Duration: ${Math.round(interviewDuration / 60)} minutes
- Questions Answered: ${answeredQuestions}/${totalQuestions}

Analyze this interview transcript and provide:

1. **Communication Skills** (0-100): Clarity, articulation, coherence, professionalism
2. **Technical Knowledge** (0-100): Domain expertise, understanding of concepts, accuracy of information
3. **Problem Solving** (0-100): Analytical thinking, approach to challenges, logical reasoning
4. **Confidence** (0-100): Assurance in responses, ability to handle questions, overall presence

IMPORTANT: 
- Be HONEST and CRITICAL in your assessment
- If the candidate gave poor answers, inappropriate responses, or showed lack of knowledge, give LOW scores
- If the candidate used profanity, was unprofessional, or gave nonsensical answers, reflect that in scores and feedback
- Look at the ACTUAL CONTENT of what they said, not just length or completion

Return your analysis in this EXACT JSON format:
{
  "communicationSkills": <number 0-100>,
  "technicalKnowledge": <number 0-100>,
  "problemSolving": <number 0-100>,
  "confidence": <number 0-100>,
  "detailedFeedback": "<2-3 sentence honest assessment based on actual transcript content>",
  "keyPoints": ["<strength 1>", "<strength 2>", ...],
  "areasForImprovement": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}

BE HONEST. If responses were bad, say so and give low scores.
`;

    const openai = getOpenAIClient();
    
    // Use retry with backoff for AI calls
    console.log('📡 Calling OpenRouter API for interview analysis...');
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR interviewer and talent evaluator. Analyze interview transcripts honestly and critically. Give low scores for poor performance, high scores for excellent performance. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent, analytical responses
        max_tokens: 1500
      });
    }, 5, 2000); // 5 retries, 2 second base delay

    console.log('✅ OpenRouter API response received');
    const aiContent = response.choices[0].message.content.trim();
    console.log('✅ Received AI analysis response');
    
    // Extract JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }
    
    const aiAnalysis = JSON.parse(jsonMatch[0]);

    // Calculate overall performance from AI scores
    const overallPerformance = Math.round(
      (aiAnalysis.communicationSkills + aiAnalysis.technicalKnowledge + 
       aiAnalysis.problemSolving + aiAnalysis.confidence) / 4
    );

    const analysis = {
      communicationSkills: aiAnalysis.communicationSkills,
      technicalKnowledge: aiAnalysis.technicalKnowledge,
      problemSolving: aiAnalysis.problemSolving,
      confidence: aiAnalysis.confidence,
      overallPerformance: overallPerformance,
      integrityScore: Math.max(0, integrityScore),
      detailedFeedback: aiAnalysis.detailedFeedback,
      keyPoints: aiAnalysis.keyPoints || [],
      securityFlags: securityFlags,
      areasForImprovement: aiAnalysis.areasForImprovement || [],
      metrics: {
        completionRate: Math.round(completionRate),
        averageResponseLength: Math.round(transcriptLength / Math.max(answeredQuestions, 1)),
        interviewDuration: Math.round(interviewDuration / 60),
        questionsAnswered: answeredQuestions,
        totalQuestions: totalQuestions,
        anomaliesDetected: anomalies ? anomalies.length : 0,
        monitoringDataPoints: monitoringData ? monitoringData.length : 0
      },
      monitoringResults: {
        realTimeFaceVerification: monitoringData.filter(d => d.type === 'face').length > 0,
        realTimeVoiceVerification: monitoringData.filter(d => d.type === 'voice').length > 0,
        anomaliesCount: anomalies ? anomalies.length : 0,
        integrityAssessment: integrityScore >= 80 ? 'PASS' : integrityScore >= 60 ? 'REVIEW' : 'FAIL'
      },
      processedAt: new Date().toISOString(),
      processingMethod: 'real-ai-analysis-gemma'
    };

    console.log('✅ REAL AI interview analysis completed:', {
      overallPerformance: analysis.overallPerformance,
      communicationSkills: analysis.communicationSkills,
      technicalKnowledge: analysis.technicalKnowledge,
      processingMethod: 'real-ai-analysis-gemma'
    });

    return analysis;

  } catch (error) {
    console.error('❌ REAL AI interview analysis FAILED:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error status:', error.status);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    
    // DO NOT return fake scores - throw error instead
    throw new Error(`AI interview analysis failed: ${error.message}. Cannot provide accurate scores without AI analysis.`);
  }
}

// Fallback questions if AI generation fails
function getDefaultQuestions(jobType) {
  const defaultQuestions = {
    job: [
      {
        question: "Tell me about yourself and your professional background.",
        type: "general",
        difficulty: "easy",
        expectedDuration: 120
      },
      {
        question: "What interests you most about this position?",
        type: "behavioral",
        difficulty: "easy",
        expectedDuration: 90
      },
      {
        question: "Describe a challenging project you worked on and how you overcame obstacles.",
        type: "behavioral",
        difficulty: "medium",
        expectedDuration: 180
      },
      {
        question: "How do you stay updated with industry trends and technologies?",
        type: "technical",
        difficulty: "medium",
        expectedDuration: 120
      },
      {
        question: "Where do you see yourself in 5 years?",
        type: "general",
        difficulty: "easy",
        expectedDuration: 90
      }
    ],
    internship: [
      {
        question: "Tell me about yourself and what you're studying.",
        type: "general",
        difficulty: "easy",
        expectedDuration: 120
      },
      {
        question: "Why are you interested in this internship opportunity?",
        type: "behavioral",
        difficulty: "easy",
        expectedDuration: 90
      },
      {
        question: "Describe a project or assignment you're proud of.",
        type: "behavioral",
        difficulty: "medium",
        expectedDuration: 150
      },
      {
        question: "How do you handle learning new concepts or technologies?",
        type: "behavioral",
        difficulty: "medium",
        expectedDuration: 120
      },
      {
        question: "What do you hope to gain from this internship experience?",
        type: "general",
        difficulty: "easy",
        expectedDuration: 90
      }
    ]
  };

  return defaultQuestions[jobType] || defaultQuestions.job;
}

// Generate Interview Feedback (for HR only)
export async function generateInterviewFeedback(transcript, jobId, monitoringData = null) {
  try {
    const monitoringAnalysis = monitoringData ? analyzeMonitoringData(monitoringData) : null;

    const prompt = `
    Analyze this voice interview transcript and generate detailed feedback for HR review.

    Job ID: ${jobId}
    Interview Transcript:
    ${transcript}

    ${monitoringAnalysis ? `
    SECURITY MONITORING ANALYSIS:
    ${monitoringAnalysis.summary}

    Detected Anomalies: ${monitoringAnalysis.anomalies.length}
    Risk Level: ${monitoringAnalysis.riskLevel}
    Red Flags: ${monitoringAnalysis.redFlags.join(', ')}

    Anomaly Details:
    ${monitoringAnalysis.anomalies.map(a => `- ${a.type}: ${a.description}`).join('\n')}
    ` : ''}

    Evaluate the candidate based on these 5 parameters (0-100 scale):
    1. Communication Skills - Clarity, articulation, listening, language proficiency
    2. Technical Knowledge - Job-relevant expertise, understanding of concepts
    3. Problem Solving - Logical thinking, analytical approach, solution methodology
    4. Confidence - Self-assurance, composure, professional demeanor
    5. Overall Performance - Holistic assessment combining all factors

    ${monitoringAnalysis ? `
    IMPORTANT: Factor in the monitoring analysis when scoring. Reduce scores based on:
    - Person switches: Reduce all scores by 40-60 points (MAJOR RED FLAG)
    - Multiple voice anomalies: Reduce scores by 20-30 points
    - Face quality issues: Reduce scores by 10-15 points
    - Environment changes: Reduce scores by 5-10 points
    ` : ''}

    Provide detailed feedback in this EXACT JSON format:
    {
      "scores": {
        "communicationSkills": 85,
        "technicalKnowledge": 78,
        "problemSolving": 82,
        "confidence": 90,
        "overallPerformance": 84
      },
      "detailedAnalysis": "Comprehensive paragraph analyzing the candidate's performance across all areas. Mention specific examples from the transcript that justify the scores. Explain strengths and areas for improvement with concrete evidence.",
      "keyStrengths": [
        "Excellent verbal communication with clear articulation",
        "Strong technical understanding demonstrated through specific examples",
        "Confident problem-solving approach with logical reasoning"
      ],
      "areasForImprovement": [
        "Could provide more detailed technical explanations",
        "Slight hesitation when discussing complex scenarios"
      ],
      "specificInsights": {
        "communicationStyle": "Clear and professional communication style with good pace",
        "technicalDepth": "Solid foundation but could elaborate more on advanced concepts",
        "problemApproach": "Systematic approach to problem-solving with good structure",
        "interviewPresence": "Confident and engaging throughout the interview"
      },
      "recommendation": "Strong candidate with excellent communication skills and solid technical foundation. Recommended for next round.",
      "evaluationBasis": "This evaluation is based on: verbal communication clarity and professionalism, demonstration of technical knowledge through examples and explanations, problem-solving methodology and logical reasoning, confidence and composure during questioning, and overall interview performance including engagement and responsiveness.",
      ${monitoringAnalysis ? `
      "securityAnalysis": {
        "riskLevel": "${monitoringAnalysis.riskLevel}",
        "totalAnomalies": ${monitoringAnalysis.anomalies.length},
        "redFlags": ${JSON.stringify(monitoringAnalysis.redFlags)},
        "integrityScore": ${monitoringAnalysis.integrityScore},
        "monitoringImpact": "Interview scores adjusted based on detected anomalies and security concerns",
        "anomalyBreakdown": {
          "personSwitches": ${monitoringAnalysis.personSwitches},
          "voiceAnomalies": ${monitoringAnalysis.voiceAnomalies},
          "faceDeviations": ${monitoringAnalysis.faceDeviations},
          "environmentChanges": ${monitoringAnalysis.environmentChanges}
        }
      }` : '"securityAnalysis": null'}
    }

    Base your scores on actual transcript content AND monitoring data. Be specific about what led to each score.
    ${monitoringAnalysis ? 'CRITICAL: Include security concerns in your detailed analysis and mention any red flags detected.' : ''}
    `;

    const openai = getOpenAIClient();
    
    // Use retry with backoff for AI calls
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `You are an expert HR analyst and interview assessor. Provide detailed, objective feedback based on interview transcripts for internal HR review only.

${prompt}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
    });

    const content = response.choices[0].message.content.trim();

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid feedback response format');
    }

    const feedback = JSON.parse(jsonMatch[0]);

    // Validate and ensure proper format
    const validatedFeedback = {
      scores: {
        communicationSkills: Math.max(0, Math.min(100, feedback.scores?.communicationSkills || 50)),
        technicalKnowledge: Math.max(0, Math.min(100, feedback.scores?.technicalKnowledge || 50)),
        problemSolving: Math.max(0, Math.min(100, feedback.scores?.problemSolving || 50)),
        confidence: Math.max(0, Math.min(100, feedback.scores?.confidence || 50)),
        overallPerformance: Math.max(0, Math.min(100, feedback.scores?.overallPerformance || 50))
      },
      detailedAnalysis: feedback.detailedAnalysis || 'Interview analysis completed.',
      keyStrengths: Array.isArray(feedback.keyStrengths) ? feedback.keyStrengths : [],
      areasForImprovement: Array.isArray(feedback.areasForImprovement) ? feedback.areasForImprovement : [],
      specificInsights: {
        communicationStyle: feedback.specificInsights?.communicationStyle || 'Communication assessed',
        technicalDepth: feedback.specificInsights?.technicalDepth || 'Technical knowledge evaluated',
        problemApproach: feedback.specificInsights?.problemApproach || 'Problem-solving reviewed',
        interviewPresence: feedback.specificInsights?.interviewPresence || 'Interview presence noted'
      },
      recommendation: feedback.recommendation || 'Requires further review',
      evaluationBasis: feedback.evaluationBasis || 'Evaluation based on standard interview assessment criteria',
      securityAnalysis: feedback.securityAnalysis || null,
      generatedAt: new Date(),
      forHROnly: true
    };

    return validatedFeedback;

  } catch (error) {
    console.error('Interview feedback generation error:', error);

    // Return default feedback if AI fails
    return {
      scores: {
        communicationSkills: 50,
        technicalKnowledge: 50,
        problemSolving: 50,
        confidence: 50,
        overallPerformance: 50
      },
      detailedAnalysis: 'Automated feedback generation encountered an error. Manual review required for comprehensive assessment.',
      keyStrengths: ['Interview completed successfully'],
      areasForImprovement: ['Requires manual evaluation'],
      specificInsights: {
        communicationStyle: 'Manual review needed',
        technicalDepth: 'Manual review needed',
        problemApproach: 'Manual review needed',
        interviewPresence: 'Manual review needed'
      },
      recommendation: 'Manual review required due to technical issues',
      evaluationBasis: 'Standard evaluation criteria: Communication Skills, Technical Knowledge, Problem Solving, Confidence, and Overall Performance',
      generatedAt: new Date(),
      forHROnly: true,
      error: true
    };
  }
}

// Enhanced monitoring data analysis with professional red flag assessment
function analyzeMonitoringData(monitoringData) {
  if (!monitoringData || !monitoringData.summary) {
    return null;
  }

  const summary = monitoringData.summary;
  const anomalies = monitoringData.anomalies || [];
  const redFlags = monitoringData.redFlags || [];
  const securityAlerts = monitoringData.securityAlerts || {};

  // Professional integrity score calculation
  let integrityScore = summary.overallSecurityScore || 100;

  // If no security score available, calculate from raw data
  if (!summary.overallSecurityScore) {
    integrityScore = 100;

    // Critical penalties for identity fraud
    if (securityAlerts.identityFraudSuspected) {
      integrityScore -= 60; // Major penalty for suspected fraud
    }

    // Major penalties for verification failures
    integrityScore -= (securityAlerts.criticalCount || 0) * 40; // Critical alerts: -40 each
    integrityScore -= (securityAlerts.highCount || 0) * 20; // High alerts: -20 each
    integrityScore -= (securityAlerts.faceVerificationFailures || 0) * 15; // Face failures: -15 each
    integrityScore -= (securityAlerts.voiceVerificationFailures || 0) * 15; // Voice failures: -15 each

    // Medium penalties for traditional anomalies
    integrityScore -= (summary.personSwitches || 0) * 30; // Person switches: -30 each
    integrityScore -= (summary.voiceAnomalies || 0) * 10; // Voice anomalies: -10 each
    integrityScore -= (summary.faceDeviations || 0) * 8; // Face deviations: -8 each

    // Minor penalties
    integrityScore -= (summary.environmentChanges || 0) * 5; // Environment changes: -5 each
    integrityScore -= (summary.clothingChanges || 0) * 3; // Clothing changes: -3 each

    integrityScore = Math.max(0, integrityScore); // Don't go below 0
  }

  // Professional red flag categorization
  const professionalRedFlags = [];
  const criticalSecurityIssues = [];

  // Process professional red flags from monitoring system
  if (redFlags && redFlags.length > 0) {
    redFlags.forEach(flag => {
      switch (flag.type) {
        case 'IDENTITY_FRAUD_SUSPECTED':
          criticalSecurityIssues.push('IDENTITY_FRAUD_SUSPECTED');
          professionalRedFlags.push(`CRITICAL: ${flag.details}`);
          break;
        case 'FACE_VERIFICATION_FAILED':
          professionalRedFlags.push(`Face Authentication Failed: ${flag.details}`);
          break;
        case 'VOICE_VERIFICATION_FAILED':
          professionalRedFlags.push(`Voice Authentication Failed: ${flag.details}`);
          break;
        case 'VOICE_PATTERN_ANOMALY':
          professionalRedFlags.push(`Voice Pattern Change: ${flag.details}`);
          break;
        case 'ENVIRONMENT_CHANGE':
          professionalRedFlags.push(`Environment Anomaly: ${flag.details}`);
          break;
        case 'APPEARANCE_CHANGE':
          professionalRedFlags.push(`Appearance Change: ${flag.details}`);
          break;
        default:
          professionalRedFlags.push(`Security Alert: ${flag.details}`);
      }
    });
  }

  // Legacy red flag detection for backward compatibility
  if (summary.personSwitches > 0) {
    professionalRedFlags.push('PERSON_SWITCH_DETECTED');
    criticalSecurityIssues.push('PERSON_SWITCH_DETECTED');
  }

  if (summary.voiceAnomalies >= 3) {
    professionalRedFlags.push('MULTIPLE_VOICE_ANOMALIES');
  }

  if (summary.faceDeviations >= 5) {
    professionalRedFlags.push('FREQUENT_FACE_ISSUES');
  }

  if (summary.environmentChanges >= 3) {
    professionalRedFlags.push('ENVIRONMENT_MANIPULATION');
  }

  // Professional summary generation
  let summaryText = `Professional interview integrity monitoring completed. `;

  // Security overview
  summaryText += `Security Score: ${Math.round(integrityScore)}/100. `;
  summaryText += `Interview Integrity: ${summary.interviewIntegrity || 'UNKNOWN'}. `;

  // Red flag summary
  if (redFlags.length > 0) {
    summaryText += `${redFlags.length} security alert(s) detected. `;
  }

  if (anomalies.length > 0) {
    summaryText += `${anomalies.length} monitoring anomaly/anomalies recorded over ${Math.floor(summary.monitoringDuration / 60)} minutes. `;
  }

  // Critical issues
  if (securityAlerts.identityFraudSuspected) {
    summaryText += `⚠️ CRITICAL: Identity fraud suspected. `;
  }

  if (securityAlerts.criticalCount > 0) {
    summaryText += `${securityAlerts.criticalCount} critical security alert(s). `;
  }

  // Verification failures
  if (securityAlerts.faceVerificationFailures > 0) {
    summaryText += `${securityAlerts.faceVerificationFailures} face verification failure(s). `;
  }

  if (securityAlerts.voiceVerificationFailures > 0) {
    summaryText += `${securityAlerts.voiceVerificationFailures} voice verification failure(s). `;
  }

  // Traditional anomalies for legacy support
  if (summary.personSwitches > 0) {
    summaryText += `${summary.personSwitches} person switch(es) detected. `;
  }

  if (summary.voiceAnomalies > 0) {
    summaryText += `${summary.voiceAnomalies} voice anomalie(s). `;
  }

  if (summary.faceDeviations > 0) {
    summaryText += `${summary.faceDeviations} face deviation(s). `;
  }

  if (summary.environmentChanges > 0) {
    summaryText += `${summary.environmentChanges} environment change(s). `;
  }

  return {
    riskLevel: summary.riskLevel || 'medium',
    integrityScore: Math.round(integrityScore),
    securityScore: Math.round(integrityScore),
    interviewIntegrity: summary.interviewIntegrity || 'UNKNOWN',
    redFlags: professionalRedFlags,
    criticalSecurityIssues,
    summary: summaryText.trim(),

    // Enhanced anomaly mapping
    anomalies: anomalies.map(a => ({
      type: a.category || a.type,
      description: a.details?.description || `${a.type} anomaly`,
      severity: a.severity,
      timestamp: a.timestamp
    })),

    // Professional red flag details
    redFlagDetails: redFlags.map(flag => ({
      type: flag.type,
      details: flag.details,
      severity: flag.severity,
      timestamp: flag.timestamp
    })),

    // Security statistics
    securityStats: {
      totalRedFlags: redFlags.length,
      criticalAlerts: securityAlerts.criticalCount || 0,
      highAlerts: securityAlerts.highCount || 0,
      identityFraudSuspected: securityAlerts.identityFraudSuspected || false,
      faceVerificationFailures: securityAlerts.faceVerificationFailures || 0,
      voiceVerificationFailures: securityAlerts.voiceVerificationFailures || 0
    },

    // Legacy support
    personSwitches: summary.personSwitches || 0,
    voiceAnomalies: summary.voiceAnomalies || 0,
    faceDeviations: summary.faceDeviations || 0,
    environmentChanges: summary.environmentChanges || 0,
    clothingChanges: summary.clothingChanges || 0
  };
}
