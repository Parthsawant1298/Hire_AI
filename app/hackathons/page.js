"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Search, Github, Trophy, Briefcase, MapPin,
  Code2, Loader2, ExternalLink, SlidersHorizontal,
  Sparkles, Users, Globe, Monitor, Building2,
  ChevronDown, Star, Tag, Calendar, Zap
} from 'lucide-react';

// ============================================================
// CONFIG
// ============================================================

const API_URL = "http://localhost:8006/search-hackathons";

const TECH_OPTIONS = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js",
  "ML/AI", "LLMs", "Computer Vision", "Data Science",
  "Blockchain", "Web3", "Rust", "Go", "Java", "Flutter",
  "iOS", "Android", "DevOps", "Cloud", "Cybersecurity"
];

const GOALS = [
  { id: "Get Hired",   icon: Briefcase, label: "Get Hired",   desc: "Find events with hiring sponsors" },
  { id: "Prize Money", icon: Trophy,    label: "Prize Money", desc: "Maximize prize winnings" },
  { id: "Learning",    icon: Code2,     label: "Learning",    desc: "Build skills & projects" },
  { id: "Networking",  icon: Users,     label: "Networking",  desc: "Meet teams & communities" },
];

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"];

const REGIONS = ["Global", "India", "USA", "Europe", "Asia Pacific"];

const MODES = [
  { id: "Online",    icon: Monitor,   label: "Online" },
  { id: "In-Person", icon: Building2, label: "In-Person" },
  { id: "Hybrid",    icon: Globe,     label: "Hybrid" },
];

const IN_PERSON_CITIES = [
  "Mumbai", "Bangalore", "Delhi", "Hyderabad", "Pune",
  "Chennai", "San Francisco", "New York", "London", "Berlin", "Singapore"
];

const PLATFORM_COLORS = {
  "devpost.com":   "bg-blue-100 text-blue-700",
  "unstop.com":    "bg-purple-100 text-purple-700",
  "dorahacks.io":  "bg-green-100 text-green-700",
  "devfolio.co":   "bg-orange-100 text-orange-700",
  "mlh.io":        "bg-red-100 text-red-700",
  "lu.ma":         "bg-pink-100 text-pink-700",
};

const getPlatformStyle = (platform = "") => {
  const key = Object.keys(PLATFORM_COLORS).find(k => platform.toLowerCase().includes(k));
  return key ? PLATFORM_COLORS[key] : "bg-slate-100 text-slate-600";
};

const getScoreColor = (score) => {
  if (score >= 85) return { bg: "bg-emerald-500", text: "text-white", ring: "ring-emerald-200" };
  if (score >= 65) return { bg: "bg-blue-500",    text: "text-white", ring: "ring-blue-200" };
  if (score >= 45) return { bg: "bg-amber-400",   text: "text-white", ring: "ring-amber-200" };
  return                  { bg: "bg-slate-400",   text: "text-white", ring: "ring-slate-200" };
};

// ============================================================
// COMPONENT
// ============================================================

