"use client";

import React, { useState, useRef } from "react";
import {
  Upload, Download, Loader2, CheckCircle2, AlertCircle,
  FileText, Sparkles, Zap, TrendingUp, Shield, ArrowRight,
  BarChart2, Eye, XCircle, Target, ChevronRight, Info,
  Briefcase, Star
} from "lucide-react";

const API_BASE = "http://localhost:8000";

// ─── pipeline steps shown during processing ───────────────
const STEPS = [
  { label: "Extracting resume content",    desc: "Parsing all sections, bullets, skills..." },
  { label: "Rewriting bullet points",      desc: "Applying Strong Verb + Tech + Scope + Impact formula..." },
  { label: "JD keyword matching",          desc: "Analysing keyword gaps vs job description..." },
  { label: "Grammar & language polish",    desc: "Fixing tense, spelling, punctuation..." },
  { label: "Generating ATS audit report",  desc: "Scoring before/after, building feedback..." },
];

// ─── helpers ──────────────────────────────────────────────
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function ScoreGauge({ label, value, color }) {
  const pct = clamp(value, 0, 100);
  const barColor =
    pct >= 80 ? "bg-emerald-500" :
    pct >= 65 ? "bg-blue-500"    :
    pct >= 45 ? "bg-amber-400"   : "bg-red-400";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span className={pct >= 80 ? "text-emerald-600" : pct >= 65 ? "text-blue-600" : "text-amber-600"}>
          {value}/100
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Badge({ children, color = "slate" }) {
  const map = {
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
    slate:  "bg-slate-100 text-slate-600 border-slate-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[color]}`}>
      {children}
    </span>
  );
}

// ─── main component ───────────────────────────────────────
export default function ResumeOptimizer() {
  const [file,         setFile]         = useState(null);
  const [jd,           setJd]           = useState("");
  const [showJd,       setShowJd]       = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep,  setCurrentStep]  = useState(0);
  const [error,        setError]        = useState("");
  const [result,       setResult]       = useState(null);
  const [dragActive,   setDragActive]   = useState(false);
  const [activeTab,    setActiveTab]    = useState("fixes");

  const fileRef     = useRef(null);
  const stepTimer   = useRef(null);

  // ── drag & drop ──
  const onDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pick(f);
  };

  const pick = (f) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) { setError("PDF files only."); return; }
    if (f.size > 10 * 1024 * 1024) { setError("Max 10MB."); return; }
    setFile(f); setError(""); setResult(null);
  };

  // ── step progress ──
  const startSteps = () => {
    let s = 1; setCurrentStep(1);
    stepTimer.current = setInterval(() => {
      s++;
      if (s <= STEPS.length) setCurrentStep(s);
      else clearInterval(stepTimer.current);
    }, 15000);
  };
  const stopSteps = () => {
    clearInterval(stepTimer.current);
    setCurrentStep(STEPS.length + 1);
  };

  // ── submit ──
  const handleUpload = async () => {
    if (!file) { setError("Select a file first."); return; }
    setIsProcessing(true); setError(""); setResult(null);
    startSteps();

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("job_description", jd.trim());

      const res  = await fetch(`${API_BASE}/process-resume`, { method: "POST", body: fd });
      const data = await res.json();
      stopSteps();

      if (!res.ok) throw new Error(data.detail || "Processing failed.");
      if (!data.success) throw new Error("Server returned unsuccessful.");

      setResult({
        downloadUrl: `${API_BASE}${data.download_url}`,
        resumeData:  data.resume_data,
        feedback:    data.feedback,
        audit:       data.audit_report,
      });
    } catch (err) {
      stopSteps();
      setError(err.message || "Failed. Ensure backend is running on port 8000.");
    } finally {
      setIsProcessing(false); setCurrentStep(0);
    }
  };

  const reset = () => {
    setFile(null); setResult(null); setError(""); setJd("");
    setShowJd(false); if (fileRef.current) fileRef.current.value = "";
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  const fb = result?.feedback;

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* ── HEADER ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-5 border border-blue-100">
            <Sparkles className="w-4 h-4" /> World-Class AI Resume Optimizer
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Resume Optimizer
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
            5-node AI pipeline: extracts → rewrites bullets (no fake metrics) →
            matches JD keywords → polishes grammar → scores ATS compatibility.
          </p>
        </div>

        {/* ── PIPELINE STEPS (static) ── */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {["Extract", "Enhance", "JD Match", "Grammar", "Audit"].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                <span className="text-xs font-bold text-blue-700">{i + 1}</span>
              </div>
              <p className="text-[11px] font-bold text-slate-700">{s}</p>
            </div>
          ))}
        </div>

        {/* ── UPLOAD CARD ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">

          {/* JD toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upload Resume</p>
            <button
              onClick={() => setShowJd(!showJd)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                showJd ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              {showJd ? "JD Added ✓" : "+ Add Job Description"}
            </button>
          </div>

          {/* JD textarea */}
          {showJd && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Paste Job Description <span className="text-slate-400 font-normal">(enables keyword matching — 10x higher interview rate)</span>
              </label>
              <textarea
                rows={5}
                value={jd}
                onChange={e => setJd(e.target.value)}
                placeholder="Paste the full job description here..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
              {jd && (
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> JD ready — Node 3 will match keywords
                </p>
              )}
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer
              ${dragActive    ? "border-blue-500 bg-blue-50"
              : isProcessing  ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
              : file          ? "border-blue-400 bg-blue-50/30"
              :                 "border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"}`}
            onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
            onClick={() => !isProcessing && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf"
              onChange={e => e.target.files?.[0] && pick(e.target.files[0])}
              disabled={isProcessing}
            />

            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-2xl ${file ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                {isProcessing
                  ? <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  : file ? <FileText className="w-8 h-8" />
                  : <Upload className="w-8 h-8" />}
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  {isProcessing ? "AI pipeline running..." : file ? file.name : "Drop your resume here"}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {isProcessing ? `Step ${currentStep} of ${STEPS.length}: ${STEPS[currentStep - 1]?.desc || "finalising..."}` :
                   file ? `${(file.size / 1024).toFixed(0)} KB · click to change` : "PDF only · Max 10MB"}
                </p>
              </div>
              {!isProcessing && !file && (
                <button type="button"
                  className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors"
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                >Browse Files</button>
              )}
              {file && !isProcessing && (
                <button type="button" onClick={e => { e.stopPropagation(); reset(); }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                  <XCircle className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Processing step list */}
          {isProcessing && currentStep > 0 && (
            <div className="mt-5 space-y-2">
              {STEPS.map((step, i) => {
                const num     = i + 1;
                const done    = currentStep > num;
                const current = currentStep === num;
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    done    ? "bg-emerald-50 border-emerald-200" :
                    current ? "bg-blue-50 border-blue-200" :
                              "bg-slate-50 border-slate-100 opacity-40"}`}>
                    {done    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> :
                     current ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" /> :
                               <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${done ? "text-emerald-700" : current ? "text-blue-800" : "text-slate-500"}`}>
                        {step.label} {num === 3 && !jd ? <span className="text-slate-400 font-normal text-xs">(skipped — no JD)</span> : ""}
                      </p>
                      {current && <p className="text-xs text-blue-500 mt-0.5">{step.desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* CTA */}
          {!result && (
            <button onClick={handleUpload} disabled={!file || isProcessing}
              className="w-full mt-5 py-3.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {isProcessing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                : <><Sparkles className="w-4 h-4" /> Optimize My Resume</>}
            </button>
          )}
        </div>

        {/* ── RESULTS ── */}
        {result && fb && (
          <div className="space-y-5">

            {/* ATS Score card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-600" /> ATS Score
                </h2>
                <Badge color={fb.ats_score_after >= 80 ? "green" : fb.ats_score_after >= 65 ? "blue" : "amber"}>
                  {fb.quality_score}
                </Badge>
              </div>

              <div className="space-y-4">
                <ScoreGauge label="Before optimization" value={fb.ats_score_before} />
                <ScoreGauge label="After optimization"  value={fb.ats_score_after}  />
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">+{fb.score_gain} ATS points gained</span>
                </div>
              </div>

              {/* JD match (if enabled) */}
              {fb.jd_match?.enabled && fb.jd_match.match_rate > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-600" /> JD Keyword Match
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-extrabold text-blue-600">{fb.jd_match.match_rate}%</div>
                    <div className="text-sm text-slate-600">
                      <p><span className="font-semibold">{fb.jd_match.keywords_found?.length || 0}</span> keywords found</p>
                      <p><span className="font-semibold text-emerald-600">{fb.jd_match.keywords_added?.length || 0}</span> keywords injected</p>
                    </div>
                  </div>
                  {fb.jd_match.keywords_added?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {fb.jd_match.keywords_added.map((kw, i) => (
                        <Badge key={i} color="green">{kw}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Issues Found",      value: fb.total_issues_found,  bg: "bg-orange-50 border-orange-200 text-orange-700" },
                { label: "Fixes Applied",     value: fb.total_fixes_applied, bg: "bg-blue-50 border-blue-200 text-blue-700" },
                { label: "Weak Verbs Fixed",  value: fb.weak_verbs_fixed,    bg: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl border p-4 text-center ${s.bg}`}>
                  <p className="text-3xl font-extrabold">{s.value}</p>
                  <p className="text-xs font-semibold mt-1 opacity-80">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabbed feedback */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200">
                {[
                  { id: "fixes",    label: "✅ Fixes Applied" },
                  { id: "issues",   label: "⚠️ Issues Found" },
                  { id: "examples", label: "📝 Before / After" },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-700 bg-blue-50/40"
                        : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5 max-h-80 overflow-y-auto">

                {activeTab === "fixes" && (
                  <ul className="space-y-2.5">
                    {fb.fixes_applied?.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                {activeTab === "issues" && (
                  <ul className="space-y-2.5">
                    {fb.issues_found?.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}

                {activeTab === "examples" && (
                  <div className="space-y-4">
                    {fb.bullet_examples?.length > 0 ? (
                      fb.bullet_examples.map((ex, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                          <div className="px-4 py-3 bg-red-50 border-b border-slate-200">
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">❌ Before</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{ex.before}</p>
                          </div>
                          <div className="px-4 py-3 bg-emerald-50">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">✅ After</p>
                            <p className="text-sm text-slate-800 font-medium leading-relaxed">{ex.after}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 text-center py-6">
                        No before/after examples — all bullets were already well-structured.
                      </p>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Data integrity */}
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-900">Data Integrity Guaranteed</p>
                <p className="text-xs text-blue-600">{fb.data_integrity}</p>
              </div>
            </div>

            {/* Resume summary */}
            {result.resumeData?.full_name && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Resume Preview</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  {[
                    ["Name",       result.resumeData.full_name],
                    ["Email",      result.resumeData.email],
                    ["Experience", `${result.resumeData.experience_list?.length || 0} roles`],
                    ["Education",  `${result.resumeData.education?.length || 0} entries`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="font-semibold text-slate-600">{k}: </span>
                      <span className="text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={() => window.open(result.downloadUrl, "_blank")}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Download className="w-5 h-5" /> Download Optimized Resume
              </button>
              <button onClick={reset}
                className="px-5 py-3.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-colors text-sm">
                Optimize Another
              </button>
            </div>

          </div>
        )}

        {/* ── FEATURE CARDS (shown before result) ── */}
        {!result && !isProcessing && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[
              {
                icon: Zap, color: "bg-blue-100 text-blue-600",
                title: "Fresher-Aware Bullets",
                desc:  "No fake metrics — we use Specificity + Technology + Scope to make entry-level bullets powerful without lying."
              },
              {
                icon: Target, color: "bg-purple-100 text-purple-600",
                title: "JD Keyword Matching",
                desc:  "Paste a job description and get Jobscan-style keyword injection. Research shows 10.6x higher interview rate."
              },
              {
                icon: Shield, color: "bg-emerald-100 text-emerald-600",
                title: "Zero Hallucination",
                desc:  "AI never adds fake companies, skills, or numbers. Only language and structure improve — your facts stay exact."
              },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}