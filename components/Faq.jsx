"use client"
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function FAQPage() {
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    {
      id: 1,
      question: "Is there a free trial available for VR interview training?",
      answer:
        "Yes, you can try our VR interview training for free for 30 days. If you want, we'll provide you with a free, personalized 30-minute onboarding session to get you started with the VR equipment and AI coaching system.",
    },
    {
      id: 2,
      question: "Can I change my subscription plan later?",
      answer:
        "Of course. Our pricing scales with your recruitment needs. Chat with our friendly team to find a solution that works for your company size and hiring volume.",
    },
    {
      id: 3,
      question: "What is your cancellation policy?",
      answer:
        "We understand that hiring needs change. You can cancel your plan at any time and we'll refund you the difference for any unused portion of your subscription.",
    },
    {
      id: 4,
      question: "Can I integrate with existing ATS systems?",
      answer:
        "Yes, our AI recruitment platform integrates seamlessly with popular ATS systems including Workday, BambooHR, and Greenhouse through our robust API connections.",
    },
    {
      id: 5,
      question: "What does 'AI-powered matching' mean?",
      answer:
        "Our AI analyzes candidate profiles, skills, experience, and job requirements to provide 95% accurate matching. The system learns from successful placements to continuously improve recommendations.",
    },
    {
      id: 6,
      question: "How does the VR interview simulation work?",
      answer:
        "Candidates wear VR glasses and interact with AI avatars in realistic interview environments. The system analyzes body language, voice patterns, and responses to provide comprehensive feedback.",
    },
    {
      id: 7,
      question: "How does the global job discovery feature work?",
      answer:
        "Our interactive world map allows you to explore job opportunities globally. Click any location to see visa requirements, salary ranges, cultural insights, and market demand for specific skills.",
    },
    {
      id: 8,
      question: "Can I customize the AI learning paths?",
      answer:
        "Absolutely! You can customize learning paths based on your industry, role requirements, and company culture. The AI adapts content from YouTube and creates personalized course structures.",
    },
    {
      id: 9,
      question: "What kind of analytics and reporting do you provide?",
      answer:
        "We provide comprehensive analytics including candidate performance metrics, interview success rates, hiring funnel optimization, and ROI tracking for your recruitment investments.",
    },
    {
      id: 10,
      question: "Do you provide training and support?",
      answer:
        "Yes! We provide complete onboarding, VR equipment setup, AI coaching tutorials, and ongoing support through our dedicated customer success team.",
    },
    {
      id: 11,
      question: "Can I use this for multiple hiring campaigns?",
      answer:
        "Of course! You can run unlimited hiring campaigns, create multiple job postings, and manage various recruitment pipelines simultaneously within the platform.",
    },
    {
      id: 12,
      question: "How secure is candidate data on your platform?",
      answer:
        "We maintain enterprise-grade security with SOC 2 compliance, end-to-end encryption, and GDPR compliance. All candidate data is protected with industry-leading security measures.",
    },
  ]

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id)
  }

  // Split FAQs into two columns
  const leftColumnFAQs = faqs.filter((_, index) => index % 2 === 0)
  const rightColumnFAQs = faqs.filter((_, index) => index % 2 === 1)

  const FAQItem = ({ faq }) => (
    <div className="mb-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
        <button
          onClick={() => toggleFaq(faq.id)}
          className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        >
          <div className="flex items-start gap-4 flex-1">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mt-1">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 leading-6 pr-4">{faq.question}</h3>
          </div>
          <div className="flex-shrink-0 ml-4">
            {openFaq === faq.id ? (
              <ChevronUp className="w-5 h-5 text-blue-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${
          openFaq === faq.id 
            ? 'max-h-96 opacity-100' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="px-6 pb-5 pl-20">
            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative h-[450px] md:h-[350px] lg:h-[625px] overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img src="/background.jpg" alt="FAQ support background" className="w-full h-full object-cover" />
          <div className="absolute inset-0" />
        </div>

        <div className="container mx-auto px-4 relative z-20 h-full">
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-black text-center">
              FAQ &
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-blue-500">
                SUPPORT
              </span>
            </h1>
           
          </div>
        </div>
      </section>

      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700"> Questions</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get answers to common questions about our VR interview training, AI voice analysis, global job discovery, and personalized learning features.
            </p>
          </div>

          {/* FAQ Grid */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column */}
            <div>
              {leftColumnFAQs.map((faq) => (
                <FAQItem key={faq.id} faq={faq} />
              ))}
            </div>

            {/* Right Column */}
            <div>
              {rightColumnFAQs.map((faq) => (
                <FAQItem key={faq.id} faq={faq} />
              ))}
            </div>
          </div>

          {/* Bottom CTA Section */}
          <div className="mt-20 text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl py-16 px-8 border border-blue-100">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Still have questions?
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Can't find the answer you're looking for? Our AI recruitment experts are here to help you get the most out of our platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
                  Schedule a Demo
                </button>
                <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transform hover:scale-105 transition-all duration-200">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}