// app/host/candidates/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Host/Navbar';
import Footer from '@/components/Footer';

export default function AllCandidatesPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobsWithCandidates();
  }, []);

  const fetchJobsWithCandidates = async () => {
    try {
      const response = await fetch('/api/host/jobs/list', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Filter jobs that have candidates
        const jobsWithCandidates = data.jobs.filter(job => 
          job.shortlistedCandidates?.length > 0 || job.currentApplications > 0
        );
        setJobs(jobsWithCandidates);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Candidates</h1>
            <p className="text-gray-600">View candidates across all your job postings</p>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates yet</h3>
              <p className="text-gray-600 mb-6">You don't have any candidates in your job postings.</p>
              <button
                onClick={() => router.push('/host/create-job')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Your First Job
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {jobs.map((job) => (
                <div key={job._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{job.jobTitle}</h3>
                      <p className="text-gray-600 text-sm">
                        {job.currentApplications} applications • {job.shortlistedCandidates?.length || 0} shortlisted
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/host/jobs/${job._id}/candidates`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      View Candidates
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{job.currentApplications}</div>
                      <div className="text-xs text-gray-600">Total Applications</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{job.shortlistedCandidates?.length || 0}</div>
                      <div className="text-xs text-gray-600">Shortlisted</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{job.completedInterviews || 0}</div>
                      <div className="text-xs text-gray-600">Interviews Done</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{job.finalSelectedCandidates?.length || 0}</div>
                      <div className="text-xs text-gray-600">Selected</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}