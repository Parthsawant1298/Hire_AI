"use client";
import { useState, useEffect } from 'react';

const AnimatedTestimonials = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "VP of Human Resources",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "HireAI's AI recruitment engine transformed our hiring process completely. We reduced time-to-hire by 60% and improved candidate quality dramatically. The VR interview training is revolutionary!",
      rating: 5,
      company: "TechNova Solutions"
    },
    {
      name: "Michael Rodriguez",
      role: "Talent Acquisition Director",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "The global job discovery feature helped us find amazing talent from 15+ countries. The AI matching accuracy is incredible - 95% of recommended candidates were perfect fits for our roles.",
      rating: 5,
      company: "Global Dynamics Corp"
    },
    {
      name: "Emily Johnson",
      role: "Career Development Coach",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "The AI learning assistant created personalized career paths for over 500 professionals. The VR interview practice sessions boosted candidate confidence by 80%. Simply outstanding platform!",
      rating: 5,
      company: "Career Growth Institute"
    },
    {
      name: "David Kim",
      role: "Startup Founder & CEO",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "As a fast-growing startup, we needed smart hiring solutions. HireAI's enterprise analytics gave us insights we never had before. The smart resume builder helped our team present themselves professionally.",
      rating: 5,
      company: "InnovateTech Labs"
    },
    {
      name: "Lisa Thompson",
      role: "Chief People Officer",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "The platform's comprehensive approach to recruitment and career development is unmatched. From AI-powered matching to VR training, every feature adds real value to our talent strategy.",
      rating: 5,
      company: "Fortune Enterprises"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white overflow-hidden">
      <style jsx global>{`
        @keyframes slideIn {
          0% { transform: translateX(100px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .testimonial-container {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }
      `}</style>

      <div className="testimonial-container py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Success <span className="text-blue-600">Stories</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Discover how leading companies transform their recruitment with our AI-powered platform
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start lg:items-center">
            {/* Main Testimonial */}
            <div className="lg:col-span-7 w-full">
              {testimonials.map((testimonial, idx) => (
                <div
                  key={idx}
                  className={`relative transition-all duration-1000 ease-out w-full
                    ${activeTestimonial === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                  style={{
                    animation: activeTestimonial === idx ? 'slideIn 0.8s ease-out' : 'none',
                    display: activeTestimonial === idx ? 'block' : 'none'
                  }}
                >
                  <div className="bg-white p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-lg border border-blue-100">
                    <div className="mb-4 sm:mb-6 md:mb-8">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-blue-200" fill="currentColor" viewBox="0 0 24 24" style={{ animation: 'pulse 3s infinite' }}>
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                      </svg>
                    </div>
                    
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-light text-gray-800 mb-4 sm:mb-6 md:mb-8 leading-relaxed">
                      "{testimonial.quote}"
                    </p>

                    <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                      <div className="relative group flex-shrink-0">
                        <div className="absolute inset-0 bg-blue-600 rounded-full opacity-10 group-hover:opacity-20 transition-opacity" />
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 sm:ring-4 ring-white"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
                          {testimonial.name}
                        </h4>
                        <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-1">{testimonial.role}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{testimonial.company}</p>
                        <div className="flex gap-1 mt-1 sm:mt-2">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <svg 
                              key={i} 
                              className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600 fill-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              style={{ animation: `fadeUp 0.5s ease-out ${i * 0.1}s` }}
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Stack - Hidden on mobile and tablet */}
            <div className="hidden lg:block lg:col-span-5 relative h-[500px] xl:h-[600px]">
              {testimonials.map((testimonial, idx) => {
                const position = (idx - activeTestimonial + testimonials.length) % testimonials.length;
                return (
                  <div
                    key={idx}
                    className="absolute w-full transition-all duration-700 ease-out cursor-pointer hover:scale-105"
                    style={{
                      top: `${position * 80}px`,
                      opacity: position < 3 ? 1 - (position * 0.3) : 0,
                      transform: `scale(${1 - (position * 0.1)}) translateY(${position * 10}px)`,
                      zIndex: testimonials.length - position
                    }}
                    onClick={() => setActiveTestimonial(idx)}
                  >
                    <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-md border border-blue-100 hover:border-blue-300 transition-all">
                      <div className="flex items-center gap-3 lg:gap-4 mb-3">
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover ring-2 ring-blue-100 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm lg:text-base font-semibold text-gray-900 truncate">{testimonial.name}</h4>
                          <p className="text-xs lg:text-sm text-gray-600 truncate">{testimonial.company}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <svg key={i} className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600 fill-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 mt-6 sm:mt-8 md:mt-12">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTestimonial(idx)}
                className={`transition-all duration-300 ${
                  activeTestimonial === idx 
                    ? 'w-6 sm:w-8 md:w-12 h-1 bg-blue-600' 
                    : 'w-1 h-1 bg-gray-300 hover:bg-blue-400'
                } rounded-full`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedTestimonials;