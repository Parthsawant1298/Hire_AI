// app/api/candidates/[candidateId]/export-pdf/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Application } from '@/models/job';

export async function GET(request, { params }) {
  try {
    // Verify host authentication
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { candidateId } = await params;
    await connectDB();

    // Get candidate application with feedback
    const application = await Application.findById(candidateId)
      .populate('userId', 'name email phone')
      .populate('jobId', 'jobTitle company');

    if (!application) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Generate HTML content for PDF
    const htmlContent = generateFeedbackHTML(application);

    // Since we don't have puppeteer, return HTML that can be converted to PDF on frontend
    return NextResponse.json({
      success: true,
      candidate: {
        name: application.userId.name,
        email: application.userId.email,
        jobTitle: application.jobId.jobTitle,
        company: application.jobId.company
      },
      htmlContent,
      feedbackData: {
        atsScore: application.atsScore,
        finalScore: application.finalScore,
        voiceInterviewScore: application.voiceInterviewScore,
        voiceInterviewFeedback: application.voiceInterviewFeedback,
        aiAnalysis: application.aiAnalysis,
        status: application.status,
        appliedAt: application.createdAt,
        interviewCompletedAt: application.interviewCompletedAt
      }
    });

  } catch (error) {
    console.error('Export PDF error:', error);
    return NextResponse.json(
      { error: 'Failed to export candidate data' },
      { status: 500 }
    );
  }
}

function generateFeedbackHTML(application) {
  const candidate = application.userId;
  const job = application.jobId;
  const feedback = application.voiceInterviewFeedback;
  const aiAnalysis = application.aiAnalysis;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Candidate Evaluation Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin: 0; }
            .header p { color: #666; margin: 5px 0; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-item { padding: 15px; background: #f8fafc; border-radius: 8px; }
            .info-item h3 { margin: 0 0 10px 0; color: #374151; }
            .score-card { display: inline-block; padding: 20px; margin: 10px; background: #f0f9ff; border-radius: 12px; text-align: center; min-width: 120px; }
            .score-card .score { font-size: 36px; font-weight: bold; color: #2563eb; }
            .score-card .label { color: #6b7280; font-size: 14px; }
            .feedback-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .feedback-item { padding: 15px; background: #fefefe; border: 1px solid #e5e7eb; border-radius: 8px; }
            .feedback-item h4 { margin: 0 0 8px 0; color: #374151; }
            .feedback-item .percentage { font-size: 24px; font-weight: bold; color: #059669; }
            .strengths, .weaknesses { padding: 15px; background: #f9fafb; border-radius: 8px; margin: 10px 0; }
            .strengths h4 { color: #059669; }
            .weaknesses h4 { color: #dc2626; }
            ul { padding-left: 20px; }
            li { margin-bottom: 5px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Candidate Evaluation Report</h1>
            <p><strong>${candidate.name}</strong> - ${candidate.email}</p>
            <p>Position: ${job.jobTitle} at ${job.company}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
            <h2>Overall Performance Scores</h2>
            <div style="text-align: center;">
                <div class="score-card">
                    <div class="score">${application.atsScore || 0}%</div>
                    <div class="label">ATS Score</div>
                </div>
                <div class="score-card">
                    <div class="score">${application.voiceInterviewScore || 0}%</div>
                    <div class="label">Interview Score</div>
                </div>
                <div class="score-card">
                    <div class="score">${application.finalScore || 0}%</div>
                    <div class="label">Final Score</div>
                </div>
            </div>
        </div>

        ${feedback ? `
        <div class="section">
            <h2>Voice Interview Analysis</h2>
            <div class="feedback-grid">
                <div class="feedback-item">
                    <h4>Communication Skills</h4>
                    <div class="percentage">${feedback.communicationSkills}%</div>
                </div>
                <div class="feedback-item">
                    <h4>Technical Knowledge</h4>
                    <div class="percentage">${feedback.technicalKnowledge}%</div>
                </div>
                <div class="feedback-item">
                    <h4>Problem Solving</h4>
                    <div class="percentage">${feedback.problemSolving}%</div>
                </div>
                <div class="feedback-item">
                    <h4>Confidence Level</h4>
                    <div class="percentage">${feedback.confidence}%</div>
                </div>
            </div>
            
            ${feedback.detailedFeedback ? `
            <div class="info-item">
                <h3>Detailed Interview Feedback</h3>
                <p>${feedback.detailedFeedback}</p>
            </div>
            ` : ''}
            
            <div class="info-grid">
                <div class="info-item">
                    <h3>Interview Duration</h3>
                    <p>${feedback.interviewDuration || 'N/A'} minutes</p>
                </div>
                <div class="info-item">
                    <h3>Questions Answered</h3>
                    <p>${feedback.answeredQuestions || 0} of ${feedback.totalQuestions || 0}</p>
                </div>
            </div>
        </div>
        ` : ''}

        ${aiAnalysis ? `
        <div class="section">
            <h2>Resume Analysis</h2>
            <div class="info-grid">
                <div class="info-item">
                    <h3>Skills Match</h3>
                    <p><strong>${aiAnalysis.skillsMatch || 0}%</strong></p>
                </div>
                <div class="info-item">
                    <h3>Experience Match</h3>
                    <p><strong>${aiAnalysis.experienceMatch || 0}%</strong></p>
                </div>
            </div>
            
            ${aiAnalysis.strengths && aiAnalysis.strengths.length > 0 ? `
            <div class="strengths">
                <h4>Key Strengths</h4>
                <ul>
                    ${aiAnalysis.strengths.map(strength => `<li>${strength}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${aiAnalysis.weaknesses && aiAnalysis.weaknesses.length > 0 ? `
            <div class="weaknesses">
                <h4>Areas for Improvement</h4>
                <ul>
                    ${aiAnalysis.weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <div class="section">
            <h2>Application Timeline</h2>
            <div class="info-grid">
                <div class="info-item">
                    <h3>Application Status</h3>
                    <p><strong>${application.status.replace('_', ' ').toUpperCase()}</strong></p>
                </div>
                <div class="info-item">
                    <h3>Applied Date</h3>
                    <p>${new Date(application.createdAt).toLocaleDateString()}</p>
                </div>
                ${application.interviewCompletedAt ? `
                <div class="info-item">
                    <h3>Interview Completed</h3>
                    <p>${new Date(application.interviewCompletedAt).toLocaleDateString()}</p>
                </div>
                ` : ''}
            </div>
        </div>
    </body>
    </html>
  `;
}
