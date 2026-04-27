// components/host/Createjob.jsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Briefcase, Users, Clock, Target, FileText, Plus, Trash2, RefreshCw, Edit2, Check } from 'lucide-react';

export default function CreateJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Job Details, 2: Questions, 3: Review
  const [jobId, setJobId] = useState(null);
  
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    jobResponsibilities: '',
    jobRequirements: '',
    jobType: 'job',
    location: '',
    salary: '',
    targetApplications: 50,
    positionsAvailable: 3,
    firstRoundShortlist: 50,
    voiceInterviewDuration: 15
  });
  
  const [questions, setQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestion, setNewQuestion] = useState('');
  
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
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.salary.trim()) newErrors.salary = 'Salary is required';
    
    if (formData.targetApplications < 1) {
      newErrors.targetApplications = 'Must be at least 1';
    }
    
    if (formData.positionsAvailable < 1 || formData.positionsAvailable > formData.targetApplications) {
      newErrors.positionsAvailable = 'Must be between 1 and target applications';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 1: Create draft job
  const handleNext = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
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
      
      // Redirect to questions page for AI generation
      router.push(`/host/jobs/${data.job.id}/questions`);
      
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate questions
  const handleGenerateQuestions = async (id = jobId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/host/jobs/${id}/questions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionCount: 5 })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions');
      }
      
      setQuestions(data.questions || []);
    } catch (error) {
      setErrors({ questions: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Add manual question
  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    
    const newQ = {
      id: questions.length + 1,
      question: newQuestion.trim(),
      type: 'general',
      difficulty: 'medium',
      expectedDuration: 120
    };
    
    setQuestions([...questions, newQ]);
    setNewQuestion('');
  };

  // Delete question
  const handleDeleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  // Edit question
  const handleEditQuestion = (id, newText) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, question: newText } : q
    ));
    setEditingQuestion(null);
  };

  // Step 3: Publish job
  const handlePublish = async () => {
    setLoading(true);
    try {
      // Save questions first
      const saveResponse = await fetch(`/api/host/jobs/${jobId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questions })
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save questions');
      }
      
      // Publish job
      const publishResponse = await fetch(`/api/host/jobs/${jobId}/finalize`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await publishResponse.json();
      
      if (!publishResponse.ok) {
        throw new Error(data.error || 'Failed to publish job');
      }
      
      router.push('/host/dashboard');
      
    } catch (error) {
      setErrors({ publish: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-8 md:pb-12 lg:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 lg:p-12">
          {/* Progress Steps */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <div className="flex items-center justify-between mb-4 sm:mb-6 overflow-x-auto">
              <div className={`flex items-center flex-shrink-0 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>1</div>
                <span className="ml-2 sm:ml-3 font-medium text-sm sm:text-base hidden sm:inline">Job Details</span>
              </div>
              <div className="flex-1 h-1 mx-2 sm:mx-4 bg-gray-300 min-w-[40px]"><div className={`h-full transition-all duration-300 ${step >= 2 ? 'bg-blue-600' : ''}`} style={{width: step >= 2 ? '100%' : '0%'}}></div></div>
              <div className={`flex items-center flex-shrink-0 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>2</div>
                <span className="ml-2 sm:ml-3 font-medium text-sm sm:text-base hidden sm:inline">Questions</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {step === 1 ? 'Create New Job' : 'Interview Questions'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {step === 1 
                ? 'Fill out the job details to create a new posting' 
                : 'Review and customize AI-generated interview questions'}
            </p>
          </div>

          {errors.submit && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm sm:text-base">
              {errors.submit}
            </div>
          )}

          {/* STEP 1: Job Details Form */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-6 sm:space-y-8">
            {/* Job Image Upload */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Job Image (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 hover:border-blue-400 transition-colors">
                {imagePreview ? (
                  <div className="text-center">
                    <img src={imagePreview} alt="Job preview" className="mx-auto h-24 w-24 sm:h-32 sm:w-32 object-cover rounded-lg mb-3 sm:mb-4" />
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
                    <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                    <label htmlFor="jobImage" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base">Upload job image</span>
                      <span className="text-gray-500 text-sm sm:text-base"> or drag and drop</span>
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
              {errors.jobImage && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.jobImage}</p>}
            </div>

            {/* Job Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Senior Software Engineer"
                />
                {errors.jobTitle && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.jobTitle}</p>}
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Job Type *
                </label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="job">Full-time Job</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Remote, New York, San Francisco"
                />
                {errors.location && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.location}</p>}
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Salary *
                </label>
                <input
                  type="text"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., $80,000 - $120,000, Competitive, Not Disclosed"
                />
                {errors.salary && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.salary}</p>}
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Describe the role, company, and what makes this position exciting..."
              />
              {errors.jobDescription && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.jobDescription}</p>}
            </div>

            {/* Job Responsibilities */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Job Responsibilities *
              </label>
              <textarea
                name="jobResponsibilities"
                value={formData.jobResponsibilities}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="List the key responsibilities and day-to-day tasks..."
              />
              {errors.jobResponsibilities && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.jobResponsibilities}</p>}
            </div>

            {/* Job Requirements */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Job Requirements *
              </label>
              <textarea
                name="jobRequirements"
                value={formData.jobRequirements}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="List required skills, experience, education, and qualifications..."
              />
              {errors.jobRequirements && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.jobRequirements}</p>}
            </div>

            {/* Selection Criteria */}
            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                Selection Criteria
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Target Applications *
                  </label>
                  <input
                    type="number"
                    name="targetApplications"
                    value={formData.targetApplications}
                    onChange={handleInputChange}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Number of applications you want to receive before closing</p>
                  {errors.targetApplications && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.targetApplications}</p>}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Positions Available *
                  </label>
                  <input
                    type="number"
                    name="positionsAvailable"
                    value={formData.positionsAvailable}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Number of candidates you want to hire</p>
                  {errors.positionsAvailable && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.positionsAvailable}</p>}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    First Round Shortlist *
                  </label>
                  <input
                    type="number"
                    name="firstRoundShortlist"
                    value={formData.firstRoundShortlist}
                    onChange={handleInputChange}
                    min="1"
                    max="500"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">How many to shortlist after resume analysis (default: 50)</p>
                  {errors.firstRoundShortlist && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.firstRoundShortlist}</p>}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Voice Interview Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="voiceInterviewDuration"
                    value={formData.voiceInterviewDuration}
                    onChange={handleInputChange}
                    min="5"
                    max="60"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Length of AI voice interview (default: 15 minutes)</p>
                  {errors.voiceInterviewDuration && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.voiceInterviewDuration}</p>}
                </div>
              </div>
            </div>

            {/* Next Button */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Next: Setup Questions →</span>
                )}
              </button>
            </div>
          </form>
          )}

          {/* STEP 2: Questions Management */}
          {step === 2 && (
            <div className="space-y-4 md:space-y-6">
              {/* Regenerate Button */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Interview Questions ({questions.length})</h2>
                <button
                  onClick={() => handleGenerateQuestions()}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center space-x-2 text-sm md:text-base"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Regenerate Questions</span>
                </button>
              </div>

              {errors.questions && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {errors.questions}
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {questions.map((q, idx) => (
                  <div key={`question-${idx}-${q.id}`} className="p-3 md:p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className="text-xs md:text-sm font-semibold text-blue-600">Q{idx + 1}</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">{q.type || 'general'}</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">{q.difficulty || 'medium'}</span>
                        </div>
                        {editingQuestion === q.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              defaultValue={q.question}
                              onBlur={(e) => handleEditQuestion(q.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditQuestion(q.id, e.target.value);
                                if (e.key === 'Escape') setEditingQuestion(null);
                              }}
                              autoFocus
                              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                            />
                            <button
                              onClick={() => setEditingQuestion(null)}
                              className="px-3 py-2 text-gray-600 hover:text-gray-800"
                            >
                              <Check className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm md:text-base text-gray-800 break-words">{q.question}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 sm:ml-4">
                        <button
                          onClick={() => setEditingQuestion(q.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit question"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Question */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 md:p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Custom Question
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                    placeholder="Type your question here..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                  />
                  <button
                    onClick={handleAddQuestion}
                    disabled={!newQuestion.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center justify-center space-x-2 text-sm md:text-base whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Publish Button */}
              {errors.publish && (
                <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm md:text-base">
                  {errors.publish}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 md:px-6 py-2 md:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm md:text-base"
                >
                  ← Back to Details
                </button>
                <button
                  onClick={handlePublish}
                  disabled={loading || questions.length === 0}
                  className="px-4 md:px-6 py-2 md:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm md:text-base"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Create Job & Publish</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}