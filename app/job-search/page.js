"use client";

import React, { useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Upload, FileText, MapPin, Building2, IndianRupee,
  ExternalLink, CheckCircle2, Sparkles, AlertCircle,
  Briefcase, GraduationCap, ArrowRight, Search, Loader2,
  Target, TrendingUp, Award, Clock, Star, DollarSign,
  MonitorSmartphone, Users, ChevronDown, BarChart2
} from 'lucide-react';

// ============================================================
// CONFIG
// ============================================================
const API_BASE = "http://localhost:8002";

const JOB_TYPES = ["Any", "Remote", "On-site", "Hybrid"];

const LOCATION_SUGGESTIONS = [
  "Mumbai", "Bangalore", "Delhi NCR", "Hyderabad", "Pune",
  "Chennai", "Remote", "San Francisco", "New York", "London"
];

const INDUSTRY_SUGGESTIONS = [
  "Technology", "Finance & Fintech", "Healthcare", "E-commerce",
  "EdTech", "SaaS", "Consulting", "Gaming", "AI/ML", "Cybersecurity"
];

// ============================================================
// HELPERS
// ============================================================
const getScoreColor = (score) => {
  if (score >= 80) return { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", bar: "bg-emerald-500" };
  if (score >= 60) return { badge: "bg-blue-100 text-blue-800 border-blue-200",    bar: "bg-blue-500" };
  if (score >= 40) return { badge: "bg-amber-100 text-amber-800 border-amber-200", bar: "bg-amber-500" };
  return                  { badge: "bg-slate-100 text-slate-600 border-slate-200", bar: "bg-slate-400" };
};

const getJobTypeColor = (type) => {
  switch (type?.toLowerCase()) {
    case "remote":   return "bg-green-50 text-green-700 border-green-200";
    case "on-site":  return "bg-blue-50 text-blue-700 border-blue-200";
    case "hybrid":   return "bg-purple-50 text-purple-700 border-purple-200";
    default:         return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

// ============================================================
// COMPONENT
// ============================================================
export default function JobSearchPage() {
  const [jobs,        setJobs]        = useState([]);
  const [analysis,    setAnalysis]    = useState(null);
  const [searchStats, setSearchStats] = useState(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState(null);
  const [fileName,    setFileName]    = useState("");
  const [dragActive,  setDragActive]  = useState(false);

  // Filters
  const [location,  setLocation]  = useState("");
  const [jobType,   setJobType]   = useState("Any");
  const [salary,    setSalary]    = useState("");
  const [industry,  setIndustry]  = useState("");

  const fileInputRef = useRef(null);

  // ---- Drag & Drop ----
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  // ---- Core submit ----
  const processFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);
    setError(null);
    setJobs([]);
    setAnalysis(null);
    setSearchStats(null);

    const formData = new FormData();
    formData.append("file",               file);
    formData.append("location",           location.trim() || "Remote");
    formData.append("job_type",           jobType);
    formData.append("salary_expectation", salary.trim());
    formData.append("industry",           industry.trim());

    try {
      const res  = await fetch(`${API_BASE}/upload-resume`, { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setAnalysis(data.analysis);
        setJobs(data.jobs || []);
        setSearchStats(data.search_stats || {});
      } else {
        setError(data.error || "Analysis failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Cannot connect to the AI backend. Make sure it's running on port 8002.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ---- HERO ---- */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-blue-700 text-sm font-semibold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4" />
              AI-Powered Job Matching
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
              Upload Resume.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Get Matched.
              </span>
            </h1>
            <p className="text-slate-500 max-w-xl mx-auto text-base leading-relaxed">
              Our AI analyzes your resume, runs 5 targeted job searches across Naukri, LinkedIn, Greenhouse & more, then scores every result against your profile.
            </p>
          </div>

          {/* ---- FILTERS ---- */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
              Step 1 — Set Your Job Preferences
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    list="location-list"
                    placeholder="e.g. Bangalore, Remote"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <datalist id="location-list">
                    {LOCATION_SUGGESTIONS.map(l => <option key={l} value={l} />)}
                  </datalist>
                </div>
              </div>

              {/* Job Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Work Type</label>
                <div className="flex gap-1.5 flex-wrap">
                  {JOB_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setJobType(t)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all
                        ${jobType === t
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Salary */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Salary Expectation
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. 8L - 15L PA or $80k"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Industry */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Industry</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    list="industry-list"
                    placeholder="e.g. Technology, Fintech"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <datalist id="industry-list">
                    {INDUSTRY_SUGGESTIONS.map(i => <option key={i} value={i} />)}
                  </datalist>
                </div>
              </div>

            </div>
          </div>

          {/* ---- UPLOAD ---- */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Step 2 — Upload Your Resume
            </p>
            <div
              className={`relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200
                ${dragActive   ? "border-blue-500 bg-blue-50"
                : isLoading    ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-70"
                : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/30"}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isLoading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileChange}
                disabled={isLoading}
              />

              <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-2xl ${dragActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : fileName ? (
                    <FileText className="w-8 h-8 text-blue-600" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <p className="font-semibold text-slate-800 text-base">
                    {isLoading
                      ? "AI is analyzing your resume & searching jobs..."
                      : fileName
                      ? `${fileName} — click to change`
                      : "Drag & drop your resume here"}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {isLoading
                      ? "This takes 30–60 seconds. Running 5 targeted searches..."
                      : "PDF, DOCX, or TXT · Max 10MB"}
                  </p>
                </div>

                {!isLoading && !fileName && (
                  <button
                    type="button"
                    className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Browse Files
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* ---- RESULTS ---- */}
          {analysis && (
            <div className="space-y-10">

              {/* Profile Analysis Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Resume Analysis
                  </h2>
                  <div className="flex items-center gap-2">
                    {searchStats && (
                      <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                        {searchStats.queries_run} searches ran
                      </span>
                    )}
                    <span className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                      {searchStats?.jobs_found || jobs.length} jobs found
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { icon: GraduationCap, label: "Experience",  value: analysis.experience,        color: "text-purple-600 bg-purple-50 border-purple-100" },
                      { icon: MapPin,        label: "Location",    value: analysis.location,           color: "text-blue-600 bg-blue-50 border-blue-100" },
                      { icon: Building2,     label: "Industry",    value: analysis.industry || "—",    color: "text-orange-600 bg-orange-50 border-orange-100" },
                      { icon: Briefcase,     label: "Work Type",   value: analysis.job_type || "Any",  color: "text-green-600 bg-green-50 border-green-100" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-white">
                        <div className={`p-2 rounded-lg border ${s.color}`}>
                          <s.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">{s.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Skills + Roles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-500" /> Core Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.core_skills?.map((s, i) => (
                          <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Target Roles
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.preferred_roles?.map((r, i) => (
                          <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* All skills */}
                  {analysis.all_skills?.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">All Detected Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.all_skills.slice(0, 20).map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                            {s}
                          </span>
                        ))}
                        {analysis.all_skills.length > 20 && (
                          <span className="px-2.5 py-1 bg-white text-slate-400 text-xs rounded-md border border-dashed border-slate-300">
                            +{analysis.all_skills.length - 20} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Jobs Section */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    Job Matches
                    <span className="text-sm font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                      {jobs.length} results
                    </span>
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />80+ Great</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />60+ Good</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />40+ Fair</span>
                  </div>
                </div>

                {jobs.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="font-semibold text-slate-600">No jobs found for your profile</p>
                    <p className="text-sm text-slate-400 mt-1">Try adjusting your location or industry filters and re-upload.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {jobs.map((job, idx) => {
                      const sc = getScoreColor(job.match_score);
                      return (
                        <div
                          key={idx}
                          className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden"
                        >
                          {/* Score bar at top */}
                          <div className={`h-1 w-full ${sc.bar}`} style={{ width: `${job.match_score}%` }} />

                          <div className="p-5 flex flex-col flex-grow">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                                  <Building2 className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                                    {job.title}
                                  </h3>
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">{job.company}</p>
                                </div>
                              </div>
                              {/* Match score badge */}
                              <div className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl border font-extrabold text-lg ${sc.badge}`}>
                                {job.match_score}
                              </div>
                            </div>

                            {/* Meta chips */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200">
                                <MapPin className="w-3 h-3" />{job.location}
                              </span>
                              {job.job_type && (
                                <span className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border ${getJobTypeColor(job.job_type)}`}>
                                  <MonitorSmartphone className="w-3 h-3" />{job.job_type}
                                </span>
                              )}
                              {job.salary && (
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-lg border border-green-200">
                                  <IndianRupee className="w-3 h-3" />{job.salary}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3 flex-grow">
                              {job.description}
                            </p>

                            {/* Matching skills */}
                            {job.matching_skills?.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Skills matched
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {job.matching_skills.slice(0, 4).map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded border border-emerald-200">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Requirements */}
                            {job.key_requirements?.length > 0 && (
                              <div className="mb-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Requirements</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {job.key_requirements.slice(0, 3).map((r, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded border border-slate-200">
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Apply button */}
                            <div className="mt-auto pt-4 border-t border-slate-100">
                              <a
                                href={job.apply_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-md"
                              >
                                Apply Now <ArrowRight className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}