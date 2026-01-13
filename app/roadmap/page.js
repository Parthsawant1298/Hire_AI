"use client";

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  CheckCircle2, Circle, ArrowRight, 
  BookOpen, Video, FileText, ChevronDown, 
  ChevronUp, Loader2, Trophy, Search
} from 'lucide-react';

const RoadmapPage = () => {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  
  const resultsRef = useRef(null);

  // Load progress from local storage
  useEffect(() => {
    const saved = localStorage.getItem('roadmap_progress');
    if (saved) {
      setCompletedSteps(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save progress
  const toggleStep = (stepId) => {
    const newSet = new Set(completedSteps);
    if (newSet.has(stepId)) {
      newSet.delete(stepId);
    } else {
      newSet.add(stepId);
    }
    setCompletedSteps(newSet);
    localStorage.setItem('roadmap_progress', JSON.stringify(Array.from(newSet)));
  };

  const togglePhase = (idx) => {
    const newSet = new Set(expandedPhases);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setExpandedPhases(newSet);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setRoadmap(null);
    setCompletedSteps(new Set()); // Reset progress for new roadmap

    try {
      const response = await fetch('http://localhost:8004/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic })
      });

      const data = await response.json();
      if (data.success) {
        setRoadmap(data.roadmap);
        // Default expand first phase
        setExpandedPhases(new Set([0]));
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate Progress
  const totalSteps = roadmap?.phases.reduce((acc, phase) => acc + phase.steps.length, 0) || 0;
  const progress = totalSteps === 0 ? 0 : Math.round((completedSteps.size / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Search Header */}
        <div className="max-w-3xl mx-auto px-4 text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Professional Roadmap Generator
          </h1>
          <p className="text-slate-500 mb-8">
            Create a structured, industry-standard learning path with verified resources.
          </p>

          <div className="relative max-w-xl mx-auto">
            <form onSubmit={handleGenerate}>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a skill (e.g. System Design, Product Management)"
                  className="w-full pl-11 pr-32 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={isGenerating || !topic}
                  className="absolute right-1.5 top-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Roadmap Content */}
        {roadmap && (
          <div ref={resultsRef} className="max-w-4xl mx-auto px-4 sm:px-6">
            
            {/* Progress Header */}
            <div className="sticky top-20 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 pb-4 mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-lg text-slate-800">{roadmap.title}</h2>
                <span className="text-sm font-medium text-slate-600">{progress}% Complete</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="space-y-6">
              {roadmap.phases.map((phase, phaseIdx) => (
                <div key={phaseIdx} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  
                  {/* Phase Header */}
                  <button 
                    onClick={() => togglePhase(phaseIdx)}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div>
                      <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                        Phase {phaseIdx + 1} • {phase.duration}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{phase.title}</h3>
                    </div>
                    {expandedPhases.has(phaseIdx) ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </button>

                  {/* Phase Steps */}
                  {expandedPhases.has(phaseIdx) && (
                    <div className="p-5 space-y-4">
                      {phase.steps.map((step, stepIdx) => {
                        const stepId = `${phaseIdx}-${stepIdx}`; // Unique ID based on index
                        const isCompleted = completedSteps.has(stepId);

                        return (
                          <div 
                            key={stepIdx} 
                            className={`relative pl-4 border-l-2 transition-colors ${
                              isCompleted ? 'border-green-500' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleStep(stepId)}
                                className={`mt-1 flex-shrink-0 transition-colors ${
                                  isCompleted ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-6 w-6" />
                                ) : (
                                  <Circle className="h-6 w-6" />
                                )}
                              </button>

                              <div className="flex-1">
                                <div className="flex items-baseline justify-between">
                                  <h4 className={`text-base font-semibold ${
                                    isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
                                  }`}>
                                    {step.title}
                                  </h4>
                                </div>
                                
                                <p className="text-sm text-slate-600 mt-1 mb-3 leading-relaxed">
                                  {step.details}
                                </p>

                                {/* Resources Grid */}
                                {step.resources && step.resources.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {step.resources.map((res, rIdx) => (
                                      <a
                                        key={rIdx}
                                        href={res.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm transition-all group"
                                      >
                                        {res.type === 'video' ? (
                                          <Video className="h-3 w-3 text-red-500" />
                                        ) : (
                                          <FileText className="h-3 w-3 text-blue-500" />
                                        )}
                                        {res.title}
                                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -ml-1 group-hover:ml-0 transition-all" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Completion Banner */}
            {progress === 100 && (
              <div className="mt-12 p-8 bg-green-50 border border-green-100 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 text-green-600">
                  <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-green-900 mb-2">Roadmap Completed!</h3>
                <p className="text-green-700">
                  Congratulations on mastering {roadmap.title}. You are ready for the next level.
                </p>
              </div>
            )}

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default RoadmapPage;