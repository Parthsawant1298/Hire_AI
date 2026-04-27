// 📄 5. HOST CANDIDATES DASHBOARD
// File: app/host/jobs/[jobId]/candidates/page.js
// =================
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, Eye, Mail, Star, Filter } from 'lucide-react';
import Navbar from '@/components/Host/Navbar';
import Footer from '@/components/Footer';
import VerificationReport from '@/components/VerificationReport';

export default function CandidatesDashboard() {
  const router = useRouter();
  const params = useParams();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.jobId}/shortlist`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.job);
        setCandidates(data.candidates);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleFinalizeSelection = async () => {
    if (selectedCandidates.length === 0) {
      alert('Please select at least one candidate');
      return;
    }

    if (selectedCandidates.length > job.finalSelectionCount) {
      alert(`You can only select ${job.finalSelectionCount} candidates for final selection`);
      return;
    }

    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}/candidates/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ selectedCandidateIds: selectedCandidates })
      });

      const data = await response.json();

      if (data.success) {
        alert('Final selection completed! Offer emails will be sent to selected candidates.');
        fetchCandidates();
      } else {
        alert(data.error || 'Failed to finalize selection');
      }
    } catch (error) {
      console.error('Failed to finalize selection:', error);
      alert('Failed to finalize selection. Please try again.');
    }
  };

  const downloadFeedbackPDF = async (candidateId, candidateName) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/export-pdf`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(data.htmlContent);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
      } else {
        alert(data.error || 'Failed to generate PDF report');
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  const exportAllFeedback = async () => {
    try {
      const candidatesWithFeedback = candidates.filter(c => c.atsScore);

      if (candidatesWithFeedback.length === 0) {
        alert('No candidates have been analyzed yet.');
        return;
      }

      let combinedHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Complete Candidate Evaluation Report - ${job?.jobTitle}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                .candidate-section { page-break-before: always; margin-bottom: 40px; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; }
                .candidate-header { background: #f8fafc; padding: 15px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; }
                .score-row { display: flex; justify-content: space-around; margin: 20px 0; text-align: center; }
                .score-item { padding: 15px; background: #f0f9ff; border-radius: 8px; }
                .score { font-size: 24px; font-weight: bold; color: #2563eb; }
                .label { color: #6b7280; font-size: 12px; }
                h1 { color: #2563eb; margin: 0; }
                h2 { color: #1f2937; }
                h3 { color: #374151; margin-top: 20px; }
                .feedback-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
                .feedback-item { padding: 10px; background: #fefefe; border: 1px solid #e5e7eb; border-radius: 6px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Complete Candidate Evaluation Report</h1>
                <p><strong>${job?.jobTitle}</strong> - ${candidatesWithFeedback.length} Candidates Evaluated</p>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
      `;

      candidatesWithFeedback.forEach((candidate, index) => {
        combinedHTML += `
          <div class="candidate-section">
            <div class="candidate-header">
              <h2>#${index + 1} - ${candidate.user.name}</h2>
              <p><strong>Email:</strong> ${candidate.user.email} | <strong>Status:</strong> ${candidate.status.toUpperCase()}</p>
            </div>
            <div class="score-row">
              <div class="score-item">
                <div class="score">${candidate.atsScore || 0}%</div>
                <div class="label">ATS Score (R1)</div>
              </div>
              <div class="score-item">
                <div class="score">${candidate.voiceInterviewScore || '-'}%</div>
                <div class="label">Interview (R2)</div>
              </div>
              <div class="score-item">
                <div class="score">${candidate.finalScore ? candidate.finalScore : (candidate.compositeScore ? candidate.compositeScore.toFixed(1) : candidate.atsScore || 0)}%</div>
                <div class="label">${candidate.voiceInterviewCompleted ? 'Final Score' : 'R1 Composite'}</div>
              </div>
            </div>
            ${candidate.voiceInterviewFeedback ? `
            <h3>Interview Performance</h3>
            <div class="feedback-grid">
              <div class="feedback-item"><strong>Communication:</strong> ${candidate.voiceInterviewFeedback.communicationSkills}%</div>
              <div class="feedback-item"><strong>Technical:</strong> ${candidate.voiceInterviewFeedback.technicalKnowledge}%</div>
              <div class="feedback-item"><strong>Problem Solving:</strong> ${candidate.voiceInterviewFeedback.problemSolving}%</div>
              <div class="feedback-item"><strong>Confidence:</strong> ${candidate.voiceInterviewFeedback.confidence}%</div>
            </div>
            ${candidate.voiceInterviewFeedback.detailedFeedback ? `<p><strong>Detailed Feedback:</strong> ${candidate.voiceInterviewFeedback.detailedFeedback}</p>` : ''}
            ` : ''}
          </div>
        `;
      });

      combinedHTML += `</body></html>`;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(combinedHTML);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 500);

    } catch (error) {
      console.error('Failed to export all feedback:', error);
      alert('Failed to generate combined report. Please try again.');
    }
  };

  const filteredCandidates = candidates.filter(candidate =>
    !statusFilter || candidate.status === statusFilter
  );

  const stats = {
    total: candidates.length,
    aiSelected: candidates.filter(c => c.status === 'ai_selected').length,
    aiRejected: candidates.filter(c => c.status === 'ai_rejected').length,
    hrSelected: candidates.filter(c => c.status === 'hr_selected').length,
    hrRejected: candidates.filter(c => c.status === 'hr_rejected').length,
    pending: candidates.filter(c => c.status === 'applied').length,
    averageAtsScore: candidates.length > 0
      ? Math.round(candidates.reduce((sum, c) => sum + (c.atsScore || 0), 0) / candidates.length)
      : 0,
    // FIX: use compositeScore average if available, else atsScore
    averageCompositeScore: candidates.length > 0 && candidates.some(c => c.compositeScore)
      ? Math.round(candidates.reduce((sum, c) => sum + (c.compositeScore || c.atsScore || 0), 0) / candidates.length)
      : null,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Candidate Dashboard</h1>
                <p className="text-sm text-gray-500">{job?.jobTitle} · {stats.total} Applications Received</p>
              </div>
              <button
                onClick={() => router.back()}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                ← Back to Jobs
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📋</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">✓</span>
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium">Shortlisted</p>
                  <p className="text-xl font-bold text-green-700">{stats.aiSelected}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">✕</span>
                </div>
                <div>
                  <p className="text-xs text-red-600 font-medium">Rejected</p>
                  <p className="text-xl font-bold text-red-700">{stats.aiRejected}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">Composite</p>
                  {/* FIX: show actual compositeScore avg if available */}
                  <p className="text-xl font-bold text-blue-700">
                    {stats.averageCompositeScore != null ? `${stats.averageCompositeScore}%` : `${stats.averageAtsScore}%`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📈</span>
                </div>
                <div>
                  <p className="text-xs text-purple-600 font-medium">Avg ATS</p>
                  <p className="text-xl font-bold text-purple-700">{stats.averageAtsScore}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Candidates ({stats.total})</option>
                  <option value="applied">Pending ({stats.pending})</option>
                  <option value="ai_selected">Shortlisted ({stats.aiSelected})</option>
                  <option value="ai_rejected">Rejected ({stats.aiRejected})</option>
                  <option value="hr_selected">HR Selected ({stats.hrSelected})</option>
                  <option value="hr_rejected">HR Rejected ({stats.hrRejected})</option>
                </select>

                {selectedCandidates.length > 0 && (
                  <div className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    {selectedCandidates.length} selected
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => exportAllFeedback()}
                  className="text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Reports</span>
                </button>
                {selectedCandidates.length > 0 && (
                  <button
                    onClick={handleFinalizeSelection}
                    className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Finalize ({selectedCandidates.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Candidates List */}
          <div className="space-y-4">
            {filteredCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                isSelected={selectedCandidates.includes(candidate.id)}
                onSelect={() => handleSelectCandidate(candidate.id)}
                onDownloadPDF={downloadFeedbackPDF}
                job={job}
              />
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function CandidateCard({ candidate, isSelected, onSelect, onDownloadPDF, job }) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'applied':      return 'bg-yellow-100 text-yellow-700';
      case 'ai_selected':  return 'bg-green-100 text-green-700 border-2 border-green-300';
      case 'ai_rejected':  return 'bg-red-100 text-red-700 border-2 border-red-300';
      case 'hr_selected':  return 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400';
      case 'hr_rejected':  return 'bg-gray-100 text-gray-700';
      case 'offer_sent':   return 'bg-blue-100 text-blue-700';
      default:             return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'applied':      return 'Under Review';
      case 'ai_selected':  return '✅ AI Selected';
      case 'ai_rejected':  return '❌ AI Rejected';
      case 'hr_selected':  return '🎉 HR Selected';
      case 'hr_rejected':  return 'Not Selected';
      case 'offer_sent':   return 'Offer Sent';
      default:             return status.replace(/_/g, ' ').toUpperCase();
    }
  };

  // FIX: Get the correct Final/Combined score
  const isRound2Done = candidate.voiceInterviewCompleted;
  
  const compositeDisplay = isRound2Done && candidate.finalScore
    ? `${candidate.finalScore}%`
    : candidate.compositeScore 
      ? `${candidate.compositeScore.toFixed(1)}%`
      : `${candidate.atsScore || 0}%`;

  const compositeLabel = isRound2Done ? 'Final Score' : (candidate.compositeScore ? 'R1 Composite' : 'R1 Score');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
        />

        <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
          {candidate.user.profilePicture ? (
            <img src={candidate.user.profilePicture} alt={candidate.user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-base font-bold text-gray-700">
              {candidate.user.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{candidate.user.name}</h3>
              <p className="text-sm text-gray-500 truncate">{candidate.user.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(candidate.status)}`}>
                  {getStatusLabel(candidate.status)}
                </span>
                {candidate.ranking && (
                  <span className="text-xs font-semibold text-gray-700 bg-yellow-100 px-2.5 py-0.5 rounded-full border border-yellow-300">#{candidate.ranking}</span>
                )}
                <span className="text-xs text-gray-400">{new Date(candidate.appliedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
                title="View Resume"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => onDownloadPDF(candidate.id, candidate.user.name)}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg border border-gray-200 transition-colors"
                title="Export PDF Report"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Verification Score - Compact View */}
          {candidate.verificationResult && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                candidate.verificationResult.verdict === 'HIGHLY_RECOMMENDED' ? 'bg-green-50 border-green-300' :
                candidate.verificationResult.verdict === 'RECOMMENDED'        ? 'bg-blue-50 border-blue-300' :
                candidate.verificationResult.verdict === 'PROCEED_WITH_CAUTION'? 'bg-yellow-50 border-yellow-300' :
                candidate.verificationResult.verdict === 'NOT_RECOMMENDED'    ? 'bg-orange-50 border-orange-300' :
                'bg-red-50 border-red-300'
              }`}>
                <span className="text-base">🔍</span>
                <div>
                  <div className={`text-sm font-bold ${
                    candidate.verificationResult.verdict === 'HIGHLY_RECOMMENDED' ? 'text-green-700' :
                    candidate.verificationResult.verdict === 'RECOMMENDED'        ? 'text-blue-700' :
                    candidate.verificationResult.verdict === 'PROCEED_WITH_CAUTION'? 'text-yellow-700' :
                    candidate.verificationResult.verdict === 'NOT_RECOMMENDED'    ? 'text-orange-700' :
                    'text-red-700'
                  }`}>
                    {candidate.verificationResult.overallScore}/100
                  </div>
                  <div className="text-xs text-gray-500">Verification</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                <span>GitHub {candidate.verificationResult.scoreBreakdown?.github?.score || 0}/{candidate.verificationResult.scoreBreakdown?.github?.max || 40}</span>
                <span>•</span>
                <span>LinkedIn {candidate.verificationResult.scoreBreakdown?.linkedin?.score || 0}/{candidate.verificationResult.scoreBreakdown?.linkedin?.max || 25}</span>
                <span>•</span>
                {/* FIX: dynamic max from scoreBreakdown instead of hardcoded /25 */}
                <span>Exp {candidate.verificationResult.scoreBreakdown?.experience?.score || 0}/{candidate.verificationResult.scoreBreakdown?.experience?.max || 20}</span>
                <span>•</span>
                <span>Certs {(candidate.verificationResult.scoreBreakdown?.certifications?.score ?? candidate.verificationResult.scoreBreakdown?.certificates?.score) || 0}/10</span>
              </div>
            </div>
          )}

          {/* Performance Scores */}
          <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-6 gap-3 text-center">
              {/* Round 1 */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-purple-600">{candidate.atsScore || 0}%</div>
                <div className="text-xs font-medium text-gray-900">Round 1</div>
                <div className="text-xs text-gray-500">Resume</div>
              </div>

              {/* Round 2 */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-blue-600">
                  {candidate.voiceInterviewCompleted ? `${candidate.voiceInterviewScore || 0}%` : '-'}
                </div>
                <div className="text-xs font-medium text-gray-900">Round 2</div>
                <div className="text-xs text-gray-500">
                  {candidate.voiceInterviewCompleted ? 'Interview' : 'Pending'}
                </div>
              </div>

              {/* FIX: Combined/Composite score — use compositeScore from DB if available */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 shadow-sm border border-green-200">
                <div className="text-lg font-bold text-green-600">{compositeDisplay}</div>
                <div className="text-xs font-medium text-gray-900">{compositeLabel}</div>
                <div className="text-xs text-gray-500">Combined</div>
              </div>

              {/* Skills */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-gray-700">{candidate.aiAnalysis?.skillsMatch || 0}%</div>
                <div className="text-xs text-gray-500">Skills</div>
              </div>

              {/* Experience */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-gray-700">{candidate.aiAnalysis?.experienceMatch || 0}%</div>
                <div className="text-xs text-gray-500">Experience</div>
              </div>

              {/* Fit */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-lg font-bold text-gray-700">{candidate.aiAnalysis?.overallFit || 0}%</div>
                <div className="text-xs text-gray-500">Fit</div>
              </div>
            </div>

            {/* Compatibility Badges */}
            {candidate.aiAnalysis && (
              <div className="mt-3 flex justify-center gap-2">
                {candidate.aiAnalysis.locationCompatible === true && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Location</span>
                )}
                {candidate.aiAnalysis.salaryCompatible === true && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Salary</span>
                )}
                {candidate.aiAnalysis.salaryCompatible === false && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">✕ Salary Mismatch</span>
                )}
              </div>
            )}
          </div>

          {/* Detailed View */}
          {showDetails && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Voice Interview Results */}
                {candidate.voiceInterviewCompleted && (
                  <div className="md:col-span-2 mb-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">🎤</span>
                      Voice Interview Results (Round 2)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                      {candidate.voiceInterviewFeedback?.communicationSkills !== undefined && (
                        <div className="bg-white p-4 rounded-lg text-center shadow-sm border-2 border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">{candidate.voiceInterviewFeedback.communicationSkills}</div>
                          <div className="text-xs text-gray-600 font-semibold mt-1">Communication</div>
                          <div className="text-xs text-gray-400">Excellence</div>
                        </div>
                      )}
                      {candidate.voiceInterviewFeedback?.technicalKnowledge !== undefined && (
                        <div className="bg-white p-4 rounded-lg text-center shadow-sm border-2 border-green-200">
                          <div className="text-2xl font-bold text-green-600">{candidate.voiceInterviewFeedback.technicalKnowledge}</div>
                          <div className="text-xs text-gray-600 font-semibold mt-1">Technical</div>
                          <div className="text-xs text-gray-400">Competency</div>
                        </div>
                      )}
                      {candidate.voiceInterviewFeedback?.problemSolving !== undefined && (
                        <div className="bg-white p-4 rounded-lg text-center shadow-sm border-2 border-purple-200">
                          <div className="text-2xl font-bold text-purple-600">{candidate.voiceInterviewFeedback.problemSolving}</div>
                          <div className="text-xs text-gray-600 font-semibold mt-1">Problem</div>
                          <div className="text-xs text-gray-400">Solving</div>
                        </div>
                      )}
                      {candidate.voiceInterviewFeedback?.confidence !== undefined && (
                        <div className="bg-white p-4 rounded-lg text-center shadow-sm border-2 border-orange-200">
                          <div className="text-2xl font-bold text-orange-600">{candidate.voiceInterviewFeedback.confidence}</div>
                          <div className="text-xs text-gray-600 font-semibold mt-1">Confidence</div>
                          <div className="text-xs text-gray-400">Presentation</div>
                        </div>
                      )}
                      {candidate.voiceInterviewFeedback?.culturalFit !== undefined && (
                        <div className="bg-white p-4 rounded-lg text-center shadow-sm border-2 border-pink-200">
                          <div className="text-2xl font-bold text-pink-600">{candidate.voiceInterviewFeedback.culturalFit}</div>
                          <div className="text-xs text-gray-600 font-semibold mt-1">Cultural Fit</div>
                          <div className="text-xs text-gray-400">Soft Skills</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {candidate.voiceInterviewFeedback?.hiringRecommendation && (
                        <div className={`p-4 rounded-xl text-center border-2 ${
                          candidate.voiceInterviewFeedback.hiringRecommendation === 'Strongly Recommend' ? 'bg-green-50 border-green-500' :
                          candidate.voiceInterviewFeedback.hiringRecommendation === 'Recommend' ? 'bg-blue-50 border-blue-500' :
                          candidate.voiceInterviewFeedback.hiringRecommendation === 'Consider with Reservations' ? 'bg-yellow-50 border-yellow-500' :
                          'bg-red-50 border-red-500'
                        }`}>
                          <div className="text-xs text-gray-600 mb-1">Hiring Recommendation</div>
                          <div className="text-lg font-bold text-gray-900">{candidate.voiceInterviewFeedback.hiringRecommendation}</div>
                          <div className="text-xs text-gray-500 mt-1">Confidence: {candidate.voiceInterviewFeedback.confidenceLevel || 'Medium'}</div>
                        </div>
                      )}
                      {candidate.voiceInterviewFeedback?.interviewQualityScore !== undefined && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl text-center border-2 border-indigo-200">
                          <div className="text-xs text-gray-600 mb-1">Interview Quality Score</div>
                          <div className="text-2xl font-bold text-indigo-600">{candidate.voiceInterviewFeedback.interviewQualityScore}/100</div>
                          <div className="text-xs text-gray-500 mt-1">Overall: {candidate.voiceInterviewFeedback.overallPerformance || 0}/100</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {candidate.voiceInterviewFeedback?.strengths?.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-xl border-2 border-green-300">
                          <h5 className="text-sm font-bold text-green-900 mb-3 flex items-center"><span className="mr-2">✅</span>Key Strengths</h5>
                          <ul className="space-y-2">
                            {candidate.voiceInterviewFeedback.strengths.map((s, i) => (
                              <li key={i} className="text-xs text-green-800 flex items-start"><span className="mr-2 mt-0.5">•</span><span>{s}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {candidate.voiceInterviewFeedback?.redFlags?.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-xl border-2 border-red-300">
                          <h5 className="text-sm font-bold text-red-900 mb-3 flex items-center"><span className="mr-2">🚩</span>Red Flags / Concerns</h5>
                          <ul className="space-y-2">
                            {candidate.voiceInterviewFeedback.redFlags.map((f, i) => (
                              <li key={i} className="text-xs text-red-800 flex items-start"><span className="mr-2 mt-0.5">•</span><span>{f}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {candidate.voiceInterviewFeedback?.areasForImprovement?.length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-300">
                          <h5 className="text-sm font-bold text-yellow-900 mb-3 flex items-center"><span className="mr-2">📈</span>Development Areas</h5>
                          <ul className="space-y-2">
                            {candidate.voiceInterviewFeedback.areasForImprovement.map((a, i) => (
                              <li key={i} className="text-xs text-yellow-800 flex items-start"><span className="mr-2 mt-0.5">•</span><span>{a}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {candidate.voiceInterviewFeedback?.standoutMoments?.length > 0 && (
                        <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-300">
                          <h5 className="text-sm font-bold text-purple-900 mb-3 flex items-center"><span className="mr-2">⭐</span>Standout Moments</h5>
                          <ul className="space-y-2">
                            {candidate.voiceInterviewFeedback.standoutMoments.map((m, i) => (
                              <li key={i} className="text-xs text-purple-800 flex items-start"><span className="mr-2 mt-0.5">•</span><span className="italic">"{m}"</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {candidate.voiceInterviewFeedback?.detailedFeedback && (
                      <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border-2 border-gray-200">
                        <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center"><span className="mr-2">💬</span>Professional Interview Analysis (Industry Standard)</h5>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{candidate.voiceInterviewFeedback.detailedFeedback}</p>
                      </div>
                    )}

                    {candidate.voiceInterviewFeedback?.recommendedNextSteps && (
                      <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-300 mb-6">
                        <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center"><span className="mr-2">🎯</span>Recommended Next Steps</h5>
                        <p className="text-xs text-blue-800">{candidate.voiceInterviewFeedback.recommendedNextSteps}</p>
                      </div>
                    )}

                    {candidate.voiceTranscript && (
                      <div className="bg-white p-5 rounded-xl shadow-sm mb-6">
                        <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center"><span className="mr-2">📝</span>Interview Transcript</h5>
                        <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-mono">{candidate.voiceTranscript}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-gray-600 bg-white p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">⏱️ Duration:</span>
                        <span>{Math.floor((candidate.voiceInterviewFeedback?.interviewDuration || 0) / 60)}m {((candidate.voiceInterviewFeedback?.interviewDuration || 0) % 60)}s</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">❓ Questions:</span>
                        <span>{candidate.voiceInterviewFeedback?.answeredQuestions || 0}/{candidate.voiceInterviewFeedback?.totalQuestions || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">✅ Completed:</span>
                        <span>{new Date(candidate.interviewCompletedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Results */}
                {candidate.verificationResult ? (
                  <div className="md:col-span-2 mb-6">
                    <VerificationReport data={candidate.verificationResult} />
                  </div>
                ) : null}

                {/* AI Analysis (only if no verification) */}
                {candidate.aiAnalysis && !candidate.verificationResult && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Resume Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Skills Match</span>
                        <span className="text-sm font-medium">{candidate.aiAnalysis.skillsMatch}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Experience Match</span>
                        <span className="text-sm font-medium">{candidate.aiAnalysis.experienceMatch}%</span>
                      </div>
                    </div>
                    {candidate.aiAnalysis.strengths && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-green-900 mb-1">✅ Strengths:</p>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                          {candidate.aiAnalysis.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {candidate.aiAnalysis.weaknesses && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-900 mb-1">⚠️ Weaknesses:</p>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                          {candidate.aiAnalysis.weaknesses.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                    {candidate.aiAnalysis.detailedFeedback && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">📝 AI Feedback:</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{candidate.aiAnalysis.detailedFeedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}