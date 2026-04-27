
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
                // Pass raw data if frontend wants to re-render dynamic parts
                verificationResult: application.verificationResult
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

    // Data Sources
    const verification = application.verificationResult || {};
    const detailed = verification.detailedAnalysis || {};
    const verifications = verification.verifications || {};
    const scoreBreakdown = verification.scoreBreakdown || {};

    // Status Color Helper (Light Mode Compliant)
    const getStatusStyle = (status) => {
        if (!status) return 'background-color: #f3f4f6; color: #6b7280;';
        switch (status.toUpperCase()) {
            case 'VERIFIED':
            case 'HIGHLY_RECOMMENDED':
            case 'RECOMMENDED':
            case 'COMPLETE':
                return 'background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;'; // Green
            case 'VIRTUAL':
            case 'PARTIALLY_VERIFIED':
            case 'PROCEED_WITH_CAUTION':
                return 'background-color: #fef9c3; color: #854d0e; border: 1px solid #fde047;'; // Yellow/Amber
            case 'SUSPICIOUS':
            case 'FAILED':
            case 'NOT_RECOMMENDED':
            case 'REJECT':
                return 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca;'; // Red
            case 'SKIPPED':
                return 'background-color: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb;'; // Gray
            default:
                return 'background-color: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb;';
        }
    };

    // Helper to render lists
    const renderList = (items) => {
        if (!items || items.length === 0) return '<div class="empty-text">None recorded</div>';
        return items.map(item => `<div class="list-item">${typeof item === 'string' ? item : JSON.stringify(item)}</div>`).join('');
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Candidate Verification Report</title>
        <style>
            body { 
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                margin: 40px; 
                line-height: 1.5; 
                color: #1f2937; /* Dark Gray Text */
                background-color: #ffffff; /* White Background */
            }
            
            /* Header */
            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header-info h1 { margin: 0; font-size: 26px; color: #111827; }
            .header-info p { margin: 4px 0; color: #4b5563; font-size: 14px; }
            
            /* Verdict Badge */
            .verdict-badge {
                font-size: 14px;
                font-weight: bold;
                padding: 8px 16px;
                border-radius: 99px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                ${getStatusStyle(verification.verdict)}
            }

            /* Score Grid */
            .score-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 15px;
                margin-bottom: 30px;
                background-color: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
            }
            .score-card {
                text-align: center;
                border-right: 1px solid #e5e7eb;
            }
            .score-card:last-child { border-right: none; }
            .score-val { font-size: 24px; font-weight: 800; color: #2563eb; }
            .score-max { font-size: 14px; color: #9ca3af; font-weight: normal; }
            .score-label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-top: 4px; font-weight: 600; }

            /* Sections */
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section-title {
                font-size: 16px;
                font-weight: 700;
                color: #111827;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 8px;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Executive Summary */
            .summary-box {
                background-color: #fefeff;
                border: 1px solid #e5e7eb;
                padding: 15px;
                border-radius: 6px;
                font-size: 14px;
                color: #374151;
            }

            /* Two Column Layout */
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
            
            /* Data Cards */
            .data-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                background: #ffffff;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                border-bottom: 1px dashed #e5e7eb;
                padding-bottom: 8px;
            }
            .card-title { font-weight: 700; font-size: 14px; color: #374151; }
            .status-pill { font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600; text-transform: uppercase; }

            /* Lists */
            .list-item { 
                position: relative; 
                padding-left: 14px; 
                margin-bottom: 4px; 
                font-size: 13px; 
                color: #4b5563; 
            }
            .list-item:before { 
                content: "•"; 
                position: absolute; 
                left: 0; 
                color: #9ca3af; 
            }
            .empty-text { font-style: italic; color: #9ca3af; font-size: 12px; }

            /* Experience Table */
            .exp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .exp-table th { text-align: left; background: #f9fafb; padding: 10px; color: #374151; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
            .exp-table td { padding: 10px; border-bottom: 1px solid #f3f4f6; color: #4b5563; vertical-align: top; }
            .exp-table tr:last-child td { border-bottom: none; }
            
            /* Role Suitability */
            .role-badge { 
                display: inline-block; 
                background: #eff6ff; 
                color: #1e40af; 
                padding: 4px 10px; 
                border-radius: 6px; 
                font-size: 13px; 
                font-weight: 600; 
                margin-right: 5px; 
                border: 1px solid #dbeafe; 
            }
            
            /* Strengths & Concerns */
            .analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .analysis-box { padding: 15px; border-radius: 8px; font-size: 13px; }
            .box-green { background: #f0fdf4; border: 1px solid #bbf7d0; }
            .box-red { background: #fef2f2; border: 1px solid #fecaca; }
            .box-title { font-weight: 700; margin-bottom: 8px; text-transform: uppercase; font-size: 12px; }
            .green-text { color: #166534; }
            .red-text { color: #991b1b; }

            /* Keywords */
            .keyword-tag {
                display: inline-block;
                background: #f3f4f6;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin: 0 4px 4px 0;
                color: #4b5563;
                border: 1px solid #e5e7eb;
            }

            /* Final Footer */
            .footer {
                margin-top: 50px;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
                text-align: center;
                font-size: 12px;
                color: #9ca3af;
            }
        </style>
    </head>
    <body>
        <div class="header-container">
            <div class="header-info">
                <h1>${candidate.name}</h1>
                <p><strong>${job.jobTitle}</strong> at ${job.company}</p>
                <p>Email: ${candidate.email} | Phone: ${candidate.phone || 'N/A'}</p>
                <p>Report Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            <div>
                 ${verification.verdict ? `<span class="verdict-badge">${verification.verdict.replace(/_/g, ' ')}</span>` : ''}
            </div>
        </div>

        <div class="score-grid">
            <div class="score-card">
                 <!-- Main Score -->
                <div class="score-val" style="color:#111827">${verification.overallScore || 0}<span class="score-max">%</span></div>
                <div class="score-label">Overall Score</div>
            </div>
            <div class="score-card">
                <div class="score-val">${scoreBreakdown.github?.score || 0}<span class="score-max">/35</span></div>
                <div class="score-label">GitHub</div>
            </div>
            <div class="score-card">
                <div class="score-val">${scoreBreakdown.linkedin?.score || 0}<span class="score-max">/25</span></div>
                <div class="score-label">LinkedIn</div>
            </div>
            <div class="score-card">
                <div class="score-val">${scoreBreakdown.experience?.score || 0}<span class="score-max">/25</span></div>
                <div class="score-label">Experience</div>
            </div>
            <div class="score-card">
                <div class="score-val">${scoreBreakdown.certifications?.score || 0}<span class="score-max">/10</span></div>
                <div class="score-label">Certs</div>
            </div>
            <div class="score-card">
                <div class="score-val">${scoreBreakdown.badges?.score || 0}<span class="score-max">/5</span></div>
                <div class="score-label">Badges</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Executive Summary</div>
            <div class="summary-box">
                ${detailed.executiveSummary || 'No summary available.'}
            </div>
        </div>

        <div class="section">
           <div class="section-title">Role Suitability</div>
           <div class="data-card">
               <div style="margin-bottom: 10px;">
                    <span style="font-size:12px; color:#6b7280; text-transform:uppercase; font-weight:600;">Best Match:</span>
                    <span class="role-badge">${detailed.roleSuitability?.bestMatch?.role || 'N/A'}</span>
               </div>
               <p style="font-size:13px; color:#4b5563; margin-bottom:12px;">${detailed.roleSuitability?.bestMatch?.reason || ''}</p>
               
               ${detailed.roleSuitability?.alternatives?.length > 0 ? `
               <div style="border-top:1px dashed #e5e7eb; padding-top:10px;">
                   <span style="font-size:12px; color:#6b7280; text-transform:uppercase; font-weight:600; margin-right:8px;">Alternatives:</span>
                   ${detailed.roleSuitability.alternatives.map(alt => `<span class="keyword-tag">${alt.title}</span>`).join('')}
               </div>
               ` : ''}
           </div>
        </div>

        <div class="section">
            <div class="section-title">Verification Findings</div>
            <div class="grid-2">
                <div class="data-card">
                    <div class="card-header">
                        <span class="card-title">GitHub Analysis</span>
                        <span class="status-pill" style="${getStatusStyle(verifications.github?.status)}">${verifications.github?.status || 'N/A'}</span>
                    </div>
                    ${renderList(verifications.github?.findings)}
                </div>
                
                <div class="data-card">
                    <div class="card-header">
                        <span class="card-title">LinkedIn Analysis</span>
                        <span class="status-pill" style="${getStatusStyle(verifications.linkedin?.status)}">${verifications.linkedin?.status || 'N/A'}</span>
                    </div>
                    ${renderList(verifications.linkedin?.findings)}
                </div>

                <div class="data-card">
                    <div class="card-header">
                        <span class="card-title">Certifications</span>
                        <span class="status-pill" style="${getStatusStyle(verifications.certifications?.status)}">${verifications.certifications?.status || 'N/A'}</span>
                    </div>
                    ${renderList(verifications.certifications?.findings)}
                </div>

                 <div class="data-card">
                    <div class="card-header">
                        <span class="card-title">Badges & Achievements</span>
                        <span class="status-pill" style="${getStatusStyle(verifications.badges?.status)}">${verifications.badges?.status || 'N/A'}</span>
                    </div>
                    ${renderList(verifications.badges?.findings)}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Experience Verification</div>
            <div class="data-card" style="padding:0; overflow:hidden;">
                <table class="exp-table">
                    <thead>
                        <tr>
                            <th width="30%">Company</th>
                            <th width="25%">Role</th>
                            <th width="15%">Status</th>
                            <th width="30%">Notes/Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${verifications.experience?.verifiedExperiences?.map(exp => `
                        <tr>
                            <td><strong>${exp.company}</strong></td>
                            <td>${exp.role}</td>
                            <td><span class="status-pill" style="${getStatusStyle(exp.status)}">${exp.status}</span></td>
                            <td>${exp.reason}</td>
                        </tr>
                        `).join('') || '<tr><td colspan="4" style="padding:15px; text-align:center;">No experience records analyzed</td></tr>'}
                    </tbody>
                </table>
                 ${verifications.experience?.summary ? `
                <div style="padding:10px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:12px; display:flex; gap:15px;">
                    <span style="color:#166534"><strong>${verifications.experience.summary.verified || 0}</strong> Verified</span>
                    <span style="color:#854d0e"><strong>${verifications.experience.summary.virtual || 0}</strong> Virtual</span>
                    <span style="color:#991b1b"><strong>${verifications.experience.summary.suspicious || 0}</strong> Suspicious</span>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Deep Profile Analysis</div>
            <div class="analysis-grid">
                <div class="analysis-box box-green">
                    <div class="box-title green-text">Key Strengths</div>
                    ${renderList(detailed.strengths)}
                </div>
                <div class="analysis-box box-red">
                    <div class="box-title red-text">Areas of Concern</div>
                    ${renderList(detailed.concerns)}
                </div>
            </div>
        </div>
        
        <div class="section">
             <div class="section-title">Interview Focus Areas</div>
             <div class="data-card">
                 <div style="display:flex; flex-wrap:wrap; gap:8px;">
                     ${detailed.interviewFocusAreas?.map(area => `
                        <span class="keyword-tag" style="background:#eff6ff; border-color:#dbeafe; color:#1e40af;">${area.area || area}</span>
                     `).join('') || '<span class="empty-text">No specific focus areas generated</span>'}
                 </div>
                 ${detailed.interviewFocusAreas?.length > 0 && detailed.interviewFocusAreas[0].question ? `
                 <div style="margin-top:15px;">
                    ${detailed.interviewFocusAreas.map(area => `
                        <div style="margin-bottom:10px; font-size:13px;">
                            <div style="font-weight:600; color:#374151;">Q: ${area.question}</div>
                            <div style="color:#6b7280; font-style:italic;">Look for: ${area.expectedSignal}</div>
                        </div>
                    `).join('')}
                 </div>
                 ` : ''}
             </div>
        </div>

        <div class="section">
            <div class="section-title">Final Recommendation</div>
            <div style="background:#f3f4f6; padding:20px; border-left:4px solid #4b5563; border-radius:4px;">
                <p style="margin:0; font-size:14px; font-weight:500; color:#1f2937;">${detailed.finalRecommendation || "No recommendation provided."}</p>
            </div>
        </div>
        
        <div class="footer">
            Generated by VerifyHire AI System • Privileged & Confidential
        </div>
    </body>
    </html>
    `;
}


