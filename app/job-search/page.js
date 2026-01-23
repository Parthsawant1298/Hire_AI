"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Upload, FileText, MapPin, Building2, IndianRupee,
  ExternalLink, CheckCircle2, Sparkles, AlertCircle,
  Briefcase, GraduationCap, ArrowRight, Search, Loader2,
  Target, TrendingUp, Award, Users, Clock, Star
} from 'lucide-react';

const EnhancedJobSearchPage = () => {
  const [jobs, setJobs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [searchStats, setSearchStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');

  // Enhanced State for Better Job Matching
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('Any');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [industry, setIndustry] = useState('');

  const API_BASE = 'http://localhost:8002';

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    setFileName(file.name);
    setIsLoading(true);
    setError(null);
    setJobs([]);
    setAnalysis(null);
    setSearchStats(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('location', location);
    formData.append('job_type', jobType);
    formData.append('salary_expectation', salaryExpectation);
    formData.append('industry', industry);

    try {
      const response = await fetch(`${API_BASE}/upload-resume`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.analysis);
        setJobs(result.jobs || []);
        setSearchStats(result.search_stats || {});
      } else {
        setError(result.error || "Failed to analyze resume and find jobs.");
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to the AI service. Please ensure the enhanced backend is running on port 8002.");
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchScoreColor = (score) => {
    switch (score?.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">

        {/* Hero Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-blue-700 text-sm font-semibold mb-8 shadow-sm animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>Enhanced AI Job Matching</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Find Perfect Jobs <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Instantly</span>
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Advanced LangGraph-powered system that analyzes your resume deeply, searches live global job boards, and matches you with real opportunities using intelligent algorithms.
          </p>

          {/* Enhanced Search Filters */}
          <div className="max-w-4xl mx-auto mb-8 bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-6 text-center">Step 1: Enhanced Job Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Location */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">Target Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Bangalore, Remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Job Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">Work Type</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Any">Any Type</option>
                    <option value="Remote">Remote Only</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Salary Expectation */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">Salary Expectation</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. 4L - 12L PA"
                    value={salaryExpectation}
                    onChange={(e) => setSalaryExpectation(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">Preferred Industry</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Technology, Finance, Healthcare"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="max-w-xl mx-auto">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 text-center">Step 2: Upload Resume for Analysis</h3>
            <div
              className={`relative group bg-white rounded-2xl border-2 border-dashed transition-all duration-300 ease-out p-10 text-center cursor-pointer
                ${dragActive
                  ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                  : 'border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5'
                }
                ${isLoading ? 'opacity-80 pointer-events-none' : ''}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileChange}
                disabled={isLoading}
              />

              <div className="flex flex-col items-center justify-center space-y-5">
                <div className={`p-4 rounded-2xl transition-colors duration-300 ${dragActive
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                  }`}>
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : fileName ? (
                    <FileText className="w-8 h-8" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {isLoading ? 'AI Analysis in Progress...' : fileName ? 'Resume Uploaded' : 'Upload Your Resume'}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    {isLoading ? 'Searching live job boards with advanced algorithms...' : fileName ? fileName : 'Drag & drop or click to browse (PDF, DOCX, TXT)'}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-700 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Results Area */}
        {analysis && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Enhanced Analysis Dashboard */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-12">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <Target className="w-6 h-6 text-blue-600" />
                  Enhanced Profile Analysis
                </h2>
                <div className="flex items-center gap-4">
                  {searchStats && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-200 shadow-sm">
                      <Search className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{searchStats.total_searches} Searches</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Analyzed</span>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* Core Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[
                    {
                      label: "Experience Level",
                      value: analysis.experience,
                      icon: GraduationCap,
                      color: "text-purple-600 bg-purple-50 border-purple-100"
                    },
                    {
                      label: "Target Location",
                      value: analysis.location,
                      icon: MapPin,
                      color: "text-blue-600 bg-blue-50 border-blue-100"
                    },
                    {
                      label: "Core Skills",
                      value: analysis.core_skills?.length > 0 ? `${analysis.core_skills.length} Identified` : "None",
                      icon: Award,
                      color: "text-green-600 bg-green-50 border-green-100"
                    },
                    {
                      label: "Industry Focus",
                      value: analysis.industry || "General",
                      icon: Building2,
                      color: "text-orange-600 bg-orange-50 border-orange-100"
                    }
                  ].map((stat, idx) => (
                    <div key={idx} className="relative overflow-hidden bg-white rounded-xl border border-slate-100 p-6 hover:shadow-lg transition-all duration-300 group">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl border ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                          <p className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{stat.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skills and Roles Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Core Skills */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      Core Skills (Top Priority)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.core_skills?.map((skill, idx) => (
                        <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Roles */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Ideal Next Roles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.preferred_roles?.map((role, idx) => (
                        <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* All Skills */}
                {analysis.all_skills && analysis.all_skills.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">All Detected Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.all_skills.slice(0, 15).map((skill, idx) => (
                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {skill}
                        </span>
                      ))}
                      {analysis.all_skills.length > 15 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-500 border border-dashed border-slate-300">
                          +{analysis.all_skills.length - 15} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Jobs Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  Smart Job Matches
                  <span className="text-sm font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                    {jobs.length} Found
                  </span>
                </h2>
                <p className="text-slate-500 mt-2 text-sm">Real-time opportunities from live job boards, ranked by AI compatibility.</p>
              </div>
            </div>

            {/* Enhanced Jobs Grid */}
            {jobs.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {jobs.map((job, index) => (
                  <div
                    key={index}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
                  >
                    {/* Match Score Badge */}
                    {job.match_score && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${getMatchScoreColor(job.match_score)}`}>
                          {job.match_score} Match
                        </span>
                      </div>
                    )}

                    <div className="p-8 flex flex-col h-full">
                      {/* Job Header */}
                      <div className="flex gap-4 mb-6">
                        <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                          <Building2 className="w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                            {job.title}
                          </h3>
                          <p className="text-slate-500 font-semibold text-sm mt-1">{job.company}</p>
                        </div>
                      </div>

                      {/* Enhanced Metadata */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-sm font-medium border border-slate-100">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {job.location}
                        </div>
                        {job.salary && job.salary !== "Not disclosed" && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                            <IndianRupee className="w-4 h-4" />
                            {job.salary}
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                          <Clock className="w-4 h-4" />
                          Full-time
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-6 flex-grow">
                        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                          {job.description}
                        </p>
                      </div>

                      {/* Key Requirements */}
                      {job.key_requirements && job.key_requirements.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Key Requirements</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {job.key_requirements.slice(0, 3).map((req, idx) => (
                              <span key={idx} className="inline-block text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {req}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matching Skills */}
                      {job.matching_skills && job.matching_skills.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Your Skills Match
                          </h5>
                          <div className="flex flex-wrap gap-1.5">
                            {job.matching_skills.slice(0, 4).map((skill, idx) => (
                              <span key={idx} className="inline-block text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Footer */}
                      <div className="pt-6 border-t border-slate-100 mt-auto flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Posted recently
                        </span>

                        <a
                          href={job.apply_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 hover:scale-105"
                        >
                          Apply Now
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <Search className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">No Matches Found</h3>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                  The enhanced AI system couldn't find exact matches for your profile in current live listings. Try adjusting your location or industry preferences.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Enhanced Custom Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default EnhancedJobSearchPage;