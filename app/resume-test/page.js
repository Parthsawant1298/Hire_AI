"use client";

import { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VerificationReport from '@/components/VerificationReport';

export default function ResumeTestPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a PDF file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a resume file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/resume-test', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'Failed to analyze resume');
      }
    } catch (err) {
      console.error('Resume test error:', err);
      setError('Failed to analyze resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <div className="pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Verification Test</h1>
            <p className="text-gray-600">Upload a resume to see detailed AI-powered analysis and verification</p>
          </div>

          {/* Upload Section */}
          {!result && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Resume (PDF)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                  {file && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Analyzing Resume...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>Analyze Resume</span>
                    </>
                  )}
                </button>

                {loading && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span>Extracting resume data with Groq AI...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      <span>Verifying GitHub profile...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                      <span>Analyzing certifications and badges...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                      <span>Verifying work experience...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Verification Report</h2>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Test Another Resume
                </button>
              </div>

              {/* Extracted Data Summary */}
              {result.extractedData && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.extractedData.personalInfo?.fullName && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Full Name</p>
                        <p className="text-sm font-semibold text-gray-900">{result.extractedData.personalInfo.fullName}</p>
                      </div>
                    )}
                    {result.extractedData.personalInfo?.email && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Email</p>
                        <p className="text-sm text-gray-700">{result.extractedData.personalInfo.email}</p>
                      </div>
                    )}
                    {result.extractedData.personalInfo?.phone && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Phone</p>
                        <p className="text-sm text-gray-700">{result.extractedData.personalInfo.phone}</p>
                      </div>
                    )}
                    {result.extractedData.personalInfo?.location && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Location</p>
                        <p className="text-sm text-gray-700">{result.extractedData.personalInfo.location}</p>
                      </div>
                    )}
                    {result.extractedData.totalExperienceYears > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Total Experience</p>
                        <p className="text-sm font-semibold text-gray-900">{result.extractedData.totalExperienceYears} years</p>
                      </div>
                    )}
                    {result.extractedData.skills?.technical?.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 font-medium mb-2">Skills Detected</p>
                        <div className="flex flex-wrap gap-2">
                          {result.extractedData.skills.technical.slice(0, 10).map((skillCat, idx) => {
                            // Handle both string and object formats
                            if (typeof skillCat === 'string') {
                              return (
                                <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                                  {skillCat}
                                </span>
                              );
                            }
                            // If it's a category object with skills array
                            if (skillCat.category && skillCat.skills && Array.isArray(skillCat.skills)) {
                              return skillCat.skills.slice(0, 3).map((skill, sidx) => (
                                <span key={`${idx}-${sidx}`} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                                  {skill}
                                </span>
                              ));
                            }
                            // Fallback for other object formats
                            return (
                              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                                {skillCat.skill || skillCat.name || skillCat.category || 'Skill'}
                              </span>
                            );
                          })}
                          {result.extractedData.skills.technical.length > 10 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{result.extractedData.skills.technical.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verification Report Component */}
              <VerificationReport data={result.verificationResult} />
            </div>
          )}

          {/* Info Section */}
          {!result && !loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">What This Tool Does:</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Extracts structured data from resume using Groq AI (Llama 3.3 70B)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Verifies GitHub profile and analyzes repository quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Validates LinkedIn profile consistency</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Analyzes work experience (detects virtual internships, real jobs, suspicious entries)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Verifies certifications with AI-powered credibility scoring (0-10 scale)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Detects and validates digital badges</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Provides AI-powered role suitability analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Generates comprehensive verification report with color-coded credibility indicators</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
