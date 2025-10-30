"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brain, User, LogOut, ChevronDown, Settings, Calendar } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  
  // Navigation items
  const navItems = [
    { name: "Dashboard", path: "/main" },
    { name: "Jobs", path: "/jobs" },
    { name: "Courses", path: "/courses" },
    { name: "Events", path: "/events" },
    { name: "Projects", path: "/projects" },
    { name: "Quizzes", path: "/quizzes" },
    { name: "Resources", path: "/resources" },
  ];
  
  // Handle scroll effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsScrolled(window.scrollY > 10);
    }
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auth check
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        throw new Error('Not authenticated');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle click outside profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileMenuOpen]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setUser(null);
        router.replace('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <span className="text-gray-900 font-bold">HireAI</span>
          </div>
          <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full"></div>
        </div>
      </header>
    );
  }

  if (!user) {
    return null;
  }
  
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200" 
          : "bg-white border-b border-gray-200"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/main" className="flex items-center gap-2 text-xl font-bold">
            <Brain className="h-6 w-6 text-blue-600" />
            <span className="text-gray-900">HireAI</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center">
            <ul className="flex gap-8">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.path}
                    className={`text-gray-700 hover:text-blue-600 transition-colors duration-300 relative py-1
                     after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-blue-600
                     after:transition-all after:duration-300 hover:after:w-full ${
                       pathname === item.path ? "text-blue-600 after:w-full" : ""
                     }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Host Button & User Profile Section (Desktop) */}
            <div className="flex items-center ml-8 space-x-4">
              {/* Host Button */}
              <Link href="/host/login">
                <button className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors duration-200">
                  Host
                </button>
              </Link>

              {/* User Profile Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 focus:outline-none transition-colors"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-blue-200 overflow-hidden flex items-center justify-center">
                    {user.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-blue-600" />
                    )}
                  </div>
                  <span className="font-medium">{user.name?.split(' ')[0]}</span>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${
                      isProfileMenuOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-10 border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    
                    <Link 
                      href="/profile" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <User size={16} className="mr-3" />
                      <span>My Profile</span>
                    </Link>
                    
                    <Link 
                      href="/settings" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <Settings size={16} className="mr-3" />
                      <span>Settings</span>
                    </Link>
                    
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={16} className="mr-3" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden text-gray-700 p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
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
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200">
            <div className="container mx-auto px-4 py-6">
              <ul className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.path}
                      className={`text-gray-700 text-lg font-medium hover:text-blue-600 block py-2 ${
                        pathname === item.path ? "text-blue-600" : ""
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* User Profile Section (Mobile) */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-blue-200 overflow-hidden flex items-center justify-center">
                    {user.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Host Button - Mobile */}
                  <Link 
                    href="/host/login" 
                    className="w-full bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-3 rounded-lg text-center transition-all duration-300 font-medium flex items-center justify-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Calendar size={18} className="mr-2" />
                    Host Event
                  </Link>

                  <Link 
                    href="/profile" 
                    className="w-full bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 px-4 py-3 rounded-lg text-center transition-all duration-300 font-medium flex items-center justify-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User size={18} className="mr-2" />
                    My Profile
                  </Link>
                  
                  <Link 
                    href="/settings" 
                    className="w-full bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 px-4 py-3 rounded-lg text-center transition-all duration-300 font-medium flex items-center justify-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings size={18} className="mr-2" />
                    Settings
                  </Link>
                  
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-lg text-center transition-all duration-300 font-medium flex items-center justify-center"
                  >
                    <LogOut size={18} className="mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}