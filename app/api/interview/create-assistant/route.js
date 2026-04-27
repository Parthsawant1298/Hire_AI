// API route to create interview-specific VAPI assistant
import { createVAPIAssistant } from '@/lib/vapi-service';
import connectDB from '@/lib/mongodb';
import { Job } from '@/models/job';

export async function POST(request) {
  try {
    const { jobId } = await request.json();
    
    console.log('Creating interview assistant for job:', jobId);
    
    if (!jobId) {
      throw new Error('Missing required field: jobId');
    }

    // Connect to database and get the actual job data
    await connectDB();
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    console.log('Found job:', {
      title: job.jobTitle,
      questionsCount: job.interviewQuestions?.length || 0,
      duration: job.voiceInterviewDuration
    });

    // Ensure we have interview questions
    if (!job.interviewQuestions || job.interviewQuestions.length === 0) {
      throw new Error('Job has no interview questions configured');
    }

    // Create VAPI assistant with the actual job data
    const assistant = await createVAPIAssistant({
      jobTitle: job.jobTitle,
      questions: job.interviewQuestions,
      duration: job.voiceInterviewDuration || 15
    });
    
    console.log('Interview assistant created successfully:', assistant.id);
    
    return Response.json({ 
      success: true, 
      assistant: assistant,
      assistantId: assistant.id,
      jobTitle: job.jobTitle,
      questionsCount: job.interviewQuestions.length
    });
    
  } catch (error) {
    console.error('Create interview assistant API error:', error);
    
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}