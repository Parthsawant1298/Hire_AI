// components/JobCard.jsx - Unified Job Card for Host and User Views
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, Clock, Users, Briefcase, Calendar, Eye, Edit, Trash2, 
  BarChart3, CheckCircle, AlertCircle, XCircle, PlayCircle,
  TrendingUp, UserCheck, MessageSquare
} from 'lucide-react';

export default function JobCard({ job, isHost = false, onEdit, onDelete, onViewCandidates }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-700 border-gray-300',
      published: 'bg-blue-100 text-blue-700 border-blue-300',
      applications_open: 'bg-green-100 text-green-700 border-green-300',
      applications_closed: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      interviews_active: 'bg-purple-100 text-purple-700 border-purple-300',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      cancelled: 'bg-red-100 text-red-700 border-red-300'
    };
    return statusColors[status] || statusColors.draft;
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      draft: <Edit className="h-3 w-3" />,
      published: <PlayCircle className="h-3 w-3" />,
      applications_open: <UserCheck className="h-3 w-3" />,
      applications_closed: <Clock className="h-3 w-3" />,
      interviews_active: <MessageSquare className="h-3 w-3" />,
      completed: <CheckCircle className="h-3 w-3" />,
      cancelled: <XCircle className="h-3 w-3" />
    };
    return statusIcons[status] || statusIcons.draft;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCardClick = () => {
    if (loading) return;
    
    if (isHost) {
      // Host view - go to job management
      router.push(`/host/jobs/${job.id || job._id}`);
    } else {
      // User view - go to job details
      router.push(`/jobs/${job.id || job._id}`);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(job);
    } else {
      router.push(`/host/jobs/${job.id || job._id}/edit`);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(job);
    } else if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        setLoading(true);
        const response = await fetch(`/api/host/jobs/${job.id || job._id}/delete`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          window.location.reload();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete job');
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete job');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewCandidates = (e) => {
    e.stopPropagation();
    if (onViewCandidates) {
      onViewCandidates(job);
    } else {
      router.push(`/host/jobs/${job.id || job._id}/candidates`);
    }
  };

  const handleViewStatus = (e) => {
    e.stopPropagation();
    router.push(`/host/jobs/${job.id || job._id}/status`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Job Image */}
      {job.jobImage && (
        <div className="h-48 w-full overflow-hidden">
          <img 
            src={job.jobImage} 
            alt={job.jobTitle}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 cursor-pointer" onClick={handleCardClick}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                {getStatusIcon(job.status)}
                {job.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                job.jobType === 'job' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {job.jobType === 'job' ? 'Full-time' : 'Internship'}
              </span>
            </div>
            
            <h3 className="font-semibold text-lg text-gray-900 mb-2 hover:text-blue-600 transition-colors">
              {job.jobTitle}
            </h3>
            
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <Briefcase className="h-4 w-4 mr-1" />
              <span>{job.hostId?.organization || job.organization}</span>
            </div>
          </div>

          {/* Host Actions */}
          {isHost && (
            <div className="flex items-center gap-1 ml-4">
              {job.currentApplications > 0 && (
                <button
                  onClick={handleViewCandidates}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Candidates"
                >
                  <Users className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={handleViewStatus}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="View Statistics"
              >
                <BarChart3 className="h-4 w-4" />
              </button>

              {job.actions?.canEdit && (
                <button
                  onClick={handleEdit}
                  className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Edit Job"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}

              {job.actions?.canDelete && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Job"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 cursor-pointer" onClick={handleCardClick}>
          {job.jobDescription?.substring(0, 120)}...
        </p>

        {/* Stats for Host View */}
        {isHost && job.applicationProgress && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Applications</span>
              <span className="text-sm text-gray-600">
                {job.applicationProgress.current}/{job.applicationProgress.target}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(job.applicationProgress.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{job.applicationProgress.percentage}% filled</span>
              {job.applicationProgress.remaining > 0 && (
                <span>{job.applicationProgress.remaining} slots left</span>
              )}
            </div>
          </div>
        )}

        {/* Interview Progress for Host View */}
        {isHost && job.status === 'interviews_active' && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">Interviews</span>
              <span className="text-sm text-purple-600">
                {job.completedInterviews || 0} completed
              </span>
            </div>
            {job.maxCandidatesShortlist && (
              <div className="flex items-center justify-between text-xs text-purple-500">
                <span>
                  {job.maxCandidatesShortlist - (job.completedInterviews || 0)} pending
                </span>
                <span>Target: {job.maxCandidatesShortlist}</span>
              </div>
            )}
          </div>
        )}

        {/* Recent Applications for Host */}
        {isHost && job.recentApplications && job.recentApplications.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Recent Applications</span>
            </div>
            <div className="flex -space-x-2">
              {job.recentApplications.slice(0, 4).map((app, index) => (
                <div key={index} className="relative">
                  {app.candidate.profilePicture ? (
                    <img
                      src={app.candidate.profilePicture}
                      alt={app.candidate.name}
                      className="w-8 h-8 rounded-full border-2 border-white"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {app.candidate.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
              ))}
              {job.recentApplications.length > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-medium">
                  +{job.recentApplications.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Job Details */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            {job.maxCandidatesShortlist && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{job.maxCandidatesShortlist} positions</span>
              </div>
            )}
            
            {job.voiceInterviewDuration && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{job.voiceInterviewDuration}min interview</span>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formatDate(job.createdAt)}</span>
          </div>
        </div>

        {/* Application Deadline */}
        {job.applicationDeadline && !isHost && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500">Deadline: </span>
            <span className={`font-medium ${
              new Date(job.applicationDeadline) > new Date() 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatDate(job.applicationDeadline)}
            </span>
          </div>
        )}

        {/* User Actions */}
        {!isHost && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={handleCardClick}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              disabled={loading}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </button>

            {job.totalViews && (
              <div className="flex items-center text-gray-500 text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>{job.totalViews} views</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}