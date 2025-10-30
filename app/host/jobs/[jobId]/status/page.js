"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  BarChart3,
  TrendingUp,
  Calendar
} from 'lucide-react';

export default function JobStatusPage() {
  const params = useParams();
  const router = useRouter();
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobStatus();
  }, []);

  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}/status`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJobData(data.job);
      } else {
        console.error('Failed to fetch job status:', data.error);
      }
    } catch (error) {
      console.error('Job status fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-5 w-5" />;
      case 'draft': return <AlertCircle className="h-5 w-5" />;
      case 'closed': return <XCircle className="h-5 w-5" />;
      case 'paused': return <AlertCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-600">Unable to load job status.</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold text-gray-900">{jobData.jobTitle}</h1>
                <p className="text-gray-600">Job Status Overview</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 ${getStatusColor(jobData.status)}`}>
                {getStatusIcon(jobData.status)}
                <span className="capitalize">{jobData.status}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Status Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Current Status</h2>
              
              <div className="space-y-6">
                {/* Status Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{jobData.stats?.totalApplications || 0}</div>
                    <div className="text-sm text-gray-600">Applications</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{jobData.stats?.shortlisted || 0}</div>
                    <div className="text-sm text-gray-600">Shortlisted</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{jobData.voiceInterviewDuration}m</div>
                    <div className="text-sm text-gray-600">Interview Length</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Application Progress</span>
                    <span>{jobData.stats?.totalApplications || 0}/{jobData.targetApplications}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(((jobData.stats?.totalApplications || 0) / jobData.targetApplications) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(((jobData.stats?.totalApplications || 0) / jobData.targetApplications) * 100)}% Complete
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="text-sm">
                        <span className="font-medium">Created:</span> {new Date(jobData.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {jobData.publishedAt && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="text-sm">
                          <span className="font-medium">Published:</span> {new Date(jobData.publishedAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <div className="text-sm">
                        <span className="font-medium">Last Updated:</span> {new Date(jobData.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/host/jobs/${params.jobId}/analytics`)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Analytics</span>
                </button>
                
                <button
                  onClick={() => router.push(`/host/jobs/${params.jobId}/candidates`)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Users className="h-4 w-4" />
                  <span>Manage Candidates</span>
                </button>

                <button
                  onClick={() => router.push(`/host/jobs/${params.jobId}`)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>View Details</span>
                </button>
              </div>
            </div>

            {/* Job Settings */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Job Type:</span>
                  <span className="font-medium capitalize">{jobData.jobType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Apps:</span>
                  <span className="font-medium">{jobData.targetApplications}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shortlist Limit:</span>
                  <span className="font-medium">{jobData.maxCandidatesShortlist}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Final Selection:</span>
                  <span className="font-medium">{jobData.finalSelectionCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}