// 📄 7. HOST DASHBOARD PAGE
// File: app/host/dashboard/page.js
// =================
"use client";

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Award, Eye, Briefcase, Target, CheckCircle, XCircle, Calendar, DollarSign } from 'lucide-react';
import Navbar from '@/components/Host/Navbar';
import Footer from '@/components/Footer';

export default function HostDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Force fresh data load on mount
    fetchDashboardData();
    
    // Optional: Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Clear any cached data first
      setRecentJobs([]);
      setRecentApplications([]);
      setAnalytics(null);

      // Add timestamp to prevent any caching
      const timestamp = Date.now();
      // Fetch analytics data
      const analyticsResponse = await fetch(`/api/host/jobs/analytics?period=${selectedPeriod}&_t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        if (analyticsData.success) {
          setAnalytics(analyticsData.analytics);
        }
      }

      // Fetch recent jobs
      const jobsResponse = await fetch(`/api/host/jobs/list?limit=5&_t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        if (jobsData.success) {
          console.log('Dashboard: Fetched jobs:', jobsData.jobs.length, jobsData.jobs.map(j => ({ id: j._id, title: j.jobTitle })));
          setRecentJobs(jobsData.jobs);
        }
      }

      // Fetch recent applications
      const applicationsResponse = await fetch(`/api/host/jobs/applications/recent?limit=5&_t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        if (applicationsData.success) {
          setRecentApplications(applicationsData.applications);
        }
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div key={refreshKey} className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-16">
        {/* Debug Info - Remove this after fixing */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Debug Info:</strong> Jobs: {recentJobs.length}, Applications: {recentApplications.length}, 
              Analytics: {analytics ? `Total Jobs: ${analytics.totalJobs}, Apps: ${analytics.totalApplications}` : 'Not loaded'}, 
              Last refresh: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here's your recruitment overview</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setRefreshKey(prev => prev + 1);
                  fetchDashboardData();
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Refresh Data
              </button>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Jobs Posted"
              value={analytics?.totalJobs || 0}
              change={analytics?.totalJobs > 0 ? "+12%" : "No change"}
              icon={Briefcase}
              color="blue"
            />
            <MetricCard
              title="Total Applications"
              value={analytics?.totalApplications || 0}
              change={analytics?.totalApplications > 0 ? "+23%" : "No change"}
              icon={Users}
              color="green"
            />
            <MetricCard
              title="Interviews Completed"
              value={analytics?.completedInterviews || 0}
              change={analytics?.completedInterviews > 0 ? "+8%" : "No change"}
              icon={Clock}
              color="purple"
            />
            <MetricCard
              title="Successful Hires"
              value={analytics?.successfulHires || 0}
              change={analytics?.successfulHires > 0 ? "+15%" : "No change"}
              icon={Award}
              color="orange"
            />
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Jobs */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Jobs ({recentJobs.length})</h3>
                <a href="/host/jobs" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All →
                </a>
              </div>
              <div className="space-y-4">
                {recentJobs.length > 0 ? recentJobs.map((job) => (
                  <div key={job._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{job.jobTitle}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.currentApplications}/{job.targetApplications} applications
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.status === 'published' ? 'bg-green-100 text-green-800' :
                          job.status === 'interviews_active' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <a href={`/host/jobs/${job._id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View Details
                      </a>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No jobs posted yet</p>
                    <a href="/host/create-job" className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">
                      Create your first job →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a href="/host/create-job" className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Post New Job
                </a>
                <a href="/host/jobs" className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center">
                  <Eye className="h-5 w-5 mr-2" />
                  View All Jobs
                </a>
                <a href="/host/candidates" className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center">
                  <Users className="h-5 w-5 mr-2" />
                  Manage Candidates
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Jobs</h3>
              <div className="space-y-3">
                {analytics?.topJobs?.length > 0 ? analytics.topJobs.map((job, index) => (
                  <div key={job._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{job.jobTitle}</p>
                      <p className="text-sm text-gray-600">{job.applications} applications</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">#{index + 1}</p>
                      <p className="text-xs text-gray-600">{job.conversionRate}% conversion</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No performance data yet</p>
                    <p className="text-sm">Post jobs and receive applications to see analytics</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Applications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
                <a href="/host/candidates" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All →
                </a>
              </div>
              <div className="space-y-3">
                {recentApplications.length > 0 ? recentApplications.map((app) => (
                  <div key={app._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{app.userId?.name || 'Unknown Candidate'}</p>
                      <p className="text-sm text-gray-600">{app.jobId?.jobTitle || 'Unknown Job'}</p>
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
                      {app.atsScore && (
                        <p className="text-xs text-gray-600 mt-1">ATS: {app.atsScore}%</p>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent applications</p>
                    <p className="text-sm">Applications will appear here once candidates apply</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function MetricCard({ title, value, change, icon: Icon, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-green-600">{change} from last period</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}