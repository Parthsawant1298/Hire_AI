"use client"
import React from "react"

// Button component
const Button = ({ children, className, ...props }) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
<section className="relative h-[470px] md:h-[350px] lg:h-[625px] overflow-hidden">
  <div className="absolute inset-0 z-0 overflow-hidden">
    <img src="/background.jpg" alt="About us background - AI technology" className="w-full h-full object-cover" />
    <div className="absolute inset-0" />
  </div>

  <div className="container mx-auto px-4 relative z-20 h-full">
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-black text-center">
        ABOUT
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700">
          US
        </span>
      </h1>
    </div>
  </div>
</section>
      {/* Main Content Section */}
      <section className="py-8 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Hero Image */}
            <div className="order-2 lg:order-1 flex justify-center">
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&h=600&q=80"
                alt="AI Recruitment Platform Dashboard"
                className="w-full max-w-md lg:max-w-none h-auto rounded-lg shadow-lg"
              />
            </div>

            {/* Hero Content */}
            <div className="order-1 lg:order-2 space-y-6 text-center lg:text-left">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
                  We provide you the best AI recruitment experience
                </h1>
                <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-6">
                  Revolutionary platform combining AI-powered hiring, VR interview simulation, global job discovery,
                  personalized learning paths, and career development - everything recruiters and job seekers need.
                </p>
              </div>

              {/* Statistics */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 md:gap-8 lg:gap-12 mb-6">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">95%</div>
                  <div className="text-gray-600 text-sm">
                    AI Matching
                    <br />
                    Accuracy
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">60%</div>
                  <div className="text-gray-600 text-sm">
                    Faster
                    <br />
                    Hiring
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">500+</div>
                  <div className="text-gray-600 text-sm">
                    Companies
                    <br />
                    Trust Us
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex justify-center lg:justify-start">
                <Button className="bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-900 hover:text-white px-6 md:px-8 py-2 md:py-3 text-sm font-medium tracking-wider">
                  START WITH AI
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 lg:py-24 px-4 md:px-8 lg:px-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
              What Sets Our Platform Apart
            </h2>
            <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
              Discover the unique features that make our AI recruitment platform the complete solution for modern hiring
            </p>
          </div>

          {/* Mobile Layout */}
          <div className="block md:hidden">
            {/* Central Circle */}
            <div className="w-40 h-40 bg-white rounded-full shadow-2xl flex flex-col items-center justify-center mx-auto mb-8 border-4 border-gray-100">
              <div className="text-base font-bold text-gray-800 text-center">4 UNIQUE</div>
              <div className="text-sm font-semibold text-cyan-500 text-center">FEATURES</div>
              <div className="text-base font-bold text-gray-800 text-center">PLATFORM</div>
            </div>

            {/* Feature Cards */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-xl mx-auto mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <div className="text-lg">🥽</div>
                  </div>
                </div>
                <h3 className="text-orange-500 font-bold text-lg mb-3">VR Interview Training</h3>
                <p className="text-gray-600 text-sm leading-relaxed px-4">
                  Revolutionary VR glasses integration for immersive interview practice. Experience realistic interview scenarios with AI avatars, get real-time feedback on body language, voice tone, and technical responses. Build confidence through simulated high-pressure situations and receive detailed performance analytics.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-xl mx-auto mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <div className="text-lg">🎤</div>
                  </div>
                </div>
                <h3 className="text-blue-500 font-bold text-lg mb-3">AI Voice Analysis</h3>
                <p className="text-gray-600 text-sm leading-relaxed px-4">
                  Advanced VAPI integration analyzes communication skills, tone, confidence, and technical responses. Get detailed feedback on speaking patterns, clarity, pace, and emotional intelligence. Our AI evaluates your responses against industry standards and provides personalized improvement recommendations.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-xl mx-auto mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <div className="text-lg">🗺️</div>
                  </div>
                </div>
                <h3 className="text-red-500 font-bold text-lg mb-3">Global Job Discovery</h3>
                <p className="text-gray-600 text-sm leading-relaxed px-4">
                  Interactive world map for location-based job search and global opportunities. Click any country or city to discover remote work options, visa requirements, salary ranges, and cultural insights. Filter by industry, experience level, and get personalized job recommendations with market analysis.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-xl mx-auto mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <div className="text-lg">🎓</div>
                  </div>
                </div>
                <h3 className="text-teal-500 font-bold text-lg mb-3">AI Learning Courses</h3>
                <p className="text-gray-600 text-sm leading-relaxed px-4">
                  Personalized learning paths with AI-curated courses and career development tools. Access auto-generated presentations, skill roadmaps, networking strategies, and industry-specific training modules. Track your progress with gamified achievements and connect with mentors in your field.
                </p>
              </div>
            </div>
          </div>

          {/* Tablet and Desktop Layout */}
          <div className="hidden md:block">
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-4xl mx-auto px-8">
                
                {/* Central Hub */}
                <div className="flex items-center justify-center mb-16">
                  <div className="w-64 h-64 bg-white rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-gray-100 relative z-20">
                    <div className="text-3xl font-bold text-gray-800 text-center">4 UNIQUE</div>
                    <div className="text-xl font-semibold text-cyan-500 text-center mt-1">FEATURES</div>
                    <div className="text-3xl font-bold text-gray-800 text-center">PLATFORM</div>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-12 lg:gap-16">
                  
                  {/* Feature 1 - VR Training */}
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-xl relative">
                      <div className="w-18 h-18 bg-white rounded-full flex items-center justify-center">
                        <div className="text-3xl">🥽</div>
                      </div>
                      {/* Decorative ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-orange-200 animate-pulse"></div>
                    </div>
                    <div>
                      <h3 className="text-orange-500 font-bold text-xl mb-3">VR Interview Training</h3>
                      <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                        Revolutionary VR glasses integration for immersive interview practice. Experience realistic scenarios with AI avatars and get real-time feedback on performance.
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 - AI Voice Analysis */}
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-xl relative">
                      <div className="w-18 h-18 bg-white rounded-full flex items-center justify-center">
                        <div className="text-3xl">🎤</div>
                      </div>
                      {/* Decorative ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                    </div>
                    <div>
                      <h3 className="text-blue-500 font-bold text-xl mb-3">AI Voice Analysis</h3>
                      <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                        Advanced VAPI integration analyzes communication skills, tone, and confidence. Get detailed feedback on speaking patterns and interview performance.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 - Global Job Discovery */}
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-xl relative">
                      <div className="w-18 h-18 bg-white rounded-full flex items-center justify-center">
                        <div className="text-3xl">🗺️</div>
                      </div>
                      {/* Decorative ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-red-200 animate-pulse" style={{animationDelay: '1s'}}></div>
                    </div>
                    <div>
                      <h3 className="text-red-500 font-bold text-xl mb-3">Global Job Discovery</h3>
                      <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                        Interactive world map for location-based job search. Discover opportunities globally with visa requirements, salary insights, and cultural information.
                      </p>
                    </div>
                  </div>

                  {/* Feature 4 - AI Learning Courses */}
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-xl relative">
                      <div className="w-18 h-18 bg-white rounded-full flex items-center justify-center">
                        <div className="text-3xl">🎓</div>
                      </div>
                      {/* Decorative ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-teal-200 animate-pulse" style={{animationDelay: '1.5s'}}></div>
                    </div>
                    <div>
                      <h3 className="text-teal-500 font-bold text-xl mb-3">AI Learning Courses</h3>
                      <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                        Personalized learning paths with AI-curated courses. Access skill roadmaps, networking strategies, and gamified achievements for career development.
                      </p>
                    </div>
                  </div>

                </div>

                {/* Connecting Lines - Subtle and Modern */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                  
                  {/* Top connections */}
                  <div className="absolute w-32 h-0.5 bg-gradient-to-r from-orange-300 to-transparent -top-8 -left-16 transform -rotate-45"></div>
                  <div className="absolute w-32 h-0.5 bg-gradient-to-l from-blue-300 to-transparent -top-8 -right-16 transform rotate-45"></div>
                  
                  {/* Bottom connections */}
                  <div className="absolute w-32 h-0.5 bg-gradient-to-r from-red-300 to-transparent top-8 -left-16 transform rotate-45"></div>
                  <div className="absolute w-32 h-0.5 bg-gradient-to-l from-teal-300 to-transparent top-8 -right-16 transform -rotate-45"></div>
                  
                </div>

              </div>
            </div>
          </div>

          {/* Bottom CTA Section */}
          <div className="text-center mt-12 md:mt-20">
            <p className="text-gray-600 mb-6 md:mb-8 text-base md:text-lg leading-relaxed">
              Experience the future of recruitment with features no other platform offers
            </p>
            <button className="bg-gray-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-full hover:bg-gray-800 hover:scale-105 transition-all duration-200 font-medium text-sm md:text-base tracking-wider">
              EXPLORE UNIQUE FEATURES
            </button>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-12 md:py-20 lg:py-24 px-4 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-stretch">
            {/* Process Content */}
            <div className="flex flex-col justify-between space-y-6 md:space-y-8">
              <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 leading-tight">
                We provide the best AI-powered recruitment process
              </h2>

              {/* Process Steps */}
              <div className="space-y-6 md:space-y-8 flex-grow flex flex-col justify-center">
                {/* Step 1 */}
                <div className="flex gap-4 md:gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold text-base md:text-lg">
                      01
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                      Job Creation & AI Analysis
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      HR creates jobs with specific requirements. Our AI-powered JD Analyzer processes applications,
                      evaluates candidates using ATS tracking, and assigns percentage scores to find the best matches
                      automatically.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 md:gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold text-base md:text-lg">
                      02
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                      VR Interview & Voice Analysis
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      Selected candidates experience immersive VR interview simulations. Our VAPI integration conducts
                      voice interviews with AI-generated questions, analyzing communication skills, technical knowledge,
                      and behavioral patterns in real-time.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 md:gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold text-base md:text-lg">
                      03
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                      AI Learning & Career Development
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      Our AI Learning Assistant creates personalized career paths, generates structured courses from
                      YouTube content, builds resumes, and provides networking tools. Complete ecosystem for
                      professional growth and skill development.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Process Image */}
            <div className="order-first lg:order-last">
              <img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&h=600&q=80"
                alt="AI-powered recruitment process visualization"
                className="w-full h-64 md:h-80 lg:h-full object-cover rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}