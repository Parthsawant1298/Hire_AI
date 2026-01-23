"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar'; // Using your existing Navbar
import Footer from '@/components/Footer'; // Using your existing Footer
import {
  Search, Github, Trophy, Briefcase, MapPin,
  Code2, Loader2, ExternalLink, SlidersHorizontal, Sparkles
} from 'lucide-react';

export default function HackathonPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // --- FILTER STATE ---
  const [filters, setFilters] = useState({
    location: "Online",
    goal: "Get Hired",
    github_username: "",
    min_prize: 0,
    tech_stack: []
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    try {
      const response = await fetch('http://localhost:8006/search-hackathons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            location: filters.location,
            goal: filters.goal,
            github_username: filters.github_username,
            tech_stack: filters.tech_stack,
            min_prize: filters.min_prize
          },
          query: searchQuery || "Hackathons"
        })
      });

      if (!response.ok) throw new Error("Agent failed");
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Error connecting to Agent. Ensure backend is running on port 8006.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Navbar />

      <div className="flex flex-1 pt-20"> {/* PT-20 for fixed navbar */}

        {/* --- LEFT SIDEBAR (FILTERS) --- */}
        <aside className="w-80 bg-white border-r border-slate-200 hidden lg:block h-[calc(100vh-80px)] overflow-y-auto sticky top-20">
          <div className="p-6 space-y-8">

            {/* Header */}
            <div className="flex items-center gap-2 text-slate-800 font-bold text-lg border-b border-slate-100 pb-4">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              <span>Agent Filters</span>
            </div>

            {/* 1. Goal */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Your Goal</label>
              <div className="space-y-2">
                {['Get Hired', 'Prize Money', 'Learning'].map((g) => (
                  <label key={g} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${filters.goal === g ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <input
                      type="radio"
                      name="goal"
                      className="hidden"
                      checked={filters.goal === g}
                      onChange={() => setFilters({ ...filters, goal: g })}
                    />
                    {g === 'Get Hired' && <Briefcase size={16} className={filters.goal === g ? "text-blue-600" : "text-slate-400"} />}
                    {g === 'Prize Money' && <Trophy size={16} className={filters.goal === g ? "text-blue-600" : "text-slate-400"} />}
                    {g === 'Learning' && <Code2 size={16} className={filters.goal === g ? "text-blue-600" : "text-slate-400"} />}
                    <span className={`text-sm font-medium ${filters.goal === g ? "text-blue-700" : "text-slate-600"}`}>{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. GitHub (Real Scan) */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">GitHub Scan</label>
              <div className="relative group">
                <Github className="absolute left-3 top-3 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="username (e.g. parthsawant1298)"
                  value={filters.github_username}
                  onChange={(e) => setFilters({ ...filters, github_username: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Our Agent will scan your public repos to find your real tech stack matches.
              </p>
            </div>

            {/* 3. Location */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Location</label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Online">Global Online</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Delhi">Delhi</option>
                <option value="San Francisco">San Francisco</option>
              </select>
            </div>

            {/* 4. Prize Pool */}
            <div>
              <div className="flex justify-between mb-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min Prize</label>
                <span className="text-xs font-mono text-blue-600 font-bold">₹{filters.min_prize.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="500"
                value={filters.min_prize}
                onChange={(e) => setFilters({ ...filters, min_prize: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">

          {/* Header Area */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Find Your Next Challenge</h1>
            <p className="text-slate-500">AI-powered search across Devpost, Unstop, and Luma.</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-3xl mb-10">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-32 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all"
                placeholder="Search hackathons (e.g. 'GenAI hackathon this weekend')"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Search"}
                </button>
              </div>
            </div>
          </form>

          {/* Results Grid */}
          <div className="space-y-6">
            {loading && (
              <div className="text-center py-20">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Scanning GitHub & Searching Events...</p>
              </div>
            )}

            {!loading && results.length === 0 && searchQuery && (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500">No hackathons found. Try adjusting your filters or query.</p>
              </div>
            )}

            {!loading && results.length === 0 && !searchQuery && (
              <div className="text-center py-20 opacity-60">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg text-slate-500">Enter a query or use filters to start the Agent.</p>
              </div>
            )}

            {results.map((hack, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col md:flex-row gap-6 group">

                {/* Score Badge Removed */}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 truncate pr-4">{hack.title}</h3>
                    <a
                      href={hack.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-400" />
                      {hack.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy size={14} className="text-slate-400" />
                      {/* Usually date, but using Trophy icon space for metadata */}
                      {hack.date || "Upcoming"}
                    </div>
                  </div>

                  {/* AI Reason */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-4">
                    <p className="text-sm text-slate-700 italic">
                      <span className="font-semibold not-italic text-blue-600">Why it fits: </span>
                      "{hack.match_reason}"
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {hack.tags?.map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md border border-slate-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </main>
      </div>

      <Footer />
    </div>
  );
}