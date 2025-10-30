"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function RevenueBreakdown() {
  const [animationPhase, setAnimationPhase] = useState(0)
  const [highlightedSegment, setHighlightedSegment] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 3)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const segments = ["vr", "enterprise", "ai"]
    setHighlightedSegment(segments[animationPhase])

    const timeout = setTimeout(() => {
      setHighlightedSegment(null)
    }, 1500)

    return () => clearTimeout(timeout)
  }, [animationPhase])

  return (
    <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12 sm:mb-14 md:mb-16 lg:mt-8 xl:mt-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4 leading-tight">
            Revenue Breakdown
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
            Comprehensive breakdown of our AI-powered recruitment platform revenue streams and growth metrics across all
            service offerings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6 sm:space-y-8">
            {/* Revenue Highlights */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-200/50 backdrop-blur-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mb-1">$2.4M</div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">Total ARR</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-emerald-600 mb-1">+156%</div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">YoY Growth</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-blue-600 mb-1">450+</div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">Active Clients</div>
                </div>
              </div>
            </div>

            {/* Statistics - 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* AI Recruitment SaaS - 50% */}
              <motion.div
                className="group h-28 sm:h-32 p-4 sm:p-5 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200/50 flex flex-col justify-center hover:shadow-xl transition-all duration-500"
                whileHover={{ scale: 1.02, y: -2 }}
                animate={
                  highlightedSegment === "ai" ? { scale: 1.05, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)" } : {}
                }
              >
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                  50%
                </div>
                <div className="text-slate-700 text-xs sm:text-sm font-semibold mb-1">AI Recruitment SaaS</div>
                <div className="text-xs text-slate-500 mb-1">Monthly subscriptions</div>
                <div className="text-xs text-blue-600 font-semibold">$1.2M ARR</div>
              </motion.div>

              {/* VR Interview Platform - 30% */}
              <motion.div
                className="group h-28 sm:h-32 p-4 sm:p-5 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200/50 flex flex-col justify-center hover:shadow-xl transition-all duration-500"
                whileHover={{ scale: 1.02, y: -2 }}
                animate={
                  highlightedSegment === "vr" ? { scale: 1.05, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)" } : {}
                }
              >
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                  30%
                </div>
                <div className="text-slate-700 text-xs sm:text-sm font-semibold mb-1">VR Interview Platform</div>
                <div className="text-xs text-slate-500 mb-1">Usage-based pricing</div>
                <div className="text-xs text-blue-600 font-semibold">$720K ARR</div>
              </motion.div>

              {/* Enterprise Consulting - 20% */}
              <motion.div
                className="group h-28 sm:h-32 p-4 sm:p-5 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200/50 flex flex-col justify-center hover:shadow-xl transition-all duration-500"
                whileHover={{ scale: 1.02, y: -2 }}
                animate={
                  highlightedSegment === "enterprise"
                    ? { scale: 1.05, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)" }
                    : {}
                }
              >
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-500 mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                  20%
                </div>
                <div className="text-slate-700 text-xs sm:text-sm font-semibold mb-1">Enterprise Consulting</div>
                <div className="text-xs text-slate-500 mb-1">Custom implementations</div>
                <div className="text-xs text-blue-600 font-semibold">$480K ARR</div>
              </motion.div>

              {/* Future Projection */}
              <div className="group h-28 sm:h-32 p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl shadow-lg border border-blue-200/50 flex items-center space-x-3 hover:shadow-xl hover:scale-105 transition-all duration-500">
                <div className="text-blue-600 text-xl sm:text-2xl md:text-3xl font-bold group-hover:scale-110 transition-transform duration-300">
                  →
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm mb-1 sm:mb-2">2025 Vision</div>
                  <div className="text-slate-700 text-xs font-medium mb-1 sm:mb-2">
                    AI Job Marketplace
                    <br />
                    Career Development
                  </div>
                  <div className="text-blue-600 text-xs font-semibold bg-blue-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full inline-block">
                    Target: $5M ARR
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Animated Donut Chart */}
          <div className="flex justify-center lg:justify-end lg:pr-4">
            <motion.div
              className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[400px] md:h-[400px] bg-white rounded-full shadow-xl border border-slate-200/50 p-6 sm:p-8 md:p-12"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              {/* Animated SVG Donut Chart */}
              <motion.svg
                className="w-full h-full transform -rotate-90 relative z-10"
                viewBox="0 0 160 160"
                animate={{ rotate: animationPhase * 120 - 90 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              >
                {/* Enhanced Gradients and Filters */}
                <defs>
                  <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                  </linearGradient>

                  <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e40af" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>

                  <linearGradient id="vrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>

                  <linearGradient id="enterpriseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>

                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Background circle */}
                <circle cx="80" cy="80" r="68" fill="none" stroke="url(#bgGradient)" strokeWidth="12" />

                {/* 50% AI Recruitment SaaS */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r="68"
                  fill="none"
                  stroke="url(#aiGradient)"
                  strokeWidth="12"
                  strokeDasharray="213.6 213.6"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  filter={highlightedSegment === "ai" ? "url(#glow)" : "none"}
                  animate={highlightedSegment === "ai" ? { strokeWidth: 16 } : { strokeWidth: 12 }}
                  transition={{ duration: 0.3 }}
                />

                {/* 30% VR Interview Platform */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r="68"
                  fill="none"
                  stroke="url(#vrGradient)"
                  strokeWidth="12"
                  strokeDasharray="128.2 427.2"
                  strokeDashoffset="-213.6"
                  strokeLinecap="round"
                  filter={highlightedSegment === "vr" ? "url(#glow)" : "none"}
                  animate={highlightedSegment === "vr" ? { strokeWidth: 16 } : { strokeWidth: 12 }}
                  transition={{ duration: 0.3 }}
                />

                {/* 20% Enterprise Consulting */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r="68"
                  fill="none"
                  stroke="url(#enterpriseGradient)"
                  strokeWidth="12"
                  strokeDasharray="85.4 427.2"
                  strokeDashoffset="-341.8"
                  strokeLinecap="round"
                  filter={highlightedSegment === "enterprise" ? "url(#glow)" : "none"}
                  animate={highlightedSegment === "enterprise" ? { strokeWidth: 16 } : { strokeWidth: 12 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.svg>

              {/* Center Revenue Display */}
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <motion.div
                  className="text-center bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-lg border border-slate-200/50"
                  animate={{ scale: highlightedSegment ? 1.05 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-1">$2.4M</div>
                  <div className="text-xs md:text-sm text-slate-600 font-medium mb-1">Total ARR</div>
                  <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                    +156% YoY
                  </div>
                </motion.div>
              </div>

              {/* Animated Floating Labels */}
              <AnimatePresence>
                {/* VR Interview Platform - Top */}
                <motion.div
                  className="absolute -top-1 sm:-top-2 left-1/2 transform -translate-x-1/2 text-center z-30"
                  animate={
                    highlightedSegment === "vr"
                      ? {
                          scale: 1.1,
                          y: -10,
                          boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)",
                        }
                      : { scale: 1, y: 0 }
                  }
                  transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
                >
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 mb-1 sm:mb-2 inline-block shadow-lg">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  </div>
                  <div className="bg-white/95 backdrop-blur-sm text-slate-900 font-semibold px-1.5 sm:px-2 md:px-3 py-1 md:py-2 rounded-md sm:rounded-lg shadow-lg border border-slate-200/50">
                    <div className="text-xs">VR Platform</div>
                    <div className="text-xs text-blue-600 font-bold">30% • $720K</div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <AnimatePresence>
                {/* Enterprise Consulting - Right */}
                <motion.div
                  className="absolute -right-1 sm:-right-2 top-1/2 transform -translate-y-1/2 text-center z-30"
                  animate={
                    highlightedSegment === "enterprise"
                      ? {
                          scale: 1.1,
                          x: 10,
                          boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)",
                        }
                      : { scale: 1, x: 0 }
                  }
                  transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
                >
                  <div className="bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 mb-1 sm:mb-2 inline-block shadow-lg">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="bg-white/95 backdrop-blur-sm text-slate-900 font-semibold px-1.5 sm:px-2 md:px-3 py-1 md:py-2 rounded-md sm:rounded-lg shadow-lg border border-slate-200/50">
                    <div className="text-xs">Enterprise</div>
                    <div className="text-xs text-blue-600 font-bold">20% • $480K</div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <AnimatePresence>
                {/* AI Recruitment SaaS - Bottom */}
                <motion.div
                  className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 text-center z-30"
                  animate={
                    highlightedSegment === "ai"
                      ? {
                          scale: 1.1,
                          y: 10,
                          boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)",
                        }
                      : { scale: 1, y: 0 }
                  }
                  transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 mb-1 sm:mb-2 inline-block shadow-lg">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="bg-white/95 backdrop-blur-sm text-slate-900 font-semibold px-1.5 sm:px-2 md:px-3 py-1 md:py-2 rounded-md sm:rounded-lg shadow-lg border border-slate-200/50">
                    <div className="text-xs">AI SaaS</div>
                    <div className="text-xs text-blue-600 font-bold">50% • $1.2M</div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}