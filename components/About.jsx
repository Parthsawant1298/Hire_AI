import Image from "next/image"

export default function RecruitmentServices() {
  return (
    <div className="bg-white py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-8 sm:mb-10 md:mb-12">
          <div className="max-w-4xl mb-6 lg:mb-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight text-center lg:text-left">
              We offer a wide range of AI-powered services to revolutionize your hiring process
            </h2>
          </div>
          <div className="text-center lg:text-right lg:mt-2">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 mb-1">25k+</div>
            <div className="text-xs sm:text-sm text-gray-600">Successful recruitments powered by AI</div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
          {/* Left Side - Image */}
          <div className="relative order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&h=450&q=80"
                alt="AI-powered recruitment dashboard showing candidate matching analytics"
                width={600}
                height={450}
                className="w-full h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] object-cover"
              />
            </div>
          </div>

          {/* Right Side - Content */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6 order-1 lg:order-2">
            {/* Revolutionary Badge */}
            <div className="flex justify-center lg:justify-start">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                Revolutionary
              </div>
            </div>

            {/* Heading */}
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight text-center lg:text-left">
              Our AI-powered platform delivers next-generation recruitment and career development solutions.
            </h3>

            {/* Description */}
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed text-center lg:text-left">
              We are committed to transforming the recruitment landscape with cutting-edge AI technology. Our comprehensive
              two-sided platform serves both HR professionals and job seekers with advanced features like VR interview
              simulations, intelligent candidate matching, automated screening, and personalized career development. From
              initial job posting to final hiring decision, every step is optimized for efficiency and success.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto">
                Start Hiring
              </button>
              <button className="border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 bg-white text-sm sm:text-base w-full sm:w-auto">
                Explore Platform
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}