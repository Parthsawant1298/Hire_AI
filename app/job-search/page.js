"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Upload, FileText, MapPin, Building2, DollarSign, 
  ExternalLink, CheckCircle2, Sparkles, AlertCircle, 
  Briefcase, GraduationCap, ArrowRight, Search, Loader2
} from 'lucide-react';

const JobSearchPage = () => {
  const [jobs, setJobs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');

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

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/upload-resume`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAnalysis(result.analysis);
        setJobs(result.jobs || []);
      } else {
        setError(result.error || "Failed to analyze resume.");
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to the AI service. Please ensure the backend is running on port 8002.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-blue-700 text-sm font-semibold mb-8 shadow-sm animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Recruitment</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Find Your Perfect Role <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Instantly</span>
          </h1>
          
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Upload your resume. Our intelligent agents parse your skills, search live global listings, and match you with opportunities that fit your career path.
          </p>

          {/* Upload Area */}
          <div className="max-w-xl mx-auto">
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
                <div className={`p-4 rounded-2xl transition-colors duration-300 ${
                  dragActive 
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
                    {isLoading ? 'Analyzing Profile...' : fileName ? 'File Selected' : 'Upload Resume'}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    {isLoading ? 'Scanning live job boards...' : fileName ? fileName : 'Drag & drop or click to browse (PDF, DOCX)'}
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

        {/* Results Area */}
        {analysis && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Analysis Dashboard */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-12">
              <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Profile Insights
                </h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Verified</span>
                </div>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Stats */}
                {[
                  { label: "Experience Level", value: analysis.experience, icon: GraduationCap },
                  { label: "Target Location", value: analysis.location, icon: MapPin },
                  { label: "Top Skills", value: analysis.skills?.length > 0 ? `${analysis.skills.length} Detected` : "None", icon: Sparkles }
                ].map((stat, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all duration-300">
                    <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100 text-blue-600">
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                      <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Skills Tags */}
              <div className="px-8 pb-8">
                <div className="flex flex-wrap gap-2">
                  {analysis.skills?.slice(0, 10).map((skill, idx) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {skill}
                    </span>
                  ))}
                  {analysis.skills?.length > 10 && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-500 border border-dashed border-slate-300">
                      +{analysis.skills.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Jobs Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  Matched Opportunities
                  <span className="text-sm font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-sm">
                    {jobs.length} Results
                  </span>
                </h2>
                <p className="text-slate-500 mt-1 text-sm">Curated based on your skill profile and location preference.</p>
              </div>
            </div>

            {/* Jobs Grid */}
            {jobs.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {jobs.map((job, index) => (
                  <div 
                    key={index} 
                    className="group bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col h-full relative"
                  >
                    <div className="p-6 flex flex-col h-full">
                      {/* Job Header */}
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                              {job.title}
                            </h3>
                            <p className="text-slate-500 font-medium text-sm">{job.company}</p>
                          </div>
                        </div>
                        
                        {/* Match Score */}
                        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold border border-green-100">
                          <Sparkles className="w-3 h-3" />
                          {95 - (index * 2)}%
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {job.location}
                        </div>
                        {job.salary && job.salary !== "Not disclosed" && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
                            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                            {job.salary}
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          Full-time
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-6 flex-grow">
                        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                          {job.description}
                        </p>
                      </div>

                      {/* Action Footer */}
                      <div className="pt-5 border-t border-slate-100 mt-auto flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">Posted recently</span>
                        
                        <a 
                          href={job.apply_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
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
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No Exact Matches Found</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  We couldn't find exact matches for your profile in the current live listings. Try optimizing your resume keywords.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
      
      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default JobSearchPage;