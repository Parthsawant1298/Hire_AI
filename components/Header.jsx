"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Brain } from "lucide-react"
import { usePathname } from "next/navigation"

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const headerRef = useRef(null)
  
  // Navigation items
  const navItems = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "FAQ", path: "/faq" },
    { name: "Contact Us", path: "/contact" },
  ]
  
  // Close mobile menu on outside click and escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
      }
    }
    
    const handleClickOutside = (e) => {
      if (isMobileMenuOpen && headerRef.current && !headerRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false)
      }
    }
    
    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.addEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = ""
    }
  }, [isMobileMenuOpen])
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }
  
  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-3 text-xl font-bold"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Brain className="h-7 w-7 text-blue-600" />
            <span className="text-gray-900 font-extrabold tracking-tight">HireAI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center absolute left-1/2 transform -translate-x-1/2">
            <ul className="flex gap-8">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.path}
                    className="py-2 px-3 font-medium rounded-md relative transition-colors duration-200
                     after:absolute after:bottom-0 after:left-1/2 after:h-[2px] after:w-0 after:bg-blue-600
                     after:transition-all after:duration-300 after:transform after:-translate-x-1/2
                     hover:after:w-3/4 hover:text-blue-600 text-black"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Host Button - Desktop */}
            <Link href="/host/login" className="hidden lg:block">
              <button 
                className="bg-white text-blue-600 border border-blue-600 px-6 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors duration-200"
              >
                Host
              </button>
            </Link>
            
            {/* Login Button - Desktop */}
            <Link href="/login" className="hidden lg:block">
              <button 
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Login
              </button>
            </Link>
            
            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden text-gray-700 p-2 rounded-md"
              onClick={toggleMobileMenu}
            >
              <div className="space-y-1.5 w-6">
                <span 
                  className={`block w-6 h-0.5 bg-blue-600 transition-all duration-300 ${
                    isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''
                  }`}
                />
                <span 
                  className={`block w-6 h-0.5 bg-blue-600 transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span 
                  className={`block w-6 h-0.5 bg-blue-600 transition-all duration-300 ${
                    isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div 
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          } bg-white border-t border-gray-200`}
        >
          <div className="py-4 space-y-1">
            {navItems.map((item) => (
              <div key={item.name}>
                <Link
                  href={item.path}
                  className="block text-center py-3 px-4 mx-4 text-lg font-medium rounded-lg relative transition-colors duration-200
                           after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:bg-blue-600
                           after:transition-all after:duration-300 after:transform after:-translate-x-1/2
                           hover:after:w-3/4 hover:text-blue-600 text-black"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              </div>
            ))}
            
            {/* Host Button - Mobile */}
            <div className="flex justify-center pt-2">
              <Link href="/host/login" onClick={() => setIsMobileMenuOpen(false)}>
                <button 
                  className="bg-white text-blue-600 border border-blue-600 px-8 py-3 rounded-lg font-medium min-w-[140px] hover:bg-blue-50 transition-colors duration-200"
                >
                  Host
                </button>
              </Link>
            </div>
            
            {/* Login Button - Mobile */}
            <div className="flex justify-center pt-2 pb-2">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <button 
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium min-w-[140px] hover:bg-blue-700 transition-colors duration-200"
                >
                  Login
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header