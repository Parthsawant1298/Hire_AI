// app/api/jobs/[jobId]/apply/route.js - CORRECTED VERSION
import { NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import User from '@/models/user';
import Host from '@/models/host';
import { analyzeResume } from '@/lib/ai-services';
import { sendShortlistEmail, sendRejectionEmail, sendApplicationConfirmationEmail } from '@/lib/email-service';
import { extractTextFromPDF } from '@/lib/pdf-utils';

export async function POST(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Get job details with host info
    const job = await Job.findById(jobId).populate('hostId', 'name email organization');
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if applications are still open
    if (job.currentApplications >= job.targetApplications) {
      return NextResponse.json(
        { error: 'Application slots are full' },
        { status: 400 }
      );
    }

    if (job.status !== 'published') {
      return NextResponse.json(
        { error: 'Job is not accepting applications' },
        { status: 400 }
      );
    }

    if (new Date() > job.applicationDeadline) {
      return NextResponse.json(
        { error: 'Application deadline has passed' },
        { status: 400 }
      );
    }

    // Check if user already applied
    const existingApplication = await Application.findOne({
      jobId: jobId,
      userId: user._id
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied for this job' },
        { status: 400 }
      );
    }

    // Process form data
    const formData = await request.formData();
    const resumeFile = formData.get('resume');
    const coverLetter = formData.get('coverLetter')?.trim();

    if (!resumeFile) {
      return NextResponse.json(
        { error: 'Resume is required' },
        { status: 400 }
      );
    }

    // Validate resume file
    if (resumeFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Resume file size must be less than 10MB' },
        { status: 400 }
      );
    }

    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(resumeFile.type)) {
      return NextResponse.json(
        { error: 'Only PDF and Word documents are allowed' },
        { status: 400 }
      );
    }

    // Upload resume to Cloudinary
    const { uploadToCloudinary } = await import('@/lib/cloudinary');
    const bytes = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadResult = await uploadToCloudinary(buffer, resumeFile.name, 'resumes');

    // Extract text from resume for AI analysis
    console.log('📄 Extracting text from resume...');
    let resumeText;
    
    try {
      resumeText = await extractTextFromPDF(buffer, resumeFile.type);
      console.log(`📝 Extracted ${resumeText.length} characters from resume`);
    } catch (extractionError) {
      console.error('❌ Text extraction failed:', extractionError.message);
      
      // Handle specific extraction errors
      if (extractionError.message.includes('PDF_EMPTY')) {
        return NextResponse.json(
          { error: 'Your PDF appears to be empty or contains only scanned images. Please upload a text-based PDF or convert your resume to Word format (.docx).' },
          { status: 400 }
        );
      }
      
      if (extractionError.message.includes('PDF_PARSE_ERROR')) {
        return NextResponse.json(
          { error: 'Unable to read your PDF file. The file may be corrupted or password-protected. Please try uploading a Word document (.docx) instead.' },
          { status: 400 }
        );
      }
      
      // Generic extraction error
      return NextResponse.json(
        { error: 'Failed to extract text from your resume. Please try uploading a Word document (.docx) instead.' },
        { status: 400 }
      );
    }

    // Analyze resume with REAL AI (no fallbacks!)
    console.log('🤖 Starting AI resume analysis...');
    let aiAnalysis;
    
    try {
      aiAnalysis = await analyzeResume({
        resumeText,
        jobDescription: job.jobDescription,
        jobRequirements: job.jobRequirements,
        jobTitle: job.jobTitle
      });
      
      console.log(`✅ AI analysis completed: ATS Score ${aiAnalysis.atsScore}%`);
    } catch (analysisError) {
      console.error('❌ AI analysis failed:', analysisError);
      
      // Provide specific error messages to user
      if (analysisError.message.includes('PDF_EXTRACTION_FAILED')) {
        return NextResponse.json(
          { error: 'Unable to read your PDF resume. Please upload a text-based PDF or Word document (.docx).' },
          { status: 400 }
        );
      }
      
      if (analysisError.message.includes('INSUFFICIENT_CONTENT')) {
        return NextResponse.json(
          { error: 'Your resume appears to be empty or too short. Please upload a complete resume.' },
          { status: 400 }
        );
      }
      
      if (analysisError.message.includes('AI_ANALYSIS_FAILED')) {
        return NextResponse.json(
          { error: 'AI analysis service is temporarily unavailable. Please try again in a moment.' },
          { status: 503 }
        );
      }
      
      // Generic error
      return NextResponse.json(
        { error: 'Failed to analyze resume. Please try again or contact support.' },
        { status: 500 }
      );
    }

    // Create application with REAL AI scores (no fake data!)
    const application = await Application.create({
      jobId: jobId,
      userId: user._id,
      resumeUrl: uploadResult.secure_url,
      resumeFilename: resumeFile.name,
      coverLetter: coverLetter,
      atsScore: aiAnalysis.atsScore,
      aiAnalysis: aiAnalysis,
      finalScore: aiAnalysis.overallFit,
      status: 'applied'
    });
    
    console.log(`✅ Application created for user ${user.email} with ATS score ${aiAnalysis.atsScore}%`);

    // Update job application count
    await Job.findByIdAndUpdate(jobId, { 
      $inc: { currentApplications: 1 }
    });

    // Send application confirmation email
    try {
      await sendApplicationConfirmationEmail({
        user: user,
        job: job
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    // Check if we've reached target applications and trigger shortlisting
    const updatedJob = await Job.findById(jobId).populate('hostId');
    
    // Send host notification email for new application
    try {
      const { sendHostApplicationNotificationEmail } = await import('@/lib/email-service');
      await sendHostApplicationNotificationEmail({
        host: job.hostId,
        job: updatedJob || job,
        newApplicationsCount: 1
      });
    } catch (emailError) {
      console.error('Failed to send host notification email:', emailError);
    }
    if (updatedJob.currentApplications >= updatedJob.targetApplications) {
      // Update job status to applications_closed
      await Job.findByIdAndUpdate(jobId, { 
        status: 'applications_closed' 
      });
      
      // Trigger shortlisting process asynchronously
      processShortlisting(jobId).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        _id: application._id,
        atsScore: application.atsScore,
        finalScore: application.finalScore,
        status: application.status
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Job application error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    );
  }
}

// FIXED: Process shortlisting when target applications reached
async function processShortlisting(jobId) {
  try {
    console.log('Starting shortlisting process for job:', jobId);
    
    const job = await Job.findById(jobId).populate('hostId');
    if (!job) {
      console.error('Job not found for shortlisting:', jobId);
      return;
    }

    // Ensure job has interview link
    if (!job.interviewLink) {
      console.error('Job missing interview link:', jobId);
      return;
    }

    // Get all applications for this job, sorted by final score
    const applications = await Application.find({ jobId })
      .populate('userId', 'name email phone')
      .sort({ finalScore: -1, atsScore: -1, createdAt: 1 });

    if (applications.length === 0) {
      console.log('No applications found for job:', jobId);
      return;
    }

    // Select top candidates for shortlist
    const shortlistedApps = applications.slice(0, job.maxCandidatesShortlist);
    const rejectedApps = applications.slice(job.maxCandidatesShortlist);

    console.log(`Shortlisting ${shortlistedApps.length} candidates, rejecting ${rejectedApps.length}`);

    // Update shortlisted applications and send emails
    for (let i = 0; i < shortlistedApps.length; i++) {
      const app = shortlistedApps[i];
      
      // Update application status
      app.status = 'shortlisted';
      app.ranking = i + 1;
      await app.save();

      // Send shortlist email with interview link
      try {
        await sendShortlistEmail({
          user: app.userId,
          job: job,
          interviewLink: job.interviewLink,
          ranking: i + 1
        });
        
        app.shortlistEmailSent = true;
        await app.save();
        
        console.log(`Shortlist email sent to ${app.userId.email}`);
      } catch (emailError) {
        console.error(`Failed to send shortlist email to ${app.userId.email}:`, emailError);
      }
    }

    // Update rejected applications and send emails
    for (const app of rejectedApps) {
      app.status = 'rejected';
      await app.save();

      // Send rejection email
      try {
        await sendRejectionEmail({
          user: app.userId,
          job: job
        });
        
        app.rejectionEmailSent = true;
        await app.save();
        
        console.log(`Rejection email sent to ${app.userId.email}`);
      } catch (emailError) {
        console.error(`Failed to send rejection email to ${app.userId.email}:`, emailError);
      }
    }

    // Update job with shortlisted candidates and status
    job.shortlistedCandidates = shortlistedApps.map(app => app._id);
    job.status = 'interviews_active';
    await job.save();

    console.log(`Shortlisting completed for job ${jobId}. Selected ${shortlistedApps.length} candidates.`);

  } catch (error) {
    console.error('Shortlisting process error:', error);
  }
}