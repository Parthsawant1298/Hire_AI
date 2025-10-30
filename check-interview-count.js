// Quick script to check interview counts in database
// Try loading from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
  require('dotenv').config();
}

const mongoose = require('mongoose');

// If still not set, ask user
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env or .env.local');
  console.log('💡 Please set MONGODB_URI in your environment variables');
  console.log('   Current env vars:', Object.keys(process.env).filter(k => k.includes('MONGO')));
  process.exit(1);
}

async function checkCounts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models after connection
    const { Job, Application } = require('./models/job');

    // Get all jobs
    const jobs = await Job.find().select('jobTitle currentApplications completedInterviews shortlistedCandidates finalSelectedCandidates');

    console.log('📊 JOBS DATA:');
    console.log('='.repeat(80));
    
    for (const job of jobs) {
      console.log(`\n📌 Job: ${job.jobTitle}`);
      console.log(`   ID: ${job._id}`);
      console.log(`   Current Applications: ${job.currentApplications}`);
      console.log(`   Completed Interviews (DB field): ${job.completedInterviews}`);
      console.log(`   Shortlisted Count: ${job.shortlistedCandidates?.length || 0}`);
      console.log(`   Selected Count: ${job.finalSelectedCandidates?.length || 0}`);
      
      // Count actual completed interviews from applications
      const actualCompletedCount = await Application.countDocuments({
        jobId: job._id,
        voiceInterviewCompleted: true
      });
      
      console.log(`   ✅ Actual Completed Interviews (from Applications): ${actualCompletedCount}`);
      
      if (job.completedInterviews !== actualCompletedCount) {
        console.log(`   ⚠️  MISMATCH! DB shows ${job.completedInterviews} but actually ${actualCompletedCount} completed`);
        
        // Fix it
        console.log(`   🔧 Fixing count...`);
        await Job.findByIdAndUpdate(job._id, {
          completedInterviews: actualCompletedCount
        });
        console.log(`   ✅ Fixed! Updated to ${actualCompletedCount}`);
      }
      
      // Show some application details
      const applications = await Application.find({ jobId: job._id })
        .select('userId voiceInterviewCompleted voiceInterviewScore status')
        .populate('userId', 'name email');
      
      console.log(`\n   📝 Applications:`);
      applications.forEach((app, index) => {
        console.log(`      ${index + 1}. ${app.userId?.name || 'Unknown'} - ${app.status}`);
        console.log(`         Interview Completed: ${app.voiceInterviewCompleted ? '✅ YES' : '❌ NO'}`);
        if (app.voiceInterviewCompleted) {
          console.log(`         Interview Score: ${app.voiceInterviewScore || 0}%`);
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

checkCounts();
