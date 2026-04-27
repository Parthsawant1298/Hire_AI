// File: app/jobs/[jobId]/page.js
// =================
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Upload, FileText, Briefcase, MapPin, Clock, Users, Star, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [job, setJob] = useState(null);
  const [userApplication, setUserApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [resume, setResume] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [params.jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.jobId}/details`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJob(data.job);
        setUserApplication(data.userApplication);
      } else {
        router.push('/jobs');
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      router.push('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Resume file size must be less than 10MB');
        return;
      }
      if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        alert('Only PDF and Word documents are allowed');
        return;
      }
      setResume(file);
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    
    if (!resume) {
      alert('Please upload your resume');
      return;
    }

    setApplying(true);
    
    try {
      const formData = new FormData();
      formData.append('resume', resume);
      if (coverLetter.trim()) {
        formData.append('coverLetter', coverLetter.trim());
      }

      const response = await fetch(`/api/jobs/${params.jobId}/apply`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        alert('Application submitted successfully! You will be notified about the next steps via email.');
        fetchJobDetails(); // Refresh to show application status
        setShowApplicationForm(false);
      } else {
        alert(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Application submission error:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 md:pt-28 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-20 sm:pt-24 md:pt-28 lg:pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Job Header */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {job.hostId.profilePicture ? (
                  <img src={job.hostId.profilePicture} alt={job.hostId.name} className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">{job.jobTitle}</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  <span className="flex items-center">
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="truncate">{job.hostId.organization}</span>
                  </span>
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${job.jobType === 'job' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {job.jobType === 'job' ? 'Full-time' : 'Internship'}
                  </span>
                  {job.location && (
                    <span className="flex items-center">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="truncate">{job.location}</span>
                    </span>
                  )}
                </div>
                
                {/* Application Progress */}
                <div className="mb-3 sm:mb-4">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
                    <span>Applications ({job.applicationProgress.current}/{job.applicationProgress.target})</span>
                    <span>{job.applicationProgress.percentage}% filled</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="bg-blue-600 h-1.5 sm:h-2 rounded-full"
                      style={{ width: `${Math.min(job.applicationProgress.percentage, 100)}%` }}
                    ></div>
                  </div>
                  {job.applicationProgress.slotsRemaining > 0 && (
                    <p className="text-xs sm:text-sm text-green-600 mt-1">
                      {job.applicationProgress.slotsRemaining} slots remaining
                    </p>
                  )}
                </div>
              </div>
              
              {/* Application Status or Apply Button */}
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                {userApplication ? (
                  <div className="text-center">
                    <div className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${
                      userApplication.status === 'applied' ? 'bg-yellow-100 text-yellow-700' :
                      userApplication.status === 'ai_selected' ? 'bg-blue-100 text-blue-700' :
                      userApplication.status === 'hr_selected' ? 'bg-green-100 text-green-700' :
                      userApplication.status === 'ai_rejected' ? 'bg-red-100 text-red-700' :
                      userApplication.status === 'hr_rejected' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {userApplication.status === 'applied' && 'Application Under Review'}
                      {userApplication.status === 'ai_selected' && 'AI Recommended - HR Review'}
                      {userApplication.status === 'ai_rejected' && 'Not Shortlisted'}
                      {userApplication.status === 'hr_selected' && 'Selected - Offer Sent'}
                      {userApplication.status === 'hr_rejected' && 'Not Selected'}
                      {userApplication.status === 'offer_sent' && 'Offer Sent'}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Applied on {new Date(userApplication.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (job.status === 'closed' || job.status === 'completed' || job.applicationProgress.isFull) ? (
                  <div className="text-center">
                    <button disabled className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed text-sm sm:text-base font-medium">
                      Applications Closed
                    </button>
                    <p className="text-xs text-gray-600 mt-1">
                      {job.status === 'closed' ? 'Target applications reached' : 'Position filled'}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowApplicationForm(true)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base font-medium"
                  >
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Job Description */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Job Description</h2>
                <div className="prose prose-sm max-w-none text-gray-600 text-sm sm:text-base">
                  <p className="whitespace-pre-line">{job.jobDescription}</p>
                </div>
              </div>

              {/* Responsibilities */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Responsibilities</h2>
                <div className="prose prose-sm max-w-none text-gray-600 text-sm sm:text-base">
                  <p className="whitespace-pre-line">{job.jobResponsibilities}</p>
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Requirements</h2>
                <div className="prose prose-sm max-w-none text-gray-600 text-sm sm:text-base">
                  <p className="whitespace-pre-line">{job.jobRequirements}</p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Company Info */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">About Company</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm sm:text-base font-medium text-gray-900">{job.hostId.organization}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{job.hostId.designation}</p>
                  </div>
                  {job.hostId.isVerified && (
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Verified Company
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Process */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Selection Process</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-2 sm:mr-3 flex-shrink-0">1</div>
                    <span>AI Resume Analysis</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-2 sm:mr-3 flex-shrink-0">2</div>
                    <span>AI Ranking by Score</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-2 sm:mr-3 flex-shrink-0">3</div>
                    <span>HR Review & Selection ({job.positionsAvailable} positions)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg sm:rounded-xl max-w-lg w-full p-5 sm:p-7 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Apply for Position</h2>
              <p className="text-base sm:text-lg font-semibold text-blue-600">{job.jobTitle}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{job.hostId.organization}</p>
            </div>
            
            <form onSubmit={handleSubmitApplication} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Resume * (PDF or Word)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                {resume && (
                  <p className="text-xs sm:text-sm text-green-600 mt-1 truncate">✓ {resume.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Cover Letter (Optional)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us why you're interested in this position..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setShowApplicationForm(false)}
                  className="w-full sm:flex-1 px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="w-full sm:flex-1 px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
