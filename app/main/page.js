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
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalApplications: 0,
      pendingInterviews: 0,
      completedInterviews: 0,
      acceptedOffers: 0
    },
    applications: []
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Check authentication
      const authResponse = await fetch('/api/auth/user', {
        credentials: 'include'
      });

      if (!authResponse.ok) {
        router.push('/login');
        return;
      }

      const authData = await authResponse.json();
      setUser(authData.user);

      // Load real dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Auth/Dashboard error:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      console.log('Loading real dashboard data for main page...');
      
      const [applicationsRes, statsRes] = await Promise.all([
        fetch('/api/user/applications?limit=5', { credentials: 'include' }),
        fetch('/api/user/stats', { credentials: 'include' })
      ]);

      if (applicationsRes.ok) {
        const applicationsData = await applicationsRes.json();
        console.log('Real applications data:', applicationsData);
        if (applicationsData.success) {
          setDashboardData(prev => ({
            ...prev,
            applications: applicationsData.applications || []
          }));
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('Real stats data:', statsData);
        if (statsData.success) {
          setDashboardData(prev => ({
            ...prev,
            stats: statsData.stats || prev.stats
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load real dashboard data:', error);
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
          {/* Debug Info - Remove after confirming real data */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Real Main Dashboard Data:</strong> 
              Applications: {dashboardData.applications.length}, 
              Total Apps: {dashboardData.stats.totalApplications}, 
              Pending: {dashboardData.stats.pendingInterviews}, 
              Completed: {dashboardData.stats.completedInterviews}, 
              Offers: {dashboardData.stats.acceptedOffers}
            </p>
          </div>
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Ready to continue your job search journey? Here's your real dashboard with live data.
            </p>
            <div className="mt-4">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {/* Stats Cards - Now Real Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              icon={BookOpen}
              title="Total Applications"
              description="Jobs you've applied to"
              value={dashboardData.stats.totalApplications}
              color="blue"
            />
            <DashboardCard
              icon={Calendar}
              title="Pending Interviews"
              description="Awaiting interview"
              value={dashboardData.stats.pendingInterviews}
              color="green"
            />
            <DashboardCard
              icon={Users}
              title="Completed Interviews"
              description="Interviews done"
              value={dashboardData.stats.completedInterviews}
              color="purple"
            />
            <DashboardCard
              icon={Award}
              title="Accepted Offers"
              description="Job offers received"
              value={dashboardData.stats.acceptedOffers}
              color="orange"
            />
          </div>

          {/* Quick Actions - Updated Navigation */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <QuickActionCard
                icon={BookOpen}
                title="Job Search"
                description="Find your dream job"
                href="/job-search"
                color="blue"
              />
              <QuickActionCard
                icon={Brain}
                title="Courses AI"
                description="AI-powered learning courses"
                href="/course-ai"
                color="green"
              />
              <QuickActionCard
                icon={Calendar}
                title="ARVR Interview"
                description="Virtual reality interviews"
                href="/arvr-interview"
                color="purple"
              />
              <QuickActionCard
                icon={Users}
                title="Interview"
                description="Practice interviews"
                href="/interview"
                color="orange"
              />
              <QuickActionCard
                icon={TrendingUp}
                title="Browse Jobs"
                description="Explore available positions"
                href="/jobs"
                color="blue"
              />
              <QuickActionCard
                icon={Award}
                title="Profile"
                description="Update your profile"
                href="/profile"
                color="green"
              />
            </div>
          </div>

          {/* Recent Activity - Real Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Applications */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                Recent Applications ({dashboardData.applications.length})
              </h3>
              <div className="space-y-4">
                {dashboardData.applications.length > 0 ? dashboardData.applications.map((app) => (
                  <div key={app._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{app.jobId?.jobTitle || 'Unknown Job'}</h4>
                      <p className="text-xs text-gray-500">{app.jobId?.companyName || 'Unknown Company'}</p>
                      <p className="text-xs text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                        app.status === 'selected' ? 'bg-purple-100 text-purple-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No applications yet</p>
                    <p className="text-sm">Start applying to jobs to see them here</p>
                  </div>
                )}
              </div>
              <a 
                href="/profile" 
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View all applications →
              </a>
            </div>

            {/* Interview Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-green-600 mr-2" />
                Interview Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Pending Interviews</h4>
                    <p className="text-xs text-gray-500">Awaiting your response</p>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {dashboardData.stats.pendingInterviews}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Completed Interviews</h4>
                    <p className="text-xs text-gray-500">Successfully finished</p>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData.stats.completedInterviews}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Accepted Offers</h4>
                    <p className="text-xs text-gray-500">Job offers received</p>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboardData.stats.acceptedOffers}
                  </div>
                </div>
              </div>
              <a 
                href="/interview" 
                className="inline-block mt-4 text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Manage interviews →
              </a>
            </div>
          </div>

          {/* Application Summary - Real Data */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
              Your Application Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalApplications}</div>
                <div className="text-sm text-gray-500">Total Applications</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{dashboardData.stats.pendingInterviews}</div>
                <div className="text-sm text-gray-500">Pending Interviews</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{dashboardData.stats.completedInterviews}</div>
                <div className="text-sm text-gray-500">Completed Interviews</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{dashboardData.stats.acceptedOffers}</div>
                <div className="text-sm text-gray-500">Accepted Offers</div>
              </div>
            </div>
          </div>

          {/* Job Search Tips */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Job Search Tips</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900">Complete Your Profile</h4>
                <p className="text-sm text-gray-600 mt-1">
                  A complete profile with resume and skills increases your chances of getting noticed by employers.
                </p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900">Apply Regularly</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Don't wait for the perfect job. Apply to multiple positions that match your skills and interests.
                </p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900">Prepare for Interviews</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Use our AI-powered interview preparation tools to practice and improve your interview skills.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}