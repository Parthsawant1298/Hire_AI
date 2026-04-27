
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function injectMockInterview(jobId, email) {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Dynamic models
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Application = mongoose.model('Application', new mongoose.Schema({}, { strict: false }));
        
        console.log(`🔍 Finding user ${email}...`);
        const user = await User.findOne({ email });
        if (!user) throw new Error('User not found');

        console.log(`🔍 Finding application for job ${jobId}...`);
        const app = await Application.findOne({ 
            jobId: new mongoose.Types.ObjectId(jobId), 
            userId: user._id 
        });
        if (!app) throw new Error('Application not found');

        console.log('💉 Injecting mock interview results...');
        
        app.voiceInterviewCompleted = true;
        app.voiceInterviewScore = 85;
        app.status = 'interview_completed';
        app.voiceTranscript = "AI: Hello, tell me about yourself.\nCandidate: I am an expert in Machine Learning.\nAI: Great, what is overfitting?\nCandidate: It is when a model learns the noise in training data too well.";
        
        app.voiceInterviewFeedback = {
            communicationSkills: 90,
            technicalKnowledge: 85,
            problemSolving: 80,
            confidence: 95,
            overallPerformance: 85,
            detailedFeedback: "The candidate demonstrated strong understanding of core ML concepts and communicated effectively throughout the session.",
            interviewDuration: 420,
            answeredQuestions: 5,
            totalQuestions: 5
        };

        // Calculate final score correctly (30% ATS + 70% Voice)
        const resumeScore = app.atsScore || 75;
        app.finalScore = Math.round((resumeScore * 0.3) + (85 * 0.7));

        await app.save();
        
        console.log('✅ Mock data injected successfully!');
        console.log('📊 New Final Score:', app.finalScore);
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Get args from command line
const jobId = process.argv[2];
const email = process.argv[3];

if (!jobId || !email) {
    console.log('Usage: node inject-mock.js <jobId> <email>');
    process.exit(1);
}

injectMockInterview(jobId, email);
