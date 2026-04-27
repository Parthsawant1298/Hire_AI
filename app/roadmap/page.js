"use client";

import React, { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  CheckCircle2, Circle, ArrowRight, BookOpen, Video,
  FileText, ChevronDown, ChevronUp, Loader2, Trophy,
  Search, Github, ExternalLink, GraduationCap, Zap,
  Star, Target, FlaskConical, Cloud, Code2, Database,
  Rocket, BarChart3, Brain, AlertCircle
} from "lucide-react";

const API_BASE = "http://localhost:8004";

// Safe storage (no crash on SSR)
const store = {
  get: (k) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// Resource icon by type
const ResIcon = ({ type }) => {
  const map = {
    video:    <Video      className="h-3 w-3 text-red-500    flex-shrink-0" />,
    course:   <GraduationCap className="h-3 w-3 text-purple-500 flex-shrink-0" />,
    github:   <Github    className="h-3 w-3 text-slate-700  flex-shrink-0" />,
    doc:      <BookOpen  className="h-3 w-3 text-blue-500   flex-shrink-0" />,
    practice: <FlaskConical className="h-3 w-3 text-orange-500 flex-shrink-0" />,
  };
  return map[type] || <FileText className="h-3 w-3 text-green-500 flex-shrink-0" />;
};

// Phase icon based on content
const PhaseIcon = ({ title }) => {
  const t = (title || "").toLowerCase();
  if (t.includes("math") || t.includes("foundation"))      return <Brain     className="w-4 h-4" />;
  if (t.includes("python") || t.includes("programm"))      return <Code2     className="w-4 h-4" />;
  if (t.includes("data"))                                   return <Database  className="w-4 h-4" />;
  if (t.includes("deploy") || t.includes("production"))    return <Rocket    className="w-4 h-4" />;
  if (t.includes("cloud") || t.includes("mlops"))          return <Cloud     className="w-4 h-4" />;
  if (t.includes("deep") || t.includes("neural"))          return <Brain     className="w-4 h-4" />;
  if (t.includes("project") || t.includes("portfolio"))    return <Target    className="w-4 h-4" />;
  if (t.includes("eval") || t.includes("metric"))          return <BarChart3 className="w-4 h-4" />;
  return <BookOpen className="w-4 h-4" />;
};

const LEVELS = [
  { id: "Beginner",     icon: Star,         color: "text-green-600  bg-green-50  border-green-200",  activeColor: "bg-green-600  border-green-600  text-white" },
  { id: "Intermediate", icon: Zap,          color: "text-blue-600   bg-blue-50   border-blue-200",   activeColor: "bg-blue-600   border-blue-600   text-white" },
  { id: "Advanced",     icon: Trophy,       color: "text-purple-600 bg-purple-50 border-purple-200", activeColor: "bg-purple-600 border-purple-600 text-white" },
];

const QUICK_TOPICS = [
  { label: "Machine Learning",       hint: "end to end with deployment" },
  { label: "React.js",               hint: "" },
  { label: "System Design",          hint: "" },
  { label: "Python",                 hint: "for data science" },
  { label: "DevOps & Kubernetes",    hint: "" },
  { label: "Data Science",           hint: "" },
  { label: "Deep Learning",          hint: "" },
  { label: "Full Stack Development", hint: "" },
];

// Pipeline steps displayed during loading
const PIPELINE_STEPS = [
  { label: "Understanding your intent",       desc: "Extracting real topic and goal from your input..." },
  { label: "Designing complete roadmap",      desc: "Planning all phases including deployment & production..." },
  { label: "Finding real resources",          desc: "Searching docs, YouTube, Coursera, Kaggle..." },
  { label: "Writing detailed content",        desc: "Assigning verified resources to each step..." },
];

// ============================================================
// COMPONENT
// ============================================================
export default function RoadmapPage() {
  const [topic,          setTopic]          = useState("");
  const [level,          setLevel]          = useState("Beginner");
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [currentStep,    setCurrentStep]    = useState(0);
  const [roadmap,        setRoadmap]        = useState(null);
  const [meta,           setMeta]           = useState(null);
  const [error,          setError]          = useState("");
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [expandedPhases, setExpandedPhases] = useState(new Set([0]));

  const resultsRef = useRef(null);
  const stepTimer  = useRef(null);

  // Restore progress
  const restoreProgress = (rm) => {
    const saved = store.get(`rp_${rm.title}`);
    if (saved) setCompletedSteps(new Set(saved));
    else        setCompletedSteps(new Set());
  };

  const toggleStep = (id) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (roadmap?.title) store.set(`rp_${roadmap.title}`, Array.from(next));
      return next;
    });
  };

  const togglePhase = (idx) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // Step progress animation
  const startSteps = () => {
    let s = 1; setCurrentStep(1);
    stepTimer.current = setInterval(() => {
      s++;
      if (s <= PIPELINE_STEPS.length) setCurrentStep(s);
      else clearInterval(stepTimer.current);
    }, 18000);
  };
  const stopSteps = () => { clearInterval(stepTimer.current); setCurrentStep(0); };

  const handleGenerate = async (e, quickTopic = null) => {
    e?.preventDefault();
    const inputTopic = quickTopic || topic.trim();
    if (!inputTopic) return;

    setIsGenerating(true); setError(""); setRoadmap(null); setMeta(null);
    setExpandedPhases(new Set([0])); startSteps();

    try {
      const res  = await fetch(`${API_BASE}/generate-roadmap`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: inputTopic, level }),
      });
      const data = await res.json();
      stopSteps();

      if (data.success && data.roadmap) {
        setRoadmap(data.roadmap);
        setMeta(data.meta || null);
        restoreProgress(data.roadmap);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      } else {
        setError(data.error || "Generation failed. Please try again.");
      }
    } catch (err) {
      stopSteps();
      setError("Cannot connect to backend. Make sure it's running on port 8004.");
    } finally {
      setIsGenerating(false); stopSteps();
    }
  };

  const totalSteps = roadmap?.phases?.reduce((a, p) => a + (p.steps?.length || 0), 0) || 0;
  const progress   = totalSteps === 0 ? 0 : Math.round((completedSteps.size / totalSteps) * 100);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />

      <main className="pt-24 pb-20">

        {/* ── HERO ── */}
        <div className="max-w-3xl mx-auto px-4 text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-5 border border-blue-100">
            <Brain className="w-4 h-4" /> AI Roadmap Agent — Understands What You Actually Want
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Professional Roadmap Generator
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl mx-auto mb-8">
            Type anything — <em>"I want to learn ML end to end"</em> or just <em>"Machine Learning"</em>. 
            The AI understands your intent, designs a <strong>complete roadmap</strong> (including Deployment & MLOps for AI/ML), 
            and fetches <strong>real verified resources</strong>.
          </p>

          {/* Level selector */}
          <div className="flex justify-center gap-2 mb-6">
            {LEVELS.map(({ id, icon: Icon, color, activeColor }) => (
              <button key={id} onClick={() => setLevel(id)} disabled={isGenerating}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${level === id ? activeColor : `bg-white ${color} hover:shadow-sm`}`}>
                <Icon className="w-4 h-4" /> {id}
              </button>
            ))}
          </div>

          {/* Search form */}
          <form onSubmit={handleGenerate} className="relative max-w-xl mx-auto mb-4">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text" value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g. "Machine Learning", "I want to become a React dev", "MLOps"...'
              className="w-full pl-11 pr-32 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
              disabled={isGenerating}
            />
            <button type="submit" disabled={isGenerating || !topic.trim()}
              className="absolute right-1.5 top-1.5 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Rocket className="h-3.5 w-3.5" /> Generate</>}
            </button>
          </form>

          {/* Quick topics */}
          {!roadmap && !isGenerating && (
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_TOPICS.map(({ label, hint }) => (
                <button key={label}
                  onClick={() => { setTopic(label + (hint ? ` ${hint}` : "")); }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full border border-slate-200 hover:border-blue-300 transition-all shadow-sm">
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Pipeline steps during generation */}
          {isGenerating && currentStep > 0 && (
            <div className="mt-8 space-y-2 text-left max-w-md mx-auto">
              {PIPELINE_STEPS.map((step, i) => {
                const num  = i + 1;
                const done = currentStep > num;
                const curr = currentStep === num;
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${done ? "bg-emerald-50 border-emerald-200" : curr ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100 opacity-40"}`}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> :
                     curr ? <Loader2     className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" /> :
                            <div        className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                    <div>
                      <p className={`text-sm font-semibold ${done ? "text-emerald-700" : curr ? "text-blue-800" : "text-slate-500"}`}>{step.label}</p>
                      {curr && <p className="text-xs text-blue-500 mt-0.5">{step.desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* ── ROADMAP RESULTS ── */}
        {roadmap && (
          <div ref={resultsRef} className="max-w-4xl mx-auto px-4 sm:px-6">

            {/* Intent clarification banner */}
            {meta?.understood_topic && (
              <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Brain className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-semibold text-blue-800">AI understood: </span>
                  <span className="text-blue-700">Topic — <strong>{meta.understood_topic}</strong></span>
                  {meta.understood_goal && <span className="text-blue-600 ml-2">· Goal: {meta.understood_goal}</span>}
                </div>
              </div>
            )}

            {/* Sticky progress bar */}
            <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 pb-4 mb-8 pt-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-extrabold text-lg text-slate-900">{roadmap.title}</h2>
                  {roadmap.subtitle && <p className="text-xs text-slate-500 mt-0.5">{roadmap.subtitle}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-500">{roadmap.level} · {roadmap.total_duration}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${progress === 100 ? "bg-green-100 text-green-700" : progress > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Phases */}
            <div className="space-y-4">
              {roadmap.phases?.map((phase, pi) => {
                const phaseSteps     = phase.steps?.length || 0;
                const phaseDone      = phase.steps?.filter((_, si) => completedSteps.has(`${pi}-${si}`)).length || 0;
                const phasePct       = phaseSteps === 0 ? 0 : Math.round((phaseDone / phaseSteps) * 100);
                const isExpanded     = expandedPhases.has(pi);
                const isProjectPhase = phase.is_project_phase;

                return (
                  <div key={pi} className={`border rounded-2xl overflow-hidden shadow-sm transition-all ${isProjectPhase ? "border-orange-200" : "border-slate-200"}`}>

                    {/* Phase header */}
                    <button onClick={() => togglePhase(pi)}
                      className={`w-full flex items-center justify-between p-5 text-left transition-colors ${isProjectPhase ? "bg-orange-50 hover:bg-orange-100" : "bg-slate-50 hover:bg-slate-100"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isProjectPhase ? "bg-orange-100 text-orange-600" : "bg-white text-blue-600 border border-slate-200"}`}>
                          <PhaseIcon title={phase.title} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isProjectPhase ? "text-orange-600" : "text-blue-600"}`}>
                              Phase {pi + 1}
                            </span>
                            <span className="text-[11px] text-slate-400">·</span>
                            <span className="text-[11px] text-slate-500">{phase.duration}</span>
                            {isProjectPhase && <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full border border-orange-200">PROJECT</span>}
                            <span className="text-[11px] text-slate-400">·</span>
                            <span className={`text-[11px] font-semibold ${phasePct === 100 ? "text-emerald-600" : "text-slate-500"}`}>{phaseDone}/{phaseSteps} done</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 truncate">{phase.title}</h3>
                          {phase.objective && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{phase.objective}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        {/* Progress ring */}
                        <svg className="w-8 h-8 -rotate-90 flex-shrink-0">
                          <circle cx="16" cy="16" r="11" strokeWidth="3" fill="none" className="stroke-slate-200" />
                          <circle cx="16" cy="16" r="11" strokeWidth="3" fill="none"
                            className={`transition-all duration-500 ${phasePct === 100 ? "stroke-emerald-500" : "stroke-blue-500"}`}
                            strokeDasharray={`${2 * Math.PI * 11}`}
                            strokeDashoffset={`${2 * Math.PI * 11 * (1 - phasePct / 100)}`}
                            strokeLinecap="round" />
                        </svg>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                      </div>
                    </button>

                    {/* Phase steps */}
                    {isExpanded && (
                      <div className="p-5 bg-white space-y-5 divide-y divide-slate-50">
                        {phase.steps?.map((step, si) => {
                          const stepId    = `${pi}-${si}`;
                          const isDone    = completedSteps.has(stepId);
                          return (
                            <div key={si} className={`${si > 0 ? "pt-5" : ""}`}>
                              <div className="flex items-start gap-3">
                                <button onClick={() => toggleStep(stepId)}
                                  className={`mt-0.5 flex-shrink-0 transition-all ${isDone ? "text-emerald-500 scale-110" : "text-slate-300 hover:text-slate-400"}`}>
                                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <h4 className={`text-sm font-bold mb-1 ${isDone ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                    {step.title}
                                  </h4>
                                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{step.details}</p>

                                  {/* Resources */}
                                  {step.resources?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {step.resources.map((res, ri) => (
                                        <a key={ri} href={res.url} target="_blank" rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all group">
                                          <ResIcon type={res.type} />
                                          <span className="max-w-[150px] truncate">{res.title}</span>
                                          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                        </a>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic">
                                      Search "{step.title}" on YouTube or official documentation.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Completion */}
            {progress === 100 && (
              <div className="mt-10 p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-emerald-900 mb-2">Roadmap Complete! 🎉</h3>
                <p className="text-emerald-700 text-sm mb-5">
                  You've completed <strong>{roadmap.title}</strong>. Time to build real projects and apply to jobs!
                </p>
                <button onClick={() => { setRoadmap(null); setTopic(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors">
                  Generate Next Roadmap
                </button>
              </div>
            )}

          </div>
        )}

        {/* ── Features (shown before result) ── */}
        {!roadmap && !isGenerating && (
          <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {[
              { icon: Brain,  color: "bg-blue-100 text-blue-600",   title: "Smart Intent Understanding", desc: 'Type anything — "I want to learn ML" or just "Machine Learning". AI extracts the real topic and goal.' },
              { icon: Rocket, color: "bg-orange-100 text-orange-600", title: "Nothing Skipped",           desc: "ML roadmap includes Math → Python → Algorithms → Deep Learning → Projects → Deployment → MLOps → Cloud. Complete." },
              { icon: Target, color: "bg-emerald-100 text-emerald-600", title: "Real Verified Resources", desc: "Every resource link fetched from Serper (YouTube, Coursera, Kaggle, official docs). Zero hallucinated URLs." },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}