export default function HackathonPage() {
  const [loading, setLoading]       = useState(false);
  const [results, setResults]       = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    goal:             "Learning",
    experience_level: "Beginner",
    github_username:  "",
    tech_stack:       [],
    region:           "Global",
    mode:             "Online",
    location:         "Online",
  });

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const toggleTech = (tech) => {
    setFilters(f => ({
      ...f,
      tech_stack: f.tech_stack.includes(tech)
        ? f.tech_stack.filter(t => t !== tech)
        : [...f.tech_stack, tech]
    }));
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setResults([]);
    setHasSearched(true);

    try {
      const payload = {
        inputs: {
          goal:             filters.goal,
          experience_level: filters.experience_level,
          github_username:  filters.github_username,
          tech_stack:       filters.tech_stack,
          region:           filters.region,
          mode:             filters.mode,
          location:         filters.mode === "Online" ? "Online" : filters.location,
        },
        query: searchQuery.trim()
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Could not connect to agent. Make sure backend is running on port 8006.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Navbar />

      <div className="flex flex-1 pt-16">

        {/* ---- SIDEBAR ---- */}
        <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
          <div className="p-6 space-y-7 flex-1">

            {/* Header */}
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800">Agent Filters</span>
            </div>

            {/* 1. GOAL */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Your Goal</p>
              <div className="space-y-2">
                {GOALS.map(({ id, icon: Icon, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => setFilter("goal", id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all
                      ${filters.goal === id
                        ? "bg-blue-50 border-blue-400 ring-1 ring-blue-300"
                        : "bg-white border-slate-200 hover:border-slate-300"}`}
                  >
                    <Icon size={15} className={`mt-0.5 flex-shrink-0 ${filters.goal === id ? "text-blue-600" : "text-slate-400"}`} />
                    <div>
                      <p className={`text-sm font-semibold ${filters.goal === id ? "text-blue-700" : "text-slate-700"}`}>{label}</p>
                      <p className="text-[11px] text-slate-400 leading-tight">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* 2. EXPERIENCE */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Experience Level</p>
              <div className="flex gap-2">
                {EXPERIENCE_LEVELS.map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setFilter("experience_level", lvl)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all
                      ${filters.experience_level === lvl
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </section>

            {/* 3. GITHUB */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">GitHub (Auto-detect Skills)</p>
              <div className="relative">
                <Github className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="your_username"
                  value={filters.github_username}
                  onChange={e => setFilter("github_username", e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                Agent scans your public repos and boosts matches for your real stack.
              </p>
            </section>

            {/* 4. TECH STACK */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Tech Stack
                {filters.tech_stack.length > 0 && (
                  <span className="ml-2 text-blue-600 normal-case font-bold">({filters.tech_stack.length} selected)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TECH_OPTIONS.map(tech => (
                  <button
                    key={tech}
                    onClick={() => toggleTech(tech)}
                    className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-all
                      ${filters.tech_stack.includes(tech)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"}`}
                  >
                    {tech}
                  </button>
                ))}
              </div>
            </section>

            {/* 5. MODE */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Event Mode</p>
              <div className="flex gap-2">
                {MODES.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilter("mode", id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all
                      ${filters.mode === id
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"}`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* 6. REGION */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Region</p>
              <div className="relative">
                <select
                  value={filters.region}
                  onChange={e => setFilter("region", e.target.value)}
                  className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  {REGIONS.map(r => <option key={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </section>

            {/* 7. CITY — only when In-Person or Hybrid */}
            {(filters.mode === "In-Person" || filters.mode === "Hybrid") && (
              <section>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">City</p>
                <div className="relative">
                  <select
                    value={filters.location}
                    onChange={e => setFilter("location", e.target.value)}
                    className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {IN_PERSON_CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </section>
            )}

          </div>

          {/* SEARCH BUTTON in sidebar */}
          <div className="p-6 border-t border-slate-100">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? "Agent Running..." : "Find Hackathons"}
            </button>
          </div>
        </aside>

        {/* ---- MAIN ---- */}
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-4xl mx-auto">

            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">Hackathon Finder</h1>
              <p className="text-slate-500 text-sm">AI agent searches Devpost, Unstop, DoraHacks, Devfolio & more — matched to your profile.</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder='Optional: "GenAI hackathon", "blockchain weekend", "NASA space apps"...'
                  className="w-full pl-11 pr-36 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 ml-1">
                Leave blank to find hackathons purely based on your filters →
              </p>
            </form>

            {/* ---- STATES ---- */}

            {/* Loading */}
            {loading && (
              <div className="text-center py-24">
                <div className="inline-flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                    <Zap className="w-5 h-5 text-blue-600 absolute inset-0 m-auto" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Agent is running...</p>
                    <p className="text-sm text-slate-500 mt-1">Scanning GitHub → Searching 5 queries → Scoring matches</p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state - first load */}
            {!loading && !hasSearched && (
              <div className="text-center py-24 opacity-70">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-500 mb-2">Set your filters & hit Search</p>
                <p className="text-sm text-slate-400">The agent runs up to 5 targeted searches and scores each event for your profile.</p>
              </div>
            )}

            {/* No results after search */}
            {!loading && hasSearched && results.length === 0 && (
              <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="font-semibold text-slate-600 mb-1">No hackathons found</p>
                <p className="text-sm text-slate-400">Try broadening your filters, changing region, or adding a free-text query.</p>
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div className="space-y-4">

                {/* Results count */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {results.length} hackathon{results.length !== 1 ? "s" : ""} found
                    <span className="text-slate-400 font-normal ml-1">— sorted by match score</span>
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />85+ Great</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />65+ Good</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />45+ Fair</span>
                  </div>
                </div>

                {results.map((hack, idx) => {
                  const scoreStyle = getScoreColor(hack.match_score);
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-200 p-5 flex gap-5"
                    >
                      {/* Score */}
                      <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${scoreStyle.bg} ring-4 ${scoreStyle.ring} flex flex-col items-center justify-center`}>
                        <span className={`text-2xl font-extrabold leading-none ${scoreStyle.text}`}>{hack.match_score}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 opacity-80 ${scoreStyle.text}`}>Match</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-slate-900 leading-snug">{hack.title}</h3>
                          <a
                            href={hack.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-shrink-0 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Open hackathon page"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                          {hack.date && hack.date !== "Upcoming" && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />{hack.date}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />{hack.location || "Online"}
                          </span>
                          {hack.mode && (
                            <span className="flex items-center gap-1">
                              <Monitor size={12} />{hack.mode}
                            </span>
                          )}
                          {hack.prize && (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <Trophy size={12} />{hack.prize}
                            </span>
                          )}
                          {hack.platform && (
                            <span className={`px-2 py-0.5 rounded-md font-semibold ${getPlatformStyle(hack.platform)}`}>
                              {hack.platform}
                            </span>
                          )}
                        </div>

                        {/* Why it fits */}
                        <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            <span className="font-bold text-blue-600 not-italic">Why it fits: </span>
                            {hack.match_reason}
                          </p>
                        </div>

                        {/* Tags */}
                        {hack.tags && hack.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {hack.tags.map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}