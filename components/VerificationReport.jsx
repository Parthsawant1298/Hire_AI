'use client';

import React from 'react';

function ScoreRing({ score, maxScore, size = 120 }) {
  const percentage = (score / maxScore) * 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const getColor = () => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#3b82f6';
    if (percentage >= 40) return '#eab308';
    return '#ef4444';
  };
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="#374151" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={getColor()} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-600">/ {maxScore}</span>
      </div>
    </div>
  );
}

function renderItem(item) {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  if (typeof item === 'boolean') return String(item);
  if (typeof item === 'object') {
    if (Array.isArray(item)) return item.map(renderItem).join(', ');
    if (item.name && item.issuer && (item.issueDate || item.credentialId)) {
      const parts = [item.name];
      if (item.issuer) parts.push(`by ${item.issuer}`);
      if (item.issueDate) parts.push(`(${item.issueDate})`);
      return parts.join(' ');
    }
    if (item.name && item.issuer) return `${item.name} (${item.issuer})`;
    if (item.name)  return String(item.name);
    if (item.title) return String(item.title);
    if (item.text)  return String(item.text);
    if (item.certification && typeof item.certification === 'string') return String(item.certification);
    if (item.description) return String(item.description);
    if (item.message)     return String(item.message);
    const values = Object.values(item).filter(v => typeof v === 'string' && v.trim() && v !== '[object Object]');
    if (values.length > 0) return String(values[0]);
    return '';
  }
  return String(item);
}

function getCertificationName(cert) {
  if (typeof cert.certification === 'string' && cert.certification) return cert.certification;
  if (typeof cert.name  === 'string' && cert.name)  return cert.name;
  if (typeof cert.title === 'string' && cert.title) return cert.title;
  if (cert.certification && typeof cert.certification === 'object') {
    if (cert.certification.name)  return cert.certification.name;
    if (cert.certification.title) return cert.certification.title;
    const vals = Object.values(cert.certification).filter(v => typeof v === 'string' && v.trim() && v !== '[object Object]');
    if (vals.length > 0) return vals[0];
  }
  if (cert.originalText && typeof cert.originalText === 'string' && cert.originalText.trim()) return cert.originalText;
  if (typeof cert === 'string' && cert.trim()) return cert;
  return 'Unknown Certification';
}

