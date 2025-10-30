"use client";
import React from "react";

export default function WhyChooseUs() {
  return (
    <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 bg-white min-h-screen">
      {/* Header Section */}
      <div className="text-center mb-12 sm:mb-14 md:mb-16">
        <div className="inline-block mb-4">
                  
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
          Why Choose Our Platform?
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
          Experience the future of recruitment with our AI-powered ecosystem that revolutionizes 
          how HR professionals and job seekers connect, learn, and grow.
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto">
        {/* Main Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 h-auto lg:h-[500px] xl:h-[600px] 2xl:h-[700px]">
          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6 md:gap-8">
            {/* Top Left Rectangle */}
            <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px] lg:min-h-0 border border-gray-300 rounded-lg bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&h=400&q=80"
                alt="AI-Powered Recruitment Dashboard"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
                        
            {/* Bottom Row with 2 rectangles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 flex-1">
              {/* Bottom Left Rectangle */}
              <div className="min-h-[200px] sm:min-h-[250px] md:min-h-[300px] lg:min-h-0 border border-gray-300 rounded-lg bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
                <img
                  src="https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=600&h=400&q=80"
                  alt="VR Interview Simulation"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
                            
              {/* Bottom Right Rectangle */}
              <div className="min-h-[200px] sm:min-h-[250px] md:min-h-[300px] lg:min-h-0 border border-gray-300 rounded-lg bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
                <img
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=600&h=400&q=80"
                  alt="Global Job Discovery Map"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          </div>
                    
          {/* Right Column */}
          <div className="lg:col-span-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px] lg:min-h-0 border border-gray-300 rounded-lg bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&h=400&q=80"
              alt="AI Learning Assistant Interface"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
      </div>
    </div>
  )
}