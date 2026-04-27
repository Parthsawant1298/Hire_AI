"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Edit, Trash2, RefreshCw, Check, Clock } from 'lucide-react';
import Navbar from '@/components/Host/Navbar';
import Footer from '@/components/Footer';

function JobQuestionsContent() {
  const router = useRouter();
  const params = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    type: 'general',
    difficulty: 'medium',
    expectedDuration: 120
  });

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}/questions/generate`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setQuestions(data.questions);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Generate questions error:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.question.trim()) return;
    
    setQuestions(prev => [...prev, { ...newQuestion, id: Date.now() }]);
    setNewQuestion({
      question: '',
      type: 'general',
      difficulty: 'medium',
      expectedDuration: 120
    });
  };

  const updateQuestion = (index, updatedQuestion) => {
    setQuestions(prev => prev.map((q, i) => i === index ? updatedQuestion : q));
    setEditingQuestion(null);
  };

  const deleteQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const saveQuestions = async () => {
    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}/questions/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questions })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      alert('Questions saved successfully!');
    } catch (error) {
      console.error('Save questions error:', error);
      alert('Failed to save questions. Please try again.');
    }
  };

  const finalizeJob = async () => {
    if (questions.length === 0) {
      alert('Please add at least one question before finalizing.');
      return;
    }

    setFinalizing(true);
    try {
      const response = await fetch(`/api/host/jobs/${params.jobId}/finalize`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Job published successfully! Interview link created.');
        router.push('/host/dashboard');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Finalize job error:', error);
      alert('Failed to finalize job. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Generating interview questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-8 md:pb-12 lg:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 lg:p-12">
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Interview Questions</h1>
            <p className="text-sm sm:text-base text-gray-600">Review and customize the AI-generated questions for your job interview.</p>
          </div>

          {/* Regenerate Button */}
          <div className="mb-6">
            <button
              onClick={generateQuestions}
              disabled={generating}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Regenerating...' : 'Regenerate Questions'}</span>
            </button>
          </div>

          {/* Questions List */}
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
            {questions.map((question, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 sm:p-6">
                {editingQuestion === index ? (
                  <div className="space-y-3 sm:space-y-4">
                    <textarea
                      value={question.question}
                      onChange={(e) => updateQuestion(index, { ...question, question: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(index, { ...question, type: e.target.value })}
                        className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                      >
                        <option value="technical">Technical</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="situational">Situational</option>
                        <option value="general">General</option>
                      </select>
                      <select
                        value={question.difficulty}
                        onChange={(e) => updateQuestion(index, { ...question, difficulty: e.target.value })}
                        className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <input
                        type="number"
                        value={question.expectedDuration}
                        onChange={(e) => updateQuestion(index, { ...question, expectedDuration: parseInt(e.target.value) })}
                        className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                        placeholder="Duration (seconds)"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => setEditingQuestion(null)}
                        className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg text-sm sm:text-base hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingQuestion(null)}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-400 text-white rounded-lg text-sm sm:text-base hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <h3 className="font-medium text-base sm:text-lg text-gray-900">Question {index + 1}</h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditingQuestion(index)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          aria-label="Edit question"
                        >
                          <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => deleteQuestion(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                          aria-label="Delete question"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed">{question.question}</p>
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                      <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {question.type}
                      </span>
                      <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full">
                        {question.difficulty}
                      </span>
                      <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {question.expectedDuration}s
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add New Question */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="font-medium text-base sm:text-lg text-gray-900 mb-3 sm:mb-4">Add Custom Question</h3>
            <div className="space-y-3 sm:space-y-4">
              <textarea
                value={newQuestion.question}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Enter your custom question..."
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="situational">Situational</option>
                  <option value="general">General</option>
                </select>
                <select
                  value={newQuestion.difficulty}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input
                  type="number"
                  value={newQuestion.expectedDuration}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, expectedDuration: parseInt(e.target.value) }))}
                  className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                  placeholder="Duration (seconds)"
                />
              </div>
              <button
                onClick={addQuestion}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-4">
            <button
              onClick={saveQuestions}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm sm:text-base"
            >
              Save Draft
            </button>
            <button
              onClick={finalizeJob}
              disabled={finalizing || questions.length === 0}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {finalizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span className="hidden sm:inline">Publish Job & Create Interview Link</span>
                  <span className="sm:hidden">Publish Job</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateJobPage() { 
  return (
    <main>
      <Navbar />
      <JobQuestionsContent />
      <Footer />
    </main>
  );
}