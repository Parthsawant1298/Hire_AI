"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  BarChart3, 
  Users, 
  Eye, 
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink
} from 'lucide-react';

export default function HostJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, []);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJob(data.job);
        setApplications(data.applications || []);
      } else {
        console.error('Failed to fetch job details:', data.error);
      }
    } catch (error) {
      console.error('Job details fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}/delete`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Job deleted successfully');
        router.push('/host/dashboard');
      } else {
        alert('Failed to delete job: ' + data.error);
      }
    } catch (error) {
      console.error('Delete job error:', error);
      alert('Failed to delete job. Please try again.');
    } finally {
      setDeleting(false);
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
      case 'published': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <AlertCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      case 'paused': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-4">The job you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/host/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
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
                onClick={() => router.push('/host/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{job.jobTitle}</h1>
                <p className="text-gray-600">Job Details & Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(job.status)}`}>
                {getStatusIcon(job.status)}
                <span className="capitalize">{job.status}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Information */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h2>
              
              {job.jobImage && (
                <img 
                  src={job.jobImage} 
                  alt={job.jobTitle} 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{job.jobDescription}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Responsibilities</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{job.jobResponsibilities}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Requirements</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{job.jobRequirements}</p>
                </div>

                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-1" />
                    <span className="capitalize">{job.jobType}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{job.voiceInterviewDuration} min interview</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Applications */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {applications.length > 0 ? (
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
                                <p className="text-xs text-gray-600">ATS</p>
                              </div>
                            )}
                            {application.finalScore && (
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-900">{application.finalScore}%</p>
                                <p className="text-xs text-gray-600">Final</p>
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
              {applications.length > 10 && (
                <div className="p-6 border-t border-gray-200 text-center">
                  <button
                    onClick={() => router.push(`/host/jobs/${params.jobId}/analytics`)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All Applications
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Views</span>
                  <span className="font-medium">{job.views || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Applications</span>
                  <span className="font-medium">{applications.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target</span>
                  <span className="font-medium">{job.targetApplications}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shortlist Slots</span>
                  <span className="font-medium">{job.maxCandidatesShortlist}</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round((applications.length / job.targetApplications) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((applications.length / job.targetApplications) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/host/jobs/${params.jobId}/analytics`)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Analytics</span>
                </button>
                
                <button
                  onClick={() => router.push(`/host/jobs/${params.jobId}/edit`)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Job</span>
                </button>

                <button
                  onClick={() => router.push(`/jobs/${params.jobId}`)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View Public Page</span>
                </button>
                
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{deleting ? 'Deleting...' : 'Delete Job'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}