
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Import models
// Note: We need to define them here or point to them correctly
// Since this is a scratch script, I'll just use a direct connection
async function test() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const jobId = '69ef70b444f543cc34519b8d'; // From user logs
        
        const Application = mongoose.model('Application', new mongoose.Schema({}, { strict: false }));
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        
        const apps = await Application.find({ voiceInterviewCompleted: true })
            .sort({ createdAt: -1 });
        
        console.log(`Found ${apps.length} completed interviews`);
        
        if (apps.length > 0) {
            const app = apps[0];
            const user = await User.findById(app.userId);
            console.log('--- APPLICATION DATA ---');
            console.log('ID:', app._id);
            console.log('Job ID:', app.jobId);
            console.log('User Email:', user?.email || 'Unknown');
            console.log('Status:', app.status);
            console.log('Voice Interview Completed:', app.voiceInterviewCompleted);
            console.log('Voice Interview Score:', app.voiceInterviewScore);
            console.log('Final Score:', app.finalScore);
            console.log('ATS Score:', app.atsScore);
            console.log('Feedback Object:', JSON.stringify(app.voiceInterviewFeedback, null, 2));
            console.log('------------------------');
        } else {
            console.log('No applications found.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
