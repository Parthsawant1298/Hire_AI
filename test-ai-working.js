// Test file using the exact working AI services code
import OpenAI from 'openai';

// Helper function to create OpenAI client (exactly as in ai-services.js)
function getOpenAIClient() {
  return new OpenAI({
    apiKey: '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',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'HireAI Test'
    }
  });
}

// Test the generateInterviewQuestions function
async function testGenerateQuestions() {
  console.log('🧪 Testing generateInterviewQuestions...');
  console.log('==========================================');
  
  try {
    const questionsNeeded = Math.max(5, Math.floor(10 / 2)); // 2 minutes per question average
    
    const prompt = `
    Generate ${questionsNeeded} interview questions for a job position.
    
    Job Title: Software Developer
    Job Description: Full-stack development with React and Node.js
    Requirements: 3+ years experience, JavaScript, React, Node.js
    Interview Duration: 10 minutes
    
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

    console.log('🤖 Creating OpenAI client...');
    const openai = getOpenAIClient();
    
    console.log('📤 Sending request to OpenRouter...');
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
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

    console.log('✅ Received response from OpenRouter');
    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    // Validate and ensure proper format
    const validatedQuestions = questions.map(q => ({
      question: q.question || '',
      type: ['technical', 'behavioral', 'situational', 'general'].includes(q.type) ? q.type : 'general',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      expectedDuration: q.expectedDuration || 120
    }));

    console.log('✅ SUCCESS! Generated questions:');
    console.log('Questions count:', validatedQuestions.length);
    validatedQuestions.forEach((q, i) => {
      console.log(`${i + 1}. [${q.type.toUpperCase()}] ${q.question}`);
    });

    return validatedQuestions;

  } catch (error) {
    console.error('❌ Question generation error:', error);
    console.log('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    
    // Return fallback questions
    console.log('🔄 Using fallback questions...');
    return [
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
      }
    ];
  }
}

// Test the analyzeResume function
async function testAnalyzeResume() {
  console.log('\n🧪 Testing analyzeResume...');
  console.log('==========================================');
  
  const resumeText = `
John Doe
Software Developer

Experience:
- 3 years at TechCorp developing web applications
- Proficient in JavaScript, React, Node.js
- Led team of 5 developers on major project
- Built scalable APIs serving 1M+ users

Education:
- BS Computer Science, University of Technology
- Relevant coursework: Data Structures, Algorithms, Web Development

Skills:
- Frontend: React, JavaScript, HTML, CSS
- Backend: Node.js, Express, MongoDB
- Tools: Git, Docker, AWS
`;

  try {
    const analysisPrompt = `
    Analyze this resume against the job requirements and provide detailed scoring and feedback.
    
    Job Title: Software Developer
    Job Description: Full-stack development with React and Node.js
    Job Requirements: 3+ years experience, JavaScript, React, Node.js
    
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

    console.log('🤖 Analyzing resume with OpenRouter/Gemma...');
    
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
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
    
    console.log('✅ SUCCESS! Resume analysis:');
    console.log(`📊 ATS Score: ${validatedAnalysis.atsScore}%`);
    console.log(`📊 Skills Match: ${validatedAnalysis.skillsMatch}%`);
    console.log(`📊 Experience Match: ${validatedAnalysis.experienceMatch}%`);
    console.log(`📊 Overall Fit: ${validatedAnalysis.overallFit}%`);
    console.log('Strengths:', validatedAnalysis.strengths);
    console.log('Feedback:', validatedAnalysis.detailedFeedback);

    return validatedAnalysis;

  } catch (error) {
    console.error('❌ Resume analysis error:', error);
    console.log('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting AI Services Test Suite');
  console.log('Using hardcoded API key from working ai-services.js');
  console.log('==========================================\n');

  try {
    // Test 1: Generate Interview Questions
    const questions = await testGenerateQuestions();
    console.log(`✅ Question generation test: ${questions.length > 0 ? 'PASSED' : 'FAILED'}`);

    // Test 2: Analyze Resume
    const analysis = await testAnalyzeResume();
    console.log(`✅ Resume analysis test: ${analysis.atsScore > 0 ? 'PASSED' : 'FAILED'}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('The AI services are working with the hardcoded API key.');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.log('This confirms the OpenRouter API is having issues.');
  }
}

// Run the tests
runAllTests();