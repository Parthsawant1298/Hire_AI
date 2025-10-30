// Test webhook with dummy data
import fetch from 'node-fetch';

const testWebhook = async () => {
  console.log('🧪 Testing VAPI Webhook with Dummy Transcript...\n');

  const dummyPayload = {
    type: 'call-end',
    call: {
      id: 'test-call-' + Date.now(),
      transcript: `Interviewer: Hello! Thank you for joining us today. Can you tell me about yourself?

Candidate: Hi! Thank you for having me. I'm a software developer with 3 years of experience in full-stack development. I've worked primarily with React, Node.js, and MongoDB. I'm passionate about building user-friendly applications and solving complex problems.

Interviewer: Great! Can you describe a challenging project you've worked on?

Candidate: Sure! I recently worked on an e-commerce platform where we had to handle high traffic during sales. I implemented caching strategies using Redis and optimized database queries which reduced response time by 40%. It was challenging but very rewarding.

Interviewer: Excellent! How do you handle debugging in production?

Candidate: I use a combination of logging, monitoring tools like Sentry, and error tracking. I also believe in writing comprehensive tests to catch issues early. When production issues occur, I first replicate them in a staging environment before applying fixes.

Interviewer: What are your salary expectations?

Candidate: Based on my experience and market research, I'm looking for something in the range of $80,000 to $90,000 annually, but I'm open to discussion based on the complete compensation package.

Interviewer: Thank you! That concludes our interview. We'll get back to you soon.`,
      duration: 420,
      metadata: {
        jobId: 'YOUR_JOB_ID_HERE', // Replace with actual job ID
        userId: 'YOUR_USER_ID_HERE'  // Replace with actual user ID
      }
    }
  };

  try {
    console.log('📤 Sending request to webhook...');
    console.log('Transcript length:', dummyPayload.call.transcript.length, 'characters');
    
    const response = await fetch('http://localhost:3000/api/webhook/vapi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dummyPayload)
    });

    console.log('\n📥 Response status:', response.status, response.statusText);

    const result = await response.json();
    console.log('\n📊 Response data:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! AI Feedback Generated');
      console.log('📝 Application ID:', result.applicationId);
      console.log('🎯 Final Score:', result.finalScore);
    } else {
      console.log('\n❌ FAILED:', result.error);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️ Make sure Next.js server is running on port 3000');
      console.log('Run: npm run dev');
    }
  }
};

// Run the test
testWebhook();
