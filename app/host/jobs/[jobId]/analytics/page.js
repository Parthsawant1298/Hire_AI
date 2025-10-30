"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, 
  Eye, 
  FileText, 
  Mic, 
  Trophy, 
  TrendingUp, 
  Calendar,
  Clock,
  Star,
  BarChart3,
  PieChart,
  ArrowLeft
} from 'lucide-react';

export default function JobAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}/analytics`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        console.error('Failed to fetch analytics:', data.error);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Not Available</h2>
          <p className="text-gray-600">Unable to load job analytics at this time.</p>
        </div>
      </div>
    );
  }

  const { job, applications, stats } = analytics;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{job?.jobTitle}</h1>
                <p className="text-gray-600">Job Analytics & Performance</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                job?.status === 'published' 
                  ? 'bg-green-100 text-green-800' 
                  : job?.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {job?.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalViews || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalApplications || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mic className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.completedInterviews || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Trophy className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Shortlisted</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.shortlisted || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Application Progress */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Application Progress
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Target Applications</span>
                <span className="font-medium">{job?.targetApplications || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((stats?.totalApplications / job?.targetApplications) * 100 || 0, 100)}%` 
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Current: {stats?.totalApplications || 0}</span>
                <span>{Math.round((stats?.totalApplications / job?.targetApplications) * 100 || 0)}% Complete</span>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Conversion Funnel
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Job Views</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full w-full"></div>
                  </div>
                  <span className="text-sm font-medium w-12">{stats?.totalViews || 0}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Applications</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ 
                        width: `${(stats?.totalApplications / Math.max(stats?.totalViews, 1)) * 100 || 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12">{stats?.totalApplications || 0}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Interviews</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ 
                        width: `${(stats?.completedInterviews / Math.max(stats?.totalApplications, 1)) * 100 || 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12">{stats?.completedInterviews || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Recent Applications
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {applications && applications.length > 0 ? (
              applications.slice(0, 10).map((application) => (
                <div key={application._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {application.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{application.userId?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{application.userId?.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        {application.atsScore && (
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">{application.atsScore}%</p>
                            <p className="text-xs text-gray-600">ATS Score</p>
                          </div>
                        )}
                        {application.finalScore && (
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">{application.finalScore}%</p>
                            <p className="text-xs text-gray-600">Final Score</p>
                          </div>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          application.status === 'shortlisted' 
                            ? 'bg-green-100 text-green-800'
                            : application.status === 'interview_completed'
                            ? 'bg-blue-100 text-blue-800'
                            : application.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {application.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}