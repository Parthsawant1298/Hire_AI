// app/api/jobs/[jobId]/apply/route.js - CORRECTED VERSION
import { NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import User from '@/models/user';
import Host from '@/models/host';
import { analyzeResume } from '@/lib/ai-services';
import { sendShortlistEmail, sendRejectionEmail, sendApplicationConfirmationEmail } from '@/lib/email-service';
import { extractTextFromPDF, extractHyperlinksFromPDF } from '@/lib/pdf-utils';

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
    let embeddedLinks = [];

    try {
      resumeText = await extractTextFromPDF(buffer, resumeFile.type);
      console.log(`📝 Extracted ${resumeText.length} characters from resume`);

      // Extract embedded hyperlinks if PDF
      if (resumeFile.type === 'application/pdf') {
        embeddedLinks = await extractHyperlinksFromPDF(buffer);
        console.log(`🔗 Found ${embeddedLinks.length} embedded hyperlinks in PDF`);
      }
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

    // EXTRACT STRUCTURED DATA FROM RESUME using Gemini 2.5 Flash
    console.log('🔍 Extracting structured data from resume with Gemini 2.5 Flash...');
    let extractedData = null;

    try {
      const { extractResumeData } = await import('@/lib/resume-extraction');
      // Pass extracted hyperlinks to resume extraction service
      extractedData = await extractResumeData(resumeText, uploadResult.secure_url, embeddedLinks);
      console.log('✅ Resume data extraction completed');
      console.log(`📋 Extracted: ${extractedData.personalInfo?.fullName}, ${extractedData.personalInfo?.email}, ${extractedData.skills?.technical?.length || 0} skill categories`);
    } catch (extractionError) {
      console.warn('⚠️ Resume data extraction failed, proceeding with basic analysis:', extractionError.message);
      // Continue without extracted data - AI analysis will work with text only
    }

    // RUN VERIFICATION (GitHub, LinkedIn, Experience, Certifications)
    console.log('🔍 Starting resume verification (authenticity check)...');
    let verificationResult = null;

    if (extractedData) {
      try {
        const { verifyResume } = await import('@/lib/verification');

        // Determine role for verification (map job title to verification roles)
        let verificationRole = 'General';
        const jobTitleLower = job.jobTitle?.toLowerCase() || '';

        if (jobTitleLower.includes('ai') || jobTitleLower.includes('ml') || jobTitleLower.includes('machine learning')) {
          verificationRole = 'AIML';
        } else if (jobTitleLower.includes('devops') || jobTitleLower.includes('sre') || jobTitleLower.includes('infrastructure')) {
          verificationRole = 'DevOps';
        } else if (jobTitleLower.includes('developer') || jobTitleLower.includes('engineer') || jobTitleLower.includes('software')) {
          verificationRole = 'SDE';
        }

        verificationResult = await verifyResume(extractedData, verificationRole);

        console.log(`✅ Verification completed: Score ${verificationResult.overallScore}/100 - ${verificationResult.verdict}`);
        console.log(`   GitHub: ${verificationResult.scoreBreakdown.github.score}/${verificationResult.scoreBreakdown.github.max}`);
        console.log(`   Experience: ${verificationResult.scoreBreakdown.experience.score}/${verificationResult.scoreBreakdown.experience.max}`);
        console.log(`   LinkedIn: ${verificationResult.scoreBreakdown.linkedin.score}/${verificationResult.scoreBreakdown.linkedin.max}`);

        // Log red flags if any
        if (verificationResult.verifications.experience?.summary) {
          const expSummary = verificationResult.verifications.experience.summary;
          if (expSummary.virtual > 0) {
            console.warn(`   ⚠️ Virtual internships detected: ${expSummary.virtual}`);
          }
          if (expSummary.suspicious > 0) {
            console.warn(`   🚩 Suspicious companies: ${expSummary.suspicious}`);
          }
        }
      } catch (verificationError) {
        console.warn('⚠️ Verification failed, continuing without verification:', verificationError.message);
      }
    } else {
      console.log('⏭️ Skipping verification (no extracted data available)');
    }

    // Analyze resume with REAL AI (enhanced with extracted data)
    console.log('🤖 Starting AI resume analysis with extracted data...');
    let aiAnalysis;

    try {
      aiAnalysis = await analyzeResume({
        resumeText,
        jobDescription: job.jobDescription,
        jobRequirements: job.jobRequirements,
        jobTitle: job.jobTitle,
        jobLocation: job.location,
        jobSalary: job.salary,
        jobType: job.jobType,
        extractedData: extractedData, // Pass extracted data for enhanced analysis
        verificationResult: verificationResult // Pass verification results
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

    // Create application with REAL AI scores, extracted data, and verification results
    const application = await Application.create({
      jobId: jobId,
      userId: user._id,
      resumeUrl: uploadResult.secure_url,
      resumeFilename: resumeFile.name,
      coverLetter: coverLetter,
      extractedData: extractedData, // Store extracted resume data
      verificationResult: verificationResult, // Store verification results (GitHub, LinkedIn, experience, certs)
      atsScore: aiAnalysis.atsScore,
      aiAnalysis: aiAnalysis,
      status: 'applied',
      aiRecommendation: 'pending' // Will be set after ranking
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

    // Check if we've reached target applications - trigger auto-ranking
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

    // Auto-close and AUTO-RANK when target reached
    if (updatedJob.currentApplications >= updatedJob.targetApplications) {
      await Job.findByIdAndUpdate(jobId, {
        status: 'closed'
      });

      console.log(`🎯 Target applications reached! Auto-ranking and auto-shortlisting candidates...`);

      // AUTOMATICALLY RANK AND SHORTLIST ALL APPLICATIONS USING INDUSTRY-STANDARD COMPOSITE SCORING
      try {
        const { calculateCompositeScore } = await import('@/lib/ai-services');
        const { sendShortlistEmail, sendRejectionEmail } = await import('@/lib/email-service');

        const allApplications = await Application.find({ jobId })
          .populate('userId', 'email name')
          .exec();

        // Calculate composite score for each application
        const applicationsWithCompositeScore = allApplications.map(app => {
          const compositeScore = calculateCompositeScore(app); // Pass full app, not just aiAnalysis
          return {
            application: app,
            compositeScore: compositeScore
          };
        });

        // Sort by composite score (considers ATS, skills, experience, overall fit)
        applicationsWithCompositeScore.sort((a, b) => b.compositeScore - a.compositeScore);

        const shortlistCount = updatedJob.firstRoundShortlist || 50; // Top N for voice interview

        console.log(`\n📊 RANKING ${allApplications.length} APPLICATIONS (Top ${shortlistCount} shortlisted for voice interview):`);
        console.log(`─────────────────────────────────────────────────────────────────`);

        // Track shortlisted and rejected for email sending
        const shortlistedApps = [];
        const rejectedApps = [];

        // Rank and update each application
        const updatePromises = applicationsWithCompositeScore.map((item, index) => {
          const ranking = index + 1;
          const app = item.application;

          // AUTO-REJECT if composite score is 0 (location/salary incompatible) OR below shortlist threshold
          let aiRecommendation, status;
          if (item.compositeScore === 0) {
            aiRecommendation = 'rejected';
            status = 'rejected';
            rejectedApps.push({ app, ranking, reason: 'Location/Salary Incompatible' });
            console.log(`   ${ranking}. [REJECTED] ${app.userId?.email || 'Unknown'} - Score: 0% (Location/Salary Incompatible)`);
          } else if (ranking <= shortlistCount) {
            aiRecommendation = 'shortlisted';
            status = 'shortlisted';
            shortlistedApps.push({ app, ranking });
            console.log(`   ${ranking}. [SHORTLISTED] ${app.userId?.email || 'Unknown'} - Composite: ${item.compositeScore.toFixed(2)}% (ATS: ${app.atsScore}%, Skills: ${app.aiAnalysis?.skillsMatch}%, Exp: ${app.aiAnalysis?.experienceMatch}%)`);
          } else {
            aiRecommendation = 'rejected';
            status = 'rejected';
            rejectedApps.push({ app, ranking, reason: 'Below cutoff score' });
            console.log(`   ${ranking}. [REJECTED] ${app.userId?.email || 'Unknown'} - Composite: ${item.compositeScore.toFixed(2)}% (Below cutoff)`);
          }

          return Application.findByIdAndUpdate(
            app._id,
            {
              ranking,
              aiRecommendation,
              status,
              compositeScore: item.compositeScore // Save for transparency
            },
            { new: true }
          );
        });

        await Promise.all(updatePromises);

        console.log(`─────────────────────────────────────────────────────────────────`);

        // Calculate statistics
        const avgCompositeScore = allApplications.length > 0
          ? applicationsWithCompositeScore.reduce((sum, item) => sum + item.compositeScore, 0) / allApplications.length
          : 0;

        // Mark job as ranked
        await Job.findByIdAndUpdate(jobId, {
          rankedApplications: true,
          averageAtsScore: Math.round(
            allApplications.reduce((sum, app) => sum + app.atsScore, 0) / allApplications.length
          ),
          averageCompositeScore: Math.round(avgCompositeScore * 100) / 100
        });

        console.log(`✅ Auto-ranking complete using COMPOSITE SCORING:`);
        console.log(`   • ${shortlistedApps.length} SHORTLISTED (Top performers - will receive voice interview link)`);
        console.log(`   • ${rejectedApps.length} REJECTED (Below cutoff or incompatible)`);
        console.log(`   • Average Composite Score: ${avgCompositeScore.toFixed(2)}%`);
        console.log(`   • Method: 35% ATS + 30% Skills + 25% Experience + 10% Overall Fit`);

        // AUTO-SEND EMAILS TO SHORTLISTED AND REJECTED CANDIDATES
        console.log(`\n📧 Sending automated emails...`);

        const interviewLink = updatedJob.interviewLink || `${process.env.NEXTAUTH_URL}/interview/${jobId}`;

        // Send shortlist emails with voice interview link
        const shortlistEmailPromises = shortlistedApps.map(async ({ app, ranking }) => {
          try {
            await sendShortlistEmail({
              user: app.userId,
              job: updatedJob,
              interviewLink,
              ranking
            });
            console.log(`   ✅ Shortlist email sent to ${app.userId.email} (Rank #${ranking})`);
          } catch (emailError) {
            console.error(`   ❌ Failed to send shortlist email to ${app.userId.email}:`, emailError.message);
          }
        });

        // Send rejection emails
        const rejectionEmailPromises = rejectedApps.map(async ({ app, ranking, reason }) => {
          try {
            await sendRejectionEmail({
              user: app.userId,
              job: updatedJob
            });
            console.log(`   ✅ Rejection email sent to ${app.userId.email} (Rank #${ranking}, Reason: ${reason})`);
          } catch (emailError) {
            console.error(`   ❌ Failed to send rejection email to ${app.userId.email}:`, emailError.message);
          }
        });

        // Send all emails in parallel
        await Promise.allSettled([...shortlistEmailPromises, ...rejectionEmailPromises]);

        console.log(`\n✅ Email automation complete:`);
        console.log(`   • ${shortlistedApps.length} shortlist emails sent (with voice interview link)`);
        console.log(`   • ${rejectedApps.length} rejection emails sent`);

      } catch (rankingError) {
        console.error('Auto-ranking/shortlisting failed:', rankingError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        _id: application._id,
        atsScore: application.atsScore,
        status: application.status
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Job application error:', error);

    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      console.error('Validation details:', {
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message,
          value: error.errors[key].value
        }))
      });

      return NextResponse.json(
        {
          error: 'Application data validation failed. Please try again.',
          details: 'There was an issue with the verification data format.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    );
  }
}