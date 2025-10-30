// 📄 6. HOST JOBS MANAGEMENT PAGE
// File: app/host/jobs/page.js
// =================
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Users, BarChart3, Calendar } from 'lucide-react';
import Navbar from '@/components/Host/Navbar';
import Footer from '@/components/Footer';
import JobCard from '@/components/JobCard';

export default function HostJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/host/jobs/list?${params}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
              <p className="text-gray-600">Manage your job postings and track applications</p>
            </div>
            <button
              onClick={() => router.push('/host/create-job')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Job</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Active Jobs</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="applications_open">Applications Open</option>
                <option value="interviews_active">Interviews Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All Jobs (including cancelled)</option>
              </select>
            </div>
          </div>

          {/* Jobs Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard 
                  key={job._id} 
                  job={job} 
                  isHost={true}
                  onEdit={(job) => router.push(`/host/jobs/${job._id}/edit`)}
                  onDelete={async (job) => {
                    const message = job.currentApplications > 0 
                      ? `This job has ${job.currentApplications} applications. Are you sure you want to cancel it? (This action cannot be undone)`
                      : 'Are you sure you want to delete this job? (This action cannot be undone)';
                    
                    if (window.confirm(message)) {
                      try {
                        const response = await fetch(`/api/host/jobs/${job._id}/delete`, {
                          method: 'DELETE',
                          credentials: 'include'
                        });
                        
                        const result = await response.json();
                        
                        if (response.ok) {
                          if (result.action === 'cancelled') {
                            alert('Job has been cancelled successfully. Candidates have been notified.');
                          } else {
                            alert('Job has been deleted successfully.');
                          }
                          fetchJobs(); // Refresh the list
                        } else {
                          alert(result.error || 'Failed to delete job');
                        }
                      } catch (error) {
                        alert('Failed to delete job');
                        console.error('Delete error:', error);
                      }
                    }
                  }}
                  onViewCandidates={(job) => router.push(`/host/jobs/${job._id}/candidates`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
