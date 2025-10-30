// lib/email-service.js
import nodemailer from 'nodemailer';

// Fix: Use createTransport with proper SSL settings
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

// Send shortlist notification email
export async function sendShortlistEmail({ user, job, interviewLink, ranking }) {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: `Congratulations! You've been shortlisted for ${job.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">You've been shortlisted for the interview</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${user.name},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We're excited to inform you that you've been selected for the next round of our hiring process for the position of <strong>${job.jobTitle}</strong>.
            </p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0;">
              <h3 style="color: #007bff; margin: 0 0 10px 0;">Interview Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Position:</strong> ${job.jobTitle}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Your Ranking:</strong> #${ranking} out of ${job.maxCandidatesShortlist} selected candidates</p>
              <p style="margin: 5px 0; color: #555;"><strong>Interview Type:</strong> AI Voice Interview</p>
              <p style="margin: 5px 0; color: #555;"><strong>Duration:</strong> ${job.voiceInterviewDuration} minutes</p>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Your next step is to complete an AI-powered voice interview. This innovative interview process will assess your skills and fit for the role through natural conversation.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${interviewLink}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Start Your Interview
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Important Instructions:</h4>
              <ul style="color: #856404; margin: 0; padding-left: 20px;">
                <li>Ensure you have a stable internet connection</li>
                <li>Find a quiet environment for the interview</li>
                <li>Use a good quality microphone/headset</li>
                <li>Complete the interview within 7 days</li>
              </ul>
            </div>
            
            <p style="color: #555; line-height: 1.6;">
              If you have any questions or technical issues, please reply to this email or contact our support team.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>${job.hostId.name}</strong><br>
              ${job.hostId.organization}
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated email from HireAI Platform. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Shortlist email sent to ${user.email}`);

  } catch (error) {
    console.error('Send shortlist email error:', error);
    throw error;
  }
}

// Send rejection email
export async function sendRejectionEmail({ user, job }) {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: `Update on your application for ${job.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-bottom: 3px solid #007bff;">
            <h1 style="color: #333; margin: 0; font-size: 24px;">Application Update</h1>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${user.name},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Thank you for your interest in the <strong>${job.jobTitle}</strong> position and for taking the time to submit your application.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              After careful consideration of all applications, we have decided to move forward with other candidates whose qualifications more closely match our current requirements.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              This decision was not easy, as we received many strong applications. We encourage you to continue exploring opportunities with us and apply for future positions that match your skills and interests.
            </p>
            
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin: 0 0 10px 0;">Stay Connected</h3>
              <p style="margin: 5px 0; color: #555;">Keep an eye on our careers page for new opportunities that might be a great fit for your background.</p>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              We wish you the best in your job search and career endeavors.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>${job.hostId.name}</strong><br>
              ${job.hostId.organization}
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated email from HireAI Platform. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to ${user.email}`);

  } catch (error) {
    console.error('Send rejection email error:', error);
    throw error;
  }
}

