'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Camera, User, Mail, Phone, Building2, Calendar, ArrowLeft, LogOut, Upload, X, Check, Shield, Settings } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      setUser(data.user);
      if (data.user.profilePicture) {
        setImagePreview(data.user.profilePicture);
      }
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should not exceed 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }
      
      setError('');
      setSuccess('');
      setProfileImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!profileImage) {
      setError('Please select an image first');
      return;
    }
    
    setUploading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('profileImage', profileImage);
      
      const response = await fetch('/api/user/update-profile-picture', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      
      setUser(prev => ({
        ...prev,
        profilePicture: data.profilePicture
      }));
      
      setImagePreview(data.profilePicture);
      setProfileImage(null);
      setSuccess('Profile picture updated successfully!');
      
      setTimeout(() => setSuccess(''), 3000);
      
      const fileInput = document.getElementById('profile-upload');
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setProfileImage(null);
    setError('');
    setSuccess('');
    setImagePreview(user?.profilePicture || null);
    
    const fileInput = document.getElementById('profile-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Not authenticated</h1>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Hire AI</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.name?.split(' ')[0]}</span>
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <button 
            onClick={() => router.push('/main')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12">
            <div className="flex flex-col items-center">
              {/* Profile Picture */}
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full bg-white p-1 shadow-lg">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {imagePreview ? (
                      <img 
                        src={imagePreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                  {profileImage && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      New
                    </div>
                  )}
                </div>
                
                {/* Camera Button */}
                <label
                  htmlFor="profile-upload"
                  className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-5 h-5 text-gray-600" />
                </label>
                <input
                  type="file"
                  id="profile-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">{user.name}</h1>
              <p className="text-blue-100">{user.email}</p>
            </div>
          </div>

          {/* Upload Controls */}
          {profileImage && (
            <div className="px-8 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800">Ready to update your profile picture?</p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancelUpload}
                    disabled={uploading}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Save Photo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {error && (
            <div className="px-8 py-4 bg-red-50 border-b border-red-100">
              <div className="flex items-center space-x-2 text-red-800">
                <X className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="px-8 py-4 bg-green-50 border-b border-green-100">
              <div className="flex items-center space-x-2 text-green-800">
                <Check className="w-5 h-5" />
                <span className="text-sm">{success}</span>
              </div>
            </div>
          )}

          {/* Profile Information */}
          <div className="px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
              
              {/* Verification Status & Quick Actions */}
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  user.verificationSetupCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <Shield className="w-4 h-4" />
                  <span>{user.verificationSetupCompleted ? 'Verified' : 'Setup Required'}</span>
                </div>
                
                <button
                  onClick={() => router.push('/verification/setup')}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Settings className="w-4 h-4" />
                  <span>Verification</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                  <User className="w-4 h-4" />
                  <span>Full Name</span>
                </div>
                <p className="text-gray-900 font-medium">{user.name}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                  <Mail className="w-4 h-4" />
                  <span>Email Address</span>
                </div>
                <p className="text-gray-900 font-medium">{user.email}</p>
              </div>

              {user.phone && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Phone className="w-4 h-4" />
                    <span>Phone Number</span>
                  </div>
                  <p className="text-gray-900 font-medium">{user.phone}</p>
                </div>
              )}

              {user.branch && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Building2 className="w-4 h-4" />
                    <span>Department</span>
                  </div>
                  <p className="text-gray-900 font-medium">{user.branch}</p>
                </div>
              )}

              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Member Since</span>
                </div>
                <p className="text-gray-900 font-medium">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Verification Setup Section */}
            {!user.verificationSetupCompleted && (
              <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <Shield className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Setup Identity Verification</h3>
                    <p className="text-gray-600 mb-4">
                      Complete your verification profile to access secure interviews. This helps ensure authenticity and prevents fraud.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => router.push('/verification/setup')}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium"
                      >
                        Setup Verification
                      </button>
                      <button
                        onClick={() => router.push('/verification/test')}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                      >
                        Test Verification
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Complete Section */}
            {user.verificationSetupCompleted && (
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Verification Active</h3>
                    <p className="text-gray-600 mb-3">
                      Your identity verification is set up and ready for secure interviews.
                    </p>
                    <button
                      onClick={() => router.push('/verification/test')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm"
                    >
                      Test Verification
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload Guidelines */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Photo Guidelines:</strong> Upload JPG, PNG, WebP, or GIF files up to 5MB. Square images work best for profile pictures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}