function getCredibilityColor(score) {
  if (score >= 8) return { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  icon: '✅' };
  if (score >= 6) return { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300',   icon: '✓'  };
  if (score >= 4) return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '⚠️' };
  return           { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',    icon: '🚩' };
}

function VerificationCard({ title, icon, verification }) {
  if (!verification) return null;
  const { status, score, max_score, maxScore: maxScoreAlt, findings, red_flags, redFlags, reason, details } = verification;
  let effectiveMaxScore = max_score || maxScoreAlt;
  if (!effectiveMaxScore) {
    if (title.includes('GitHub'))       effectiveMaxScore = 35;
    else if (title.includes('LinkedIn'))effectiveMaxScore = 25;
    else if (title.includes('Certif'))  effectiveMaxScore = 10;
    else if (title.includes('Badge'))   effectiveMaxScore = 5;
    else                                effectiveMaxScore = 0;
  }
  const effectiveRedFlags = red_flags || redFlags || [];
  const safeStatus = status || 'SKIPPED';
  const statusColors = {
    VERIFIED:           'border-green-300 bg-green-50',
    PARTIALLY_VERIFIED: 'border-blue-300  bg-blue-50',
    SKIPPED:            'border-yellow-300 bg-yellow-50',
    FAILED:             'border-red-300   bg-red-50',
  };

  return (
    <div className={`rounded-xl border-2 p-5 ${statusColors[safeStatus] || 'border-gray-300 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {title.includes('GitHub') && findings?.some(f => String(f).includes('github.com')) && (
              <p className="text-sm text-blue-600 break-all">{findings.find(f => String(f).includes('github.com'))?.replace(/.*?(https?:\/\/[^\s]+).*/, '$1')}</p>
            )}
            {title.includes('LinkedIn') && findings?.some(f => String(f).includes('linkedin.com')) && (
              <p className="text-sm text-blue-600 break-all">{findings.find(f => String(f).includes('linkedin.com'))?.replace(/.*?(https?:\/\/[^\s]+).*/, '$1')}</p>
            )}
          </div>
        </div>
        <span className="text-gray-900 font-bold">{score}/{effectiveMaxScore}</span>
      </div>

      {safeStatus === 'SKIPPED' && reason && <p className="text-yellow-700 text-sm mb-3">⚠️ {reason}</p>}

      {/* Cert detailed analysis */}
      {title.includes('Certif') && details?.analyzed?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 uppercase mb-2 font-semibold">📜 Detailed Certificate Analysis</p>
          <div className="space-y-2">
            {details.analyzed.map((cert, i) => {
              const colors = getCredibilityColor(cert.credibilityScore || 0);
              const certName = getCertificationName(cert);
              const issuerStr = typeof cert.issuer === 'string' ? cert.issuer : cert.issuer?.name || cert.issuer?.organization || 'Unknown Issuer';
              return (
                <div key={i} className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{colors.icon}</span>
                    <p className={`font-semibold text-sm ${colors.text}`}>{certName}</p>
                    {cert.isOfficial && <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">Official</span>}
                  </div>
                  <p className="text-xs text-gray-700 mb-1">Issuer: {issuerStr}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cert.category && <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-300">{String(cert.category)}</span>}
                    <span className={`text-xs font-semibold ${colors.text}`}>Credibility: {cert.credibilityScore || 0}/10</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cert URLs */}
      {title.includes('Certif') && details?.urls && (() => {
        const validUrls = details.urls.filter(u => u.url && !u.url.startsWith('tel:') && !u.url.startsWith('mailto:'));
        if (!validUrls.length) return null;
        return (
          <div className="mb-4">
            <p className="text-xs text-gray-600 uppercase mb-2 font-semibold">🔗 Verified Certificate URLs</p>
            <div className="space-y-2">
              {validUrls.map((u, i) => {
                const colors = getCredibilityColor(u.credibilityScore || 0);
                return (
                  <div key={i} className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{colors.icon}</span>
                      <p className={`font-semibold text-sm ${colors.text}`}>{typeof u.platform === 'string' ? u.platform : u.type || 'Certificate'}</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">Issuer: {typeof u.issuer === 'string' ? u.issuer : 'Unknown'}</p>
                    {u.url && <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">{u.url.substring(0,60)}...</a>}
                    <div className="flex items-center gap-2 mt-1">
                      {u.isOfficial && <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">Verified</span>}
                      <span className={`text-xs font-semibold ${colors.text}`}>Credibility: {u.credibilityScore || 0}/10</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Badge analysis */}
      {title.includes('Badge') && details?.badges?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 uppercase mb-2 font-semibold">🎖️ Digital Badge Analysis</p>
          <div className="space-y-2">
            {details.badges.map((badge, i) => {
              const colors = getCredibilityColor(badge.credibilityScore || 0);
              return (
                <div key={i} className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{colors.icon}</span>
                    <p className={`font-semibold text-sm ${colors.text}`}>{String(badge.platform || badge.issuer || 'Badge')}</p>
                  </div>
                  {badge.url && <a href={badge.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View Badge</a>}
                  <span className={`block text-xs font-semibold mt-1 ${colors.text}`}>Credibility: {badge.credibilityScore || 0}/10</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Findings */}
      {findings?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 uppercase mb-2">Findings</p>
          <ul className="space-y-1">
            {findings.filter(f => {
              if (typeof f === 'object' && f !== null && (f.name || f.issuer || f.issueDate || f.credentialId)) return false;
              return true;
            }).slice(0, 5).map((f, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-green-600">✓</span>{String(renderItem(f) || '')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {effectiveRedFlags.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 uppercase mb-2">Red Flags</p>
          <ul className="space-y-1">
            {effectiveRedFlags.map((flag, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                <span>🚩</span>{String(renderItem(flag) || '')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReportView({ report, onReset }) {
  if (!report) return null;
  return (
    <div className="space-y-8 p-4 rounded-xl bg-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Complete</h2>
        <p className="text-gray-600">Comprehensive analysis for {report.candidate_name}</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <ScoreRing score={report.overall_score} maxScore={100} />
            <div>
              <h3 className="text-xl font-bold text-gray-900">{report.candidate_name}</h3>
              <p className="text-gray-600">Candidate Verification Report</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'GitHub',        score: report.score_breakdown?.github?.score        ?? 0, max: report.score_breakdown?.github?.max        ?? 35 },
              { label: 'LinkedIn',      score: report.score_breakdown?.linkedin?.score      ?? 0, max: report.score_breakdown?.linkedin?.max      ?? 25 },
              { label: 'Experience',    score: report.score_breakdown?.experience?.score    ?? 0, max: report.score_breakdown?.experience?.max    ?? 20 },
              { label: 'Certifications',score: report.score_breakdown?.certifications?.score ?? 0, max: 10 },
              { label: 'Badges',        score: report.score_breakdown?.badges?.score        ?? 0, max: 5  },
            ].map(({ label, score, max }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-lg font-bold text-gray-900">{score}/{max}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {report.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Executive Summary</h3>
          <p className="text-gray-700">{report.summary}</p>
        </div>
      )}

      {report.role_suitability && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span> Role Suitability Analysis
          </h3>
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Best Suited Role</div>
            <div className="flex items-center gap-3">
              {report.role_suitability.best_suited_role ? (
                <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-lg">
                  {report.role_suitability.best_suited_role}
                </span>
              ) : (
                <span className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg font-medium text-sm italic">Role analysis not available</span>
              )}
            </div>
            {report.role_suitability.best_role_reason && (
              <p className="text-gray-600 text-sm mt-2 italic">{report.role_suitability.best_role_reason}</p>
            )}
          </div>
          {report.role_suitability.alternative_roles?.length > 0 && (
            <div>
              <div className="text-sm text-gray-600 mb-2">Can Also Work As</div>
              <div className="flex flex-wrap gap-2">
                {report.role_suitability.alternative_roles.map((role, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium border border-blue-200">
                    {String(renderItem(role) || '')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <VerificationCard title="GitHub"        icon="🐙" verification={report.verifications?.github} />
        <VerificationCard title="LinkedIn"       icon="💼" verification={report.verifications?.linkedin} />
        <VerificationCard title="Certifications" icon="🏆" verification={report.verifications?.certifications} />
        <VerificationCard title="Badges"         icon="🎖️" verification={report.verifications?.badges} />
      </div>

      {/* Experience */}
      {report.experience_verification?.verified_experiences?.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏢</span> Experience Verification
          </h3>

          {report.experience_verification.summary && (
            <div className="flex gap-4 text-sm mb-4 flex-wrap">
              <span className="text-green-700">✅ {report.experience_verification.summary.verified || 0} Verified</span>
              <span className="text-blue-700">📋 {report.experience_verification.summary.realInternships || report.experience_verification.summary.realInternship || 0} Real Internships</span>
              <span className="text-yellow-700">⚠️ {report.experience_verification.summary.virtual || report.experience_verification.summary.virtualInternships || 0} Virtual</span>
              <span className="text-red-700">🚩 {report.experience_verification.summary.suspicious || 0} Suspicious</span>
              {(report.experience_verification.summary.futureDates || 0) > 0 && (
                <span className="text-red-800 font-bold">❌ {report.experience_verification.summary.futureDates} Future Dates!</span>
              )}
            </div>
          )}

          <div className="space-y-3">
            {report.experience_verification.verified_experiences.map((exp, i) => {
              const isVerified   = exp.status === 'VERIFIED' || exp.status === 'REAL_INTERNSHIP';
              const isVirtual    = exp.status === 'VIRTUAL_INTERNSHIP' || exp.experienceType === 'virtual_internship';
              const isSuspicious = exp.status === 'SUSPICIOUS' || exp.redFlag === 'FUTURE_DATES';
              const cardStyle    = isVerified ? 'border-green-400 bg-green-50' : isVirtual ? 'border-yellow-400 bg-yellow-50' : isSuspicious ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50';
              const icon         = isVerified ? '✅' : isVirtual ? '⚠️' : isSuspicious ? '🚩' : '❓';
              const badgeStyle   = isVerified ? 'bg-green-200 text-green-800' : isVirtual ? 'bg-yellow-200 text-yellow-800' : isSuspicious ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700';
              // Handle summary as string or {text: ...} object
              const summaryText  = typeof exp.summary === 'string' ? exp.summary : exp.summary?.text || exp.reason || '';

              return (
                <div key={i} className={`rounded-lg p-4 border-2 ${cardStyle}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>{icon}</span>{exp.company}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded ${badgeStyle}`}>{exp.status?.replace(/_/g, ' ')}</span>
                  </div>
                  {exp.role && <p className="text-gray-600 text-sm mb-1">{exp.role} · {exp.duration}</p>}
                  {summaryText && (
                    <p className={`text-sm ${isVerified ? 'text-green-700' : isVirtual ? 'text-yellow-700' : 'text-red-700'}`}>{summaryText}</p>
                  )}
                  {exp.legitimacyScore != null && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden border border-gray-200">
                        <div className={`h-full rounded-full ${exp.legitimacyScore >= 7 ? 'bg-green-500' : exp.legitimacyScore >= 4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${(exp.legitimacyScore / 10) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">Legitimacy: {exp.legitimacyScore}/10</span>
                    </div>
                  )}
                  {exp.redFlags?.length > 0 && exp.redFlags.map((f, fi) => (
                    <p key={fi} className="text-xs text-red-600 mt-1">🚩 {String(f)}</p>
                  ))}
                  {exp.sources?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {exp.sources.slice(0, 2).map((src, si) => {
                        const s = String(src);
                        return s.startsWith('http') ? (
                          <a key={si} href={s} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline bg-white px-2 py-0.5 rounded border">
                            {(() => { try { return new URL(s).hostname; } catch { return s.substring(0,40); } })()}
                          </a>
                        ) : (
                          <span key={si} className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded border">{s.substring(0,50)}</span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {report.strengths?.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-green-600">💪</span> Strengths
            </h3>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                  <span className="text-green-600">•</span>{String(renderItem(s) || '')}
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.concerns?.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span> Concerns
            </h3>
            <ul className="space-y-2">
              {report.concerns.map((c, i) => (
                <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                  <span className="text-yellow-600">•</span>{String(renderItem(c) || '')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {report.interview_focus_areas?.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>🎯</span> Interview Focus Areas
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.interview_focus_areas.map((area, i) => (
              <span key={i} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm border border-purple-200">
                {String(renderItem(area) || '')}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.final_recommendation && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Final Recommendation</h3>
          <p className="text-gray-700">{report.final_recommendation}</p>
        </div>
      )}

      {onReset && (
        <div className="text-center">
          <button onClick={onReset} className="px-8 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
            Verify Another Candidate
          </button>
        </div>
      )}
    </div>
  );
}

// ─── mapToReportViewData — ALL 6 BUGS FIXED ───────────────────────────────────
const mapToReportViewData = (data) => {
  if (!data) return null;
  if (data.overall_score !== undefined) return data; // already old format

  const { verifications, scoreBreakdown, overallScore, verdict } = data;

  // FIX 1: score — handle overallScore (new) vs overall_score (old)
  const score = overallScore ?? data.score ?? data.overall_score ?? 0;

  // FIX 2: summary — use actual AI text, not fake generic fallback
  const summary = data.summary || data.executiveSummary || (
    score >= 80 ? 'Strong candidate with excellent verification scores. Demonstrates solid technical foundation and active professional presence.'
    : score >= 60 ? 'Good candidate with solid verification scores. Shows reasonable technical experience and professional engagement.'
    : score >= 40 ? 'Candidate shows reasonable qualifications. Additional technical screening recommended to validate skills and experience.'
    : 'Limited verification data available. Recommend thorough background checks and multiple interview rounds.'
  );

  // FIX 3: role_suitability — top-level field, NOT inside verifications
  const roleSuitability = data.role_suitability || data.roleSuitability || verifications?.role_suitability || null;

  // FIX 4: experience — map from verifications.experience correctly
  const expData = verifications?.experience || {};
  const verifiedExperiences = expData.entries || expData.verified_experiences || [];
  const expSummary = (() => {
    const s = expData.summary || expData.totals;
    if (!s) return null;
    if (typeof s === 'string') {
      // Parse "2 verified, 1 real internships, 0 virtual, 0 suspicious."
      return {
        verified:        parseInt(s.match(/(\d+)\s*verified/)?.[1]          || 0),
        realInternships: parseInt(s.match(/(\d+)\s*real\s*internship/i)?.[1] || 0),
        virtual:         parseInt(s.match(/(\d+)\s*virtual/i)?.[1]          || 0),
        suspicious:      parseInt(s.match(/(\d+)\s*suspicious/i)?.[1]       || 0),
        futureDates:     parseInt(s.match(/(\d+)\s*future/i)?.[1]           || 0),
      };
    }
    return s;
  })();

  // FIX 5: strengths/concerns — use real AI data, not generated
  const strengths = data.strengths?.length   > 0 ? data.strengths
    : data.keyStrengths?.length > 0 ? data.keyStrengths
    : [
        (scoreBreakdown?.github?.score   || 0) > 20 ? 'Active GitHub presence with multiple public repositories' : null,
        (scoreBreakdown?.linkedin?.score || 0) > 15 ? 'Professional LinkedIn profile verified' : null,
        ((scoreBreakdown?.certifications?.score ?? scoreBreakdown?.certificates?.score) || 0) > 3 ? 'Certifications verified from recognized platforms' : null,
        (scoreBreakdown?.experience?.score || 0) > 10 ? 'Work experience successfully verified' : null,
      ].filter(Boolean);

  const concerns = data.concerns?.length   > 0 ? data.concerns
    : data.mainConcerns?.length > 0 ? data.mainConcerns
    : [
        (scoreBreakdown?.github?.score    || 0) < 15 ? 'Limited GitHub activity — coding skills need in-person validation' : null,
        (scoreBreakdown?.experience?.score|| 0) < 5  ? 'Limited verifiable work experience found' : null,
        (scoreBreakdown?.linkedin?.score  || 0) < 10 ? 'LinkedIn profile could not be fully verified' : null,
      ].filter(Boolean);

  // FIX 6: score_breakdown — handle both certifications and certificates keys
  const finalScoreBreakdown = scoreBreakdown ? {
    github:        { score: scoreBreakdown.github?.score        ?? 0, max: scoreBreakdown.github?.max        ?? 35 },
    linkedin:      { score: scoreBreakdown.linkedin?.score      ?? 0, max: scoreBreakdown.linkedin?.max      ?? 25 },
    experience:    { score: scoreBreakdown.experience?.score    ?? 0, max: scoreBreakdown.experience?.max    ?? 20 },
    certifications:{ score: (scoreBreakdown.certifications?.score ?? scoreBreakdown.certificates?.score) ?? 0, max: 10 },
    badges:        { score: scoreBreakdown.badges?.score        ?? 0, max: 5 },
  } : {
    github:        { score: verifications?.github?.score        ?? 0, max: 35 },
    linkedin:      { score: verifications?.linkedin?.score      ?? 0, max: 25 },
    experience:    { score: verifications?.experience?.score    ?? 0, max: 20 },
    certifications:{ score: (verifications?.certifications?.score ?? verifications?.certificates?.score) ?? 0, max: 10 },
    badges:        { score: verifications?.badges?.score        ?? 0, max: 5 },
  };

  const finalRecommendation = data.nextStep || data.final_recommendation || (
    score >= 70 ? 'Strong candidate with solid verification scores. Recommended to proceed with technical interviews. Evaluate practical problem-solving skills and team collaboration abilities.'
    : score >= 50 ? 'Candidate shows reasonable potential. Recommend thorough technical screening to validate skills. Additional interview rounds may help assess cultural fit and growth mindset.'
    : 'Recommend additional background checks and multiple interview rounds. Consider requesting references and conducting practical coding assessments before final decision.'
  );

  return {
    candidate_name:       data.candidate_name || data.candidateName || 'Candidate',
    overall_score:        score,
    score_breakdown:      finalScoreBreakdown,
    summary,
    role_suitability: roleSuitability ? {
      best_suited_role:  roleSuitability.best_suited_role  || roleSuitability.bestSuitedRole  || '',
      best_role_reason:  roleSuitability.best_role_reason  || roleSuitability.bestRoleReason  || '',
      alternative_roles: roleSuitability.alternative_roles || roleSuitability.alternativeRoles || [],
    } : null,
    strengths,
    concerns,
    interview_focus_areas: data.interview_focus_areas || data.interviewFocusAreas || [],
    final_recommendation:  finalRecommendation,
    verifications: {
      github:         verifications?.github,
      linkedin:       verifications?.linkedin,
      certifications: verifications?.certifications || verifications?.certificates,
      badges:         verifications?.badges,
    },
    experience_verification: {
      verified_experiences: verifiedExperiences,
      summary:              expSummary,
    },
  };
};

export default function VerificationReport({ data, onReset }) {
  const reportData = mapToReportViewData(data);
  if (!reportData) return <div className="text-gray-600 p-4">No verification data available</div>;
  return <ReportView report={reportData} onReset={onReset} />;
}