// Test just the question generation with the fixed AI services
import { generateInterviewQuestions } from './lib/ai-services.js';

async function testQuestionGeneration() {
  console.log('🧪 Testing generateInterviewQuestions from ai-services...');
  
  try {
    const questions = await generateInterviewQuestions({
      jobTitle: 'Frontend Developer',
      jobDescription: 'Build user interfaces with React',
      jobRequirements: 'React, JavaScript, CSS',
      jobType: 'job',
      interviewDuration: 10
    });

    console.log('✅ SUCCESS! Generated questions:');
    console.log('Questions count:', questions.length);
    questions.forEach((q, i) => {
      console.log(`${i + 1}. [${q.type.toUpperCase()}] ${q.question}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testQuestionGeneration();