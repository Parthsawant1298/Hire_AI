"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, MessageSquare, User, Award, Video } from 'lucide-react';
import Image from "next/image";

export default function ServicesWithStats() {
  const [animatedStats, setAnimatedStats] = useState({
    experts: 0,
    clients: 0,
    projects: 0,
    interviews: 0
  });

  const finalStats = {
    experts: 450,
    clients: 1200,
    projects: 890,
    interviews: 150
  };

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 steps for smooth animation
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedStats({
        experts: Math.floor(finalStats.experts * easeOutCubic),
        clients: Math.floor(finalStats.clients * easeOutCubic),
        projects: Math.floor(finalStats.projects * easeOutCubic),
        interviews: Math.floor(finalStats.interviews * easeOutCubic)
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats(finalStats);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, []);

  const services = [
    {
      title: "AI Interview Simulator",
      icon: Video,
      image: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=600&h=400&q=80",
      iconColor: "blue",
      description: "Practice with realistic interview scenarios and receive instant AI feedback on your performance."
    },
    {
      title: "Resume Enhancement",
      icon: FileText,
      image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=600&h=400&q=80",
      iconColor: "green",
      description: "AI-powered resume analysis and optimization to help you stand out to potential employers."
    },
    {
      title: "Personalized Learning",
      icon: BookOpen,
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&h=400&q=80",
      iconColor: "blue",
      description: "Custom learning paths based on your skills, goals, and industry demands to fill your knowledge gaps."
    },
    {
      title: "Skill Assessment",
      icon: Award,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&h=400&q=80",
      iconColor: "purple",
      description: "Comprehensive assessment of technical and soft skills with detailed feedback and improvement strategies."
    },
    {
      title: "AI Career Assistant",
      icon: MessageSquare,
      image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=600&h=400&q=80",
      iconColor: "blue",
      description: "24/7 AI-powered career guidance and job search assistance for immediate support."
    },
    {
      title: "Expert Mentorship",
      icon: User,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=400&q=80",
      iconColor: "orange",
      description: "Connect with industry professionals for personalized guidance, career advice, and networking opportunities."
    }
  ];

  const stats = [
    {
      number: animatedStats.experts,
      suffix: '+',
      label: 'AI Recruitment Experts',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      )
    },
    {
      number: animatedStats.clients,
      suffix: '+',
      label: 'Active Companies',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      number: animatedStats.projects,
      suffix: '+',
      label: 'Successful Hires',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      number: animatedStats.interviews,
      suffix: 'K+',
      label: 'VR Interviews Conducted',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      )
    }
  ];

  return (
    <div className="bg-white">
      {/* Services Section */}
      <section className="bg-white py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center gap-3 sm:gap-4 mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 tracking-tight leading-tight">
              Discover the Power of Our Platform
            </h2>
            <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Explore our comprehensive AI-powered recruitment services designed to transform your hiring experience and
              career development journey.
            </p>
          </div>
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="relative h-48 sm:h-56 w-full overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0" />
                </div>
                <div className="absolute left-4 sm:left-6 top-4 sm:top-6">
                  <div className={`rounded-xl sm:rounded-2xl ${
                    service.iconColor === "green" 
                      ? "bg-green-50/90 hover:bg-green-100" 
                      : service.iconColor === "purple"
                      ? "bg-purple-50/90 hover:bg-purple-100"
                      : service.iconColor === "orange"
                      ? "bg-orange-50/90 hover:bg-orange-100"
                      : "bg-blue-50/90 hover:bg-blue-100"
                  } p-2 sm:p-3 backdrop-blur-sm transition-all duration-300 group-hover:scale-110`}>
                    <service.icon className={`h-5 w-5 sm:h-7 sm:w-7 ${
                      service.iconColor === "green" 
                        ? "text-green-600" 
                        : service.iconColor === "purple"
                        ? "text-purple-600"
                        : service.iconColor === "orange"
                        ? "text-orange-600"
                        : "text-blue-600"
                    }`} />
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 mb-2 sm:mb-3">
                    {service.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-left mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
              Our Platform Stats
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-lg leading-relaxed">
              We help you to unleash the power of AI-driven recruitment to transform your hiring process and connect with top talent worldwide.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="group relative bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden"
                style={{
                  animationDelay: `${index * 0.2}s`
                }}
              >
                {/* Background decoration */}
                <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 ${stat.bgColor} rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10 opacity-50 group-hover:opacity-70 transition-opacity duration-300`}></div>
                
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 ${stat.bgColor} rounded-xl sm:rounded-2xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>

                {/* Number */}
                <div className="relative z-10">
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-black mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                    {stat.number.toLocaleString()}{stat.suffix}
                  </div>
                  
                  {/* Label */}
                  <div className="text-gray-700 font-semibold text-xs sm:text-sm leading-tight">
                    {stat.label}
                  </div>
                </div>

                {/* Hover effect border - now subtle gray */}
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gray-100 opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-8 sm:mt-10 md:mt-12">
            <div className="inline-flex items-center space-x-2 text-gray-600 bg-gray-100 px-4 sm:px-6 py-2 sm:py-3 rounded-full">
              <div className="flex -space-x-1 sm:-space-x-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-full border-2 border-white"></div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full border-2 border-white"></div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500 rounded-full border-2 border-white"></div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                  +
                </div>
              </div>
              <span className="text-xs sm:text-sm font-medium">Join thousands of successful companies</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}