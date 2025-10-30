// 📄 7. HOST ANALYTICS PAGE
// File: app/host/analytics/page.js
// =================
"use client";

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Award, Eye } from 'lucide-react';
import Navbar from '@/components/Host/Navbar';
import Footer from '@/components/Footer';

export default function HostAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/host/jobs/analytics?period=${selectedPeriod}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Track your recruitment performance and insights</p>
            </div>
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

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Jobs Posted"
              value={analytics?.totalJobs || 0}
              change="+12%"
              icon={BarChart3}
              color="blue"
            />
            <MetricCard
              title="Total Applications"
              value={analytics?.totalApplications || 0}
              change="+23%"
              icon={Users}
              color="green"
            />
            <MetricCard
              title="Interviews Completed"
              value={analytics?.completedInterviews || 0}
              change="+8%"
              icon={Clock}
              color="purple"
            />
            <MetricCard
              title="Successful Hires"
              value={analytics?.successfulHires || 0}
              change="+15%"
              icon={Award}
              color="orange"
            />
          </div>

          {/* Charts and Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Trends */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Trends</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>Chart visualization would go here</p>
              </div>
            </div>

            {/* Top Performing Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Jobs</h3>
              <div className="space-y-3">
                {analytics?.topJobs?.map((job, index) => (
                  <div key={job._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{job.jobTitle}</p>
                      <p className="text-sm text-gray-600">{job.applications} applications</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">#{index + 1}</p>
                      <p className="text-xs text-gray-600">{job.conversionRate}% conversion</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-8">No data available</p>
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