// Send offer letter email
export async function sendOfferEmail({ user, job, offerDetails }) {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: `Job Offer - ${job.jobTitle} Position`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Job Offer!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Congratulations on your successful interview</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${user.name},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We are delighted to extend a formal offer of employment for the position of <strong>${job.jobTitle}</strong> with ${job.hostId.organization}.
            </p>
            
            <div style="background: #f1f8e9; border: 1px solid #c8e6c9; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2e7d32; margin: 0 0 15px 0;">Offer Details</h3>
              <p style="margin: 5px 0; color: #333;"><strong>Position:</strong> ${job.jobTitle}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Department:</strong> ${job.hostId.organization}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Start Date:</strong> ${offerDetails.startDate || 'To be discussed'}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Salary:</strong> ${offerDetails.salary || 'To be discussed'}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Employment Type:</strong> ${job.jobType === 'job' ? 'Full-time' : 'Internship'}</p>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We were impressed by your performance during the interview process and believe you will be a valuable addition to our team.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Please confirm your acceptance of this offer by replying to this email within 7 business days. We look forward to welcoming you to our team!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:${job.hostId.email}?subject=Job Offer Acceptance - ${job.jobTitle}" style="background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Accept Offer
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>${job.hostId.name}</strong><br>
              ${job.hostId.designation}<br>
              ${job.hostId.organization}
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated email from HireAI Platform. Please reply to accept the offer.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Offer email sent to ${user.email}`);

  } catch (error) {
    console.error('Send offer email error:', error);
    throw error;
  }
}

// Send application confirmation email
export async function sendApplicationConfirmationEmail({ user, job }) {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: `Application Received - ${job.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Application Received!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you for applying</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${user.name},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Thank you for your interest in the <strong>${job.jobTitle}</strong> position. We have successfully received your application.
            </p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0;">
              <h3 style="color: #007bff; margin: 0 0 10px 0;">Application Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Position:</strong> ${job.jobTitle}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Company:</strong> ${job.hostId.organization}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Application Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Job Type:</strong> ${job.jobType === 'job' ? 'Full-time Position' : 'Internship'}</p>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Our AI system is currently analyzing your resume against the job requirements. You will be notified if you are selected for the next round of the hiring process.
            </p>
            
            <div style="background: #e8f5e8; border: 1px solid #c3e6c3; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="color: #2d5a2d; margin: 0 0 10px 0;">What happens next?</h4>
              <ul style="color: #2d5a2d; margin: 0; padding-left: 20px;">
                <li>AI-powered resume analysis</li>
                <li>Candidate ranking and shortlisting</li>
                <li>Notification if selected for interview</li>
                <li>AI voice interview (if shortlisted)</li>
              </ul>
            </div>
            
            <p style="color: #555; line-height: 1.6;">
              We appreciate your patience during our selection process. If you have any questions, please feel free to contact us.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>${job.hostId.name}</strong><br>
              ${job.hostId.organization}
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated email from HireAI Platform. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Application confirmation email sent to ${user.email}`);

  } catch (error) {
    console.error('Send application confirmation email error:', error);
    throw error;
  }
}

// Send interview reminder email
export async function sendInterviewReminderEmail({ user, job, interviewLink }) {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: `Reminder: Complete your interview for ${job.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Interview Reminder</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Don't miss your opportunity</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${user.name},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              This is a friendly reminder that you have been shortlisted for the <strong>${job.jobTitle}</strong> position and your AI voice interview is still pending.
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #856404; margin: 0 0 10px 0;">⚡ Action Required</h3>
              <p style="margin: 5px 0; color: #856404;">Please complete your interview within the next 48 hours to secure your candidacy.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${interviewLink}" style="background: #ff9800; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Complete Interview Now
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              The interview will take approximately ${job.voiceInterviewDuration} minutes and can be completed at your convenience.
            </p>
            
            <p style="color: #555; line-height: 1.6;">
              If you're no longer interested in this position, please let us know so we can update our records.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>${job.hostId.name}</strong><br>
              ${job.hostId.organization}
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated reminder from HireAI Platform.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Interview reminder email sent to ${user.email}`);

  } catch (error) {
    console.error('Send interview reminder email error:', error);
    throw error;
  }
}
// Send interview completion email
export async function sendInterviewCompletionEmail({ user, job, finalScore, interviewScore }) {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: `Interview Completed - ${job.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎯 Interview Completed!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you for your time</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${user.name},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Thank you for completing the AI voice interview for the <strong>${job.jobTitle}</strong> position at ${job.hostId.organization}.
            </p>
            
            <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 20px; margin: 20px 0;">
              <h3 style="color: #4f46e5; margin: 0 0 15px 0;">Your Interview Performance</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                  <div style="font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 5px;">${interviewScore}%</div>
                  <div style="font-size: 12px; color: #6b7280;">Interview Score</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                  <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 5px;">${finalScore}%</div>
                  <div style="font-size: 12px; color: #6b7280;">Overall Score</div>
                </div>
              </div>
            </div>
            
            <div style="background: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #065f46; margin: 0 0 10px 0;">✅ What happens next?</h4>
              <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Our team will review your complete profile</li>
                <li>Interview results will be combined with your resume score</li>
                <li>Final hiring decisions will be made within 3-5 business days</li>
                <li>You'll receive an email notification with the outcome</li>
              </ul>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We appreciate the time you invested in this interview process. Your responses have been recorded and will be carefully evaluated by our hiring team.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL}/main" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                View Your Dashboard
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>${job.hostId.name}</strong><br>
              ${job.hostId.designation}<br>
              ${job.hostId.organization}
            </p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              This is an automated email from HireAI Platform. Your interview data is processed securely and confidentially.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Interview completion email sent to ${user.email}`);

  } catch (error) {
    console.error('Send interview completion email error:', error);
    throw error;
  }
}
// Send host notification email when job gets applications
export async function sendHostApplicationNotificationEmail({ host, job, newApplicationsCount }) {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: host.email,
      subject: `New Applications Received - ${job.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📋 New Applications!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your job posting is getting traction</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${host.name},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your job posting for <strong>${job.jobTitle}</strong> has received <strong>${newApplicationsCount} new applications</strong>.
            </p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0;">
              <h3 style="color: #28a745; margin: 0 0 10px 0;">Application Statistics</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Total Applications:</strong> ${job.currentApplications}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Target Applications:</strong> ${job.targetApplications}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Progress:</strong> ${Math.round((job.currentApplications / job.targetApplications) * 100)}%</p>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Our AI system is automatically analyzing and ranking candidates based on your job requirements. 
              ${job.currentApplications >= job.targetApplications ? 'Since you\'ve reached your target applications, the shortlisting process has begun!' : ''}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL}/host/jobs/${job._id}/applications" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                View Applications
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>HireAI Platform Team</strong>
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated notification from HireAI Platform.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Host notification email sent to ${host.email}`);

  } catch (error) {
    console.error('Send host notification email error:', error);
    throw error;
  }
}

// Test email configuration
export async function testEmailConfiguration() {
  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
}


// Send job cancellation email
export async function sendJobCancellationEmail({ user, job }) {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: `Job Cancelled - ${job.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 30px; text-align: center; border-bottom: 3px solid #6c757d;">
            <h1 style="color: #333; margin: 0; font-size: 24px;">Job Posting Cancelled</h1>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${user.name},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We regret to inform you that the job posting for <strong>${job.jobTitle}</strong> has been cancelled by the employer.
            </p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #6c757d; padding: 20px; margin: 20px 0;">
              <h3 style="color: #6c757d; margin: 0 0 10px 0;">What this means:</h3>
              <p style="margin: 5px 0; color: #555;">• The hiring process for this position has been discontinued</p>
              <p style="margin: 5px 0; color: #555;">• Your application will not be processed further</p>
              <p style="margin: 5px 0; color: #555;">• You are free to apply for other positions</p>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We apologize for any inconvenience this may cause. Please continue to check our platform for other exciting opportunities that match your skills and interests.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL}/jobs" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Browse Other Jobs
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>HireAI Platform Team</strong>
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated email from HireAI Platform.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Job cancellation email sent to ${user.email}`);

  } catch (error) {
    console.error('Send job cancellation email error:', error);
    throw error;
  }
}

export default {
  sendShortlistEmail,
  sendRejectionEmail,
  sendOfferEmail,
  sendApplicationConfirmationEmail,
  sendInterviewReminderEmail,
  sendInterviewCompletionEmail,
  sendHostApplicationNotificationEmail,
  sendJobCancellationEmail,
  testEmailConfiguration
};