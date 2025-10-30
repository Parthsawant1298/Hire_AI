import { Check } from "lucide-react"

export default function PricingPlans() {
  const plans = [
    {
      name: "Starter",
      price: "$99",
      period: "/mo",
      billing: "billed yearly",
      billingNote: "or $120 billed monthly",
      buttonText: "Buy Now",
      buttonColor: "bg-green-500 hover:bg-green-600",
      popular: false,
    },
    {
      name: "Professional",
      price: "$299",
      period: "/mo",
      billing: "billed yearly",
      billingNote: "or $350 billed monthly",
      buttonText: "Buy Now",
      buttonColor: "bg-blue-500 hover:bg-blue-600",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$599",
      period: "/mo",
      billing: "billed yearly",
      billingNote: "or $699 billed monthly",
      buttonText: "Buy Now",
      buttonColor: "bg-blue-500 hover:bg-blue-600",
      popular: false,
    },
    {
      name: "Custom",
      price: "Contact us",
      period: "",
      billing: "for the specifics",
      billingNote: "",
      buttonText: "Ask Us",
      buttonColor: "bg-indigo-600 hover:bg-indigo-700",
      popular: false,
    },
  ]

  const topFeatures = [
    { name: "Active Job Postings", individual: "5", team: "25", enterprise: "100", custom: "Unlimited" },
    {
      name: "AI-Powered Candidate Matching",
      individual: "50/month",
      team: "250/month",
      enterprise: "1000/month",
      custom: "Unlimited",
    },
    {
      name: "VR Interview Sessions",
      individual: "10/month",
      team: "50/month",
      enterprise: "200/month",
      custom: "Unlimited",
    },
    {
      name: "Resume Database Access",
      individual: "100 profiles",
      team: "500 profiles",
      enterprise: "2000 profiles",
      custom: "Full Database",
    },
    {
      name: "AI Learning Assistant",
      individual: "Basic",
      team: "Advanced",
      enterprise: "Premium",
      custom: "Custom AI",
    },
    { name: "Team Collaboration", individual: "1 user", team: "5 users", enterprise: "25 users", custom: "Unlimited" },
    {
      name: "Analytics & Reporting",
      individual: "Basic",
      team: "Advanced",
      enterprise: "Enterprise",
      custom: "Custom Reports",
    },
  ]

  const productCapabilities = [
    { name: "AI Recruitment Engine", individual: true, team: true, enterprise: true, custom: true },
    { name: "Smart Resume Builder", individual: true, team: true, enterprise: true, custom: true },
    { name: "Global Job Discovery", individual: true, team: true, enterprise: true, custom: true },
    { name: "Basic VR Interviews", individual: true, team: true, enterprise: true, custom: true },
    { name: "Advanced VR Training", individual: false, team: true, enterprise: true, custom: true },
    { name: "Enterprise Analytics", individual: false, team: true, enterprise: true, custom: true },
    { name: "API Access", individual: false, team: true, enterprise: true, custom: true },
    { name: "Custom AI Models", individual: false, team: false, enterprise: true, custom: true },
    { name: "White-label Solution", individual: false, team: false, enterprise: true, custom: true },
    { name: "Dedicated Support", individual: false, team: false, enterprise: false, custom: true },
    { name: "Custom Integrations", individual: false, team: false, enterprise: false, custom: true },
  ]

  return (
    <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-14 md:mb-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4 md:mb-6 leading-tight">
            Pricing Plans
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
            From startups to enterprises, choose the perfect AI recruitment solution for your hiring needs. Scale your
            talent acquisition with our comprehensive platform features.
          </p>
        </div>

        {/* Most Popular Badge */}
        <div className="flex justify-center mb-2">
          <div className="bg-blue-500 text-white px-4 sm:px-6 py-2 rounded-full text-sm font-semibold tracking-wide">
            MOST POPULAR
          </div>
        </div>

        {/* Mobile Plans Layout */}
        <div className="block lg:hidden space-y-6 mb-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl shadow-lg p-6 ${plan.popular ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
            >
              <div className="text-center">
                <h3 className={`text-xl font-bold mb-4 ${plan.popular ? "text-blue-600" : "text-gray-800"}`}>
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-800">{plan.price}</span>
                  <span className="text-gray-500 text-lg">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{plan.billing}</p>
                {plan.billingNote && <p className="text-xs text-gray-500 mb-6">{plan.billingNote}</p>}
                <button
                  className={`w-full ${plan.buttonColor} text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Pricing Section */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="grid grid-cols-5 min-h-[400px]">
            {/* Left Column - Choose your plan */}
            <div className="bg-gray-100 p-8 flex items-center justify-center border-r border-gray-200">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 leading-tight">
                  Choose
                  <br />
                  your plan
                </h2>
              </div>
            </div>

            {/* Pricing Cards */}
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`p-8 text-center border-r border-gray-200 last:border-r-0 flex flex-col justify-between ${plan.popular ? "bg-blue-50" : "bg-white"}`}
              >
                <div>
                  <h3 className={`text-xl font-bold mb-6 ${plan.popular ? "text-blue-600" : "text-gray-800"}`}>
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-800">{plan.price}</span>
                    <span className="text-gray-500 text-lg">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{plan.billing}</p>
                  {plan.billingNote && <p className="text-xs text-gray-500 mb-8">{plan.billingNote}</p>}
                </div>
                <button
                  className={`w-full ${plan.buttonColor} text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Features Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Top Features Section */}
          <div className="bg-gray-100 px-4 sm:px-8 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Top features</h3>
          </div>

          {/* Mobile Features Layout */}
          <div className="block lg:hidden">
            {topFeatures.map((feature, index) => (
              <div key={index} className="border-b border-gray-200 last:border-b-0 p-4">
                <div className="flex items-center mb-3">
                  <span className="font-medium text-gray-800">{feature.name}</span>
                  <div className="ml-2 w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">?</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Starter</div>
                    <div className="text-gray-700">{feature.individual}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Professional</div>
                    <div className="text-gray-700">{feature.team}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Enterprise</div>
                    <div className="text-gray-700">{feature.enterprise}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Custom</div>
                    <div className="text-gray-700">{feature.custom}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Features Layout */}
          <div className="hidden lg:block">
            {topFeatures.map((feature, index) => (
              <div
                key={index}
                className="grid grid-cols-5 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="px-8 py-4 bg-gray-50 font-medium text-gray-800 border-r border-gray-200 flex items-center">
                  <span>{feature.name}</span>
                  <div className="ml-2 w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">?</span>
                  </div>
                </div>
                <div className="px-8 py-4 text-center text-gray-700 border-r border-gray-200 flex items-center justify-center">
                  {feature.individual}
                </div>
                <div className="px-8 py-4 text-center text-gray-700 border-r border-gray-200 flex items-center justify-center">
                  {feature.team}
                </div>
                <div className="px-8 py-4 text-center text-gray-700 border-r border-gray-200 flex items-center justify-center">
                  {feature.enterprise}
                </div>
                <div className="px-8 py-4 text-center text-gray-700 flex items-center justify-center">
                  {feature.custom}
                </div>
              </div>
            ))}
          </div>

          {/* Product Capabilities Section */}
          <div className="bg-gray-100 px-4 sm:px-8 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Product capabilities</h3>
          </div>

          {/* Mobile Capabilities Layout */}
          <div className="block lg:hidden">
            {productCapabilities.map((capability, index) => (
              <div key={index} className="border-b border-gray-200 last:border-b-0 p-4">
                <div className="font-medium text-gray-800 mb-3">{capability.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Starter</span>
                    {capability.individual ? (
                      <Check className="w-5 h-5 text-blue-500" />
                    ) : (
                      <span className="text-gray-300 text-lg">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Professional</span>
                    {capability.team ? (
                      <Check className="w-5 h-5 text-blue-500" />
                    ) : (
                      <span className="text-gray-300 text-lg">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Enterprise</span>
                    {capability.enterprise ? (
                      <Check className="w-5 h-5 text-blue-500" />
                    ) : (
                      <span className="text-gray-300 text-lg">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Custom</span>
                    {capability.custom ? (
                      <Check className="w-5 h-5 text-blue-500" />
                    ) : (
                      <span className="text-gray-300 text-lg">—</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Capabilities Layout */}
          <div className="hidden lg:block">
            {productCapabilities.map((capability, index) => (
              <div
                key={index}
                className="grid grid-cols-5 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="px-8 py-4 bg-gray-50 font-medium text-gray-800 border-r border-gray-200 flex items-center">
                  {capability.name}
                </div>
                <div className="px-8 py-4 text-center border-r border-gray-200 flex items-center justify-center">
                  {capability.individual ? (
                    <Check className="w-5 h-5 text-blue-500" />
                  ) : (
                    <span className="text-gray-300 text-lg">—</span>
                  )}
                </div>
                <div className="px-8 py-4 text-center border-r border-gray-200 flex items-center justify-center">
                  {capability.team ? (
                    <Check className="w-5 h-5 text-blue-500" />
                  ) : (
                    <span className="text-gray-300 text-lg">—</span>
                  )}
                </div>
                <div className="px-8 py-4 text-center border-r border-gray-200 flex items-center justify-center">
                  {capability.enterprise ? (
                    <Check className="w-5 h-5 text-blue-500" />
                  ) : (
                    <span className="text-gray-300 text-lg">—</span>
                  )}
                </div>
                <div className="px-8 py-4 text-center flex items-center justify-center">
                  {capability.custom ? (
                    <Check className="w-5 h-5 text-blue-500" />
                  ) : (
                    <span className="text-gray-300 text-lg">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}