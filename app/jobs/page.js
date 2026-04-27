"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, MapPin, Clock, Users, Briefcase, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JobCard from '@/components/JobCard';

export default function JobsListingPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, [currentPage, jobTypeFilter, searchTerm]);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12'
      });
      
      if (jobTypeFilter) params.append('jobType', jobTypeFilter);
      if (searchTerm) params.append('search', searchTerm);

      console.log('Fetching jobs with params:', params.toString());

      const response = await fetch(`/api/jobs/list?${params}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('Jobs API response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      if (data.success) {
        setJobs(data.jobs || []);
        setPagination(data.pagination || {});
        
        if (data.jobs?.length === 0 && currentPage === 1) {
          setError('No jobs available at the moment. Please check back later.');
        }
      } else {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setError(error.message || 'Failed to fetch jobs. Please try again.');
      setJobs([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchJobs();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Dream Job</h1>
            <p className="text-gray-600 mb-6">Discover amazing opportunities with AI-powered matching</p>
            
            {/* Search and Filter */}
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search jobs, companies, keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="job">Full-time Jobs</option>
                <option value="internship">Internships</option>
              </select>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
                <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Jobs</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchJobs}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Jobs Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || jobTypeFilter 
                    ? "Try adjusting your search criteria or filters." 
                    : "No jobs are currently available. Please check back later."}
                </p>
                {(searchTerm || jobTypeFilter) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setJobTypeFilter('');
                      setCurrentPage(1);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex space-x-2">
                    {pagination.hasPrev && (
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Previous
                      </button>
                    )}
                    <span className="px-4 py-2 text-gray-600">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    {pagination.hasNext && (
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

