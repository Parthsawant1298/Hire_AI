// app/host/jobs/[jobId]/edit/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Navbar from '@/components/Host/Navbar';
import Footer from '@/components/Footer';

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    jobResponsibilities: '',
    jobRequirements: '',
    jobType: 'job',
    maxCandidatesShortlist: '',
    finalSelectionCount: '',
    targetApplications: '',
    voiceInterviewDuration: '',
    applicationDeadline: ''
  });

  useEffect(() => {
    if (params.jobId) {
      fetchJobDetails();
    }
  }, [params.jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}/edit`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }

      const data = await response.json();
      if (data.success) {
        setJob(data.job);
        setFormData({
          jobTitle: data.job.jobTitle || '',
          jobDescription: data.job.jobDescription || '',
          jobResponsibilities: data.job.jobResponsibilities || '',
          jobRequirements: data.job.jobRequirements || '',
          jobType: data.job.jobType || 'job',
          maxCandidatesShortlist: data.job.maxCandidatesShortlist || '',
          finalSelectionCount: data.job.finalSelectionCount || '',
          targetApplications: data.job.targetApplications || '',
          voiceInterviewDuration: data.job.voiceInterviewDuration || '',
          applicationDeadline: data.job.applicationDeadline ? 
            new Date(data.job.applicationDeadline).toISOString().split('T')[0] : ''
        });
      } else {
        throw new Error(data.error || 'Failed to fetch job details');
      }
    } catch (error) {
      console.error('Fetch job error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Create form data for file upload support
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add job image if selected
      const jobImageInput = document.getElementById('jobImage');
      if (jobImageInput.files[0]) {
        submitData.append('jobImage', jobImageInput.files[0]);
      }

      const response = await fetch(`/api/host/jobs/${params.jobId}/edit`, {
        method: 'PUT',
        credentials: 'include',
        body: submitData
      });

      const data = await response.json();

      if (data.success) {
        router.push('/host/jobs');
      } else {
        setError(data.error || 'Failed to update job');
      }
    } catch (error) {
      console.error('Update job error:', error);
      setError('Failed to update job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          <p className="ml-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => router.push('/host/jobs')}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Back to Jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/host/jobs')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Jobs
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Job</h1>
              <p className="text-gray-600">{job?.jobTitle}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              {/* Job Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Type *
                </label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="job">Full-time Job</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              {/* Application Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Deadline
                </label>
                <input
                  type="date"
                  name="applicationDeadline"
                  value={formData.applicationDeadline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Job Image */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Image
                </label>
                <input
                  type="file"
                  id="jobImage"
                  accept="image/*"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {job?.jobImage && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-2">Current image:</p>
                    <img src={job.jobImage} alt="Current job image" className="w-32 h-20 object-cover rounded" />
                  </div>
                )}
              </div>

              {/* Target Applications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Applications *
                </label>
                <input
                  type="number"
                  name="targetApplications"
                  value={formData.targetApplications}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 100"
                />
              </div>

              {/* Max Candidates for Shortlist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Candidates for Shortlist *
                </label>
                <input
                  type="number"
                  name="maxCandidatesShortlist"
                  value={formData.maxCandidatesShortlist}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 10"
                />
              </div>

              {/* Final Selection Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Selection Count *
                </label>
                <input
                  type="number"
                  name="finalSelectionCount"
                  value={formData.finalSelectionCount}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 3"
                />
              </div>

              {/* Voice Interview Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Interview Duration (minutes) *
                </label>
                <input
                  type="number"
                  name="voiceInterviewDuration"
                  value={formData.voiceInterviewDuration}
                  onChange={handleInputChange}
                  required
                  min="5"
                  max="60"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            {/* Text Areas */}
            <div className="mt-6 space-y-6">
              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description *
                </label>
                <textarea
                  name="jobDescription"
                  value={formData.jobDescription}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the role, company, and what makes this opportunity exciting..."
                />
              </div>

              {/* Job Responsibilities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Responsibilities *
                </label>
                <textarea
                  name="jobResponsibilities"
                  value={formData.jobResponsibilities}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="List the key responsibilities and day-to-day tasks..."
                />
              </div>

              {/* Job Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Requirements *
                </label>
                <textarea
                  name="jobRequirements"
                  value={formData.jobRequirements}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="List the required skills, experience, and qualifications..."
                />
              </div>
            </div>

            {/* Constraints Info */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Constraints:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Final selection count must be ≤ Max candidates for shortlist</li>
                <li>• Max candidates for shortlist must be ≤ Target applications</li>
                <li>• Voice interview duration: 5-60 minutes</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push('/host/jobs')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {saving ? 'Updating...' : 'Update Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}