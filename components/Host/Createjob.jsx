// components/host/Createjob.jsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Briefcase, Users, Clock, Target, FileText } from 'lucide-react';

export default function CreateJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    jobResponsibilities: '',
    jobRequirements: '',
    jobType: 'job',
    maxCandidatesShortlist: 10,
    finalSelectionCount: 3,
    targetApplications: 50,
    voiceInterviewDuration: 15
  });
  const [jobImage, setJobImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, jobImage: 'Image size must be less than 5MB' }));
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, jobImage: 'Only image files are allowed' }));
        return;
      }
      
      setJobImage(file);
      setErrors(prev => ({ ...prev, jobImage: '' }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
    if (!formData.jobDescription.trim()) newErrors.jobDescription = 'Job description is required';
    if (!formData.jobResponsibilities.trim()) newErrors.jobResponsibilities = 'Job responsibilities are required';
    if (!formData.jobRequirements.trim()) newErrors.jobRequirements = 'Job requirements are required';
    
    if (formData.maxCandidatesShortlist < 1 || formData.maxCandidatesShortlist > 100) {
      newErrors.maxCandidatesShortlist = 'Must be between 1 and 100';
    }
    
    if (formData.finalSelectionCount >= formData.maxCandidatesShortlist) {
      newErrors.finalSelectionCount = 'Must be less than shortlist count';
    }
    
    if (formData.targetApplications < formData.maxCandidatesShortlist) {
      newErrors.targetApplications = 'Must be at least equal to shortlist count';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
      // Add image if selected
      if (jobImage) {
        submitData.append('jobImage', jobImage);
      }
      
      const response = await fetch('/api/host/jobs/create', {
        method: 'POST',
        credentials: 'include',
        body: submitData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job');
      }
      
      // Redirect to question generation page
      router.push(`/host/jobs/${data.job.id}/questions`);
      
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Job</h1>
            <p className="text-gray-600">Fill out the details below to create a new job posting with AI-powered interviews.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Image (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                {imagePreview ? (
                  <div className="text-center">
                    <img src={imagePreview} alt="Job preview" className="mx-auto h-32 w-32 object-cover rounded-lg mb-4" />
                    <button
                      type="button"
                      onClick={() => {
                        setJobImage(null);
                        setImagePreview(null);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <label htmlFor="jobImage" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">Upload job image</span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </label>
                    <input
                      id="jobImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 5MB</p>
                  </div>
                )}
              </div>
              {errors.jobImage && <p className="mt-1 text-sm text-red-600">{errors.jobImage}</p>}
            </div>

            {/* Job Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Senior Software Engineer"
                />
                {errors.jobTitle && <p className="mt-1 text-sm text-red-600">{errors.jobTitle}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Type *
                </label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="job">Full-time Job</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the role, company, and what makes this position exciting..."
              />
              {errors.jobDescription && <p className="mt-1 text-sm text-red-600">{errors.jobDescription}</p>}
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
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="List the key responsibilities and day-to-day tasks..."
              />
              {errors.jobResponsibilities && <p className="mt-1 text-sm text-red-600">{errors.jobResponsibilities}</p>}
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
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="List required skills, experience, education, and qualifications..."
              />
              {errors.jobRequirements && <p className="mt-1 text-sm text-red-600">{errors.jobRequirements}</p>}
            </div>

            {/* Selection Criteria */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Selection Criteria
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Applications *
                  </label>
                  <input
                    type="number"
                    name="targetApplications"
                    value={formData.targetApplications}
                    onChange={handleInputChange}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.targetApplications && <p className="mt-1 text-sm text-red-600">{errors.targetApplications}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shortlist Count *
                  </label>
                  <input
                    type="number"
                    name="maxCandidatesShortlist"
                    value={formData.maxCandidatesShortlist}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.maxCandidatesShortlist && <p className="mt-1 text-sm text-red-600">{errors.maxCandidatesShortlist}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Final Selection *
                  </label>
                  <input
                    type="number"
                    name="finalSelectionCount"
                    value={formData.finalSelectionCount}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.finalSelectionCount && <p className="mt-1 text-sm text-red-600">{errors.finalSelectionCount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Duration (min) *
                  </label>
                  <input
                    type="number"
                    name="voiceInterviewDuration"
                    value={formData.voiceInterviewDuration}
                    onChange={handleInputChange}
                    min="5"
                    max="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {errors.submit}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="h-4 w-4" />
                    <span>Create Job & Generate Questions</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}