// ================================
// MAIN DASHBOARD PAGE (app/main/page.jsx)
// ================================
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar'; // Your authenticated navbar
import { Brain, Users, BookOpen, Calendar, Award, TrendingUp, Loader2 } from 'lucide-react';

const DashboardCard = ({ icon: Icon, title, description, value, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200"
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
          {value && (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickActionCard = ({ icon: Icon, title, description, href, color = "blue" }) => {
  const colorClasses = {
    blue: "hover:bg-blue-50 border-blue-200 hover:border-blue-300",
    green: "hover:bg-green-50 border-green-200 hover:border-green-300",
    purple: "hover:bg-purple-50 border-purple-200 hover:border-purple-300",
    orange: "hover:bg-orange-50 border-orange-200 hover:border-orange-300"
  };

  return (
    <a 
      href={href}
      className={`block bg-white rounded-lg shadow p-6 border border-gray-200 transition-all ${colorClasses[color]}`}
    >
      <div className="flex items-center">
        <Icon className={`h-8 w-8 text-${color}-600`} />
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </a>
  );
};

export default function MainDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Not authenticated');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Authentication check failed:', error);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Main Content */}
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Ready to continue your AI/ML journey? Here's what's happening today.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              icon={BookOpen}
              title="Courses"
              description="Available courses"
              value="12"
              color="blue"
            />
            <DashboardCard
              icon={Calendar}
              title="Events"
              description="Upcoming events"
              value="5"
              color="green"
            />
            <DashboardCard
              icon={Users}
              title="Members"
              description="Active members"
              value="234"
              color="purple"
            />
            <DashboardCard
              icon={Award}
              title="Projects"
              description="Completed projects"
              value="18"
              color="orange"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <QuickActionCard
                icon={BookOpen}
                title="Browse Courses"
                description="Explore AI/ML courses and tutorials"
                href="/courses"
                color="blue"
              />
              <QuickActionCard
                icon={Calendar}
                title="Join Events"
                description="Register for upcoming workshops"
                href="/events"
                color="green"
              />
              <QuickActionCard
                icon={Brain}
                title="Start Project"
                description="Begin a new AI/ML project"
                href="/projects"
                color="purple"
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Courses */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                Recent Courses
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Introduction to Machine Learning</h4>
                    <p className="text-xs text-gray-500">Progress: 75%</p>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Deep Learning Fundamentals</h4>
                    <p className="text-xs text-gray-500">Progress: 45%</p>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '45%'}}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Python for Data Science</h4>
                    <p className="text-xs text-gray-500">Progress: 90%</p>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '90%'}}></div>
                  </div>
                </div>
              </div>
              <a 
                href="/courses" 
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View all courses →
              </a>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-green-600 mr-2" />
                Upcoming Events
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-green-100 text-green-600 rounded-lg p-2 text-xs font-bold">
                    <div>MAR</div>
                    <div>25</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">AI Workshop: Neural Networks</h4>
                    <p className="text-xs text-gray-500">2:00 PM - 4:00 PM</p>
                    <p className="text-xs text-gray-500">Room 301, CS Building</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-green-100 text-green-600 rounded-lg p-2 text-xs font-bold">
                    <div>MAR</div>
                    <div>28</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">Guest Lecture: Industry Insights</h4>
                    <p className="text-xs text-gray-500">10:00 AM - 12:00 PM</p>
                    <p className="text-xs text-gray-500">Auditorium A</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-green-100 text-green-600 rounded-lg p-2 text-xs font-bold">
                    <div>APR</div>
                    <div>02</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">Hackathon 2024</h4>
                    <p className="text-xs text-gray-500">9:00 AM - 6:00 PM</p>
                    <p className="text-xs text-gray-500">Innovation Lab</p>
                  </div>
                </div>
              </div>
              <a 
                href="/events" 
                className="inline-block mt-4 text-green-600 hover:text-green-700 text-sm font-medium"
              >
                View all events →
              </a>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
              Your Learning Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">8</div>
                <div className="text-sm text-gray-500">Courses Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">24</div>
                <div className="text-sm text-gray-500">Hours Learned</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">12</div>
                <div className="text-sm text-gray-500">Certificates Earned</div>
              </div>
            </div>
          </div>

          {/* Latest Announcements */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Latest Announcements</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900">New Course Available: Computer Vision</h4>
                <p className="text-sm text-gray-600 mt-1">
                  We're excited to announce our new Computer Vision course is now available. 
                  Learn about image processing, object detection, and more!
                </p>
                <p className="text-xs text-gray-500 mt-1">Posted 2 days ago</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900">Registration Open: AI Ethics Workshop</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Join us for an important discussion on AI ethics and responsible AI development. 
                  Limited seats available.
                </p>
                <p className="text-xs text-gray-500 mt-1">Posted 5 days ago</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900">Club Meeting: March Schedule</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Our monthly club meeting is scheduled for March 30th. 
                  We'll discuss upcoming projects and events.
                </p>
                <p className="text-xs text-gray-500 mt-1">Posted 1 week ago</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}