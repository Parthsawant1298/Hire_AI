"use client";
import Head from 'next/head';

export default function LowerFooter() {
  return (
    <div className="relative bg-white overflow-hidden">
      <Head>
        <title>AI Recruitment Platform | Transform Your Hiring Process</title>
        <meta name="description" content="Revolutionary AI-powered recruitment platform with VR interviews and smart candidate matching" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Background Image - Smart Responsive Handling */}
      <div 
        className="absolute inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/background.jpg')",
          backgroundSize: "100% 100%",
          height: "100vh",
          width: "100%",
        
        }}
      />
      
      {/* Alternative using Next.js Image (commented out) */}
      {/* 
      <Image
        src="/images/background-cta.jpg"
        alt="Background"
        fill
        className="object-cover opacity-10"
        priority
      />
      */}
      
      {/* Gradient Overlay (optional) */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent" />
      
      <main className="relative z-10 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-black">
            Ready to Revolutionize Your Hiring Process?
          </h1>
          
          <p className="text-base md:text-lg text-black mb-8">
            Join thousands of companies using our AI-powered platform for smarter recruitment, VR interviews, and data-driven hiring decisions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-1 shadow-lg">
              Start Free Trial
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            
            <button className="inline-flex items-center px-6 py-3 bg-white/90 hover:bg-white text-blue-600 text-base font-semibold rounded-lg border-2 border-blue-600 transition duration-300 ease-in-out transform hover:-translate-y-1 shadow-lg backdrop-blur-sm">
              Schedule Demo
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-gray-700 text-sm">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}