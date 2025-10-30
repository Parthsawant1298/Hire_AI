// File: app/interview/[jobId]/page.js
// =================
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import Vapi from '@vapi-ai/web';

export default function VoiceInterviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [job, setJob] = useState(null);
  const [user, setUser] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [vapiClient, setVapiClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isVapiReady, setIsVapiReady] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [callId, setCallId] = useState(null);
  const [verificationPassed, setVerificationPassed] = useState(false);
  const [transcriptMessages, setTranscriptMessages] = useState([]);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const vapiInitialized = useRef(false);
  const messagesRef = useRef([]); // Use ref to avoid closure issues in event handlers
  // Get assistant ID from URL params or job data
  const urlAssistantId = searchParams.get('assistant');
  const [finalAssistantId, setFinalAssistantId] = useState(null);

  useEffect(() => {
    checkVerificationStatus();
    initializeData();
  }, []);

  useEffect(() => {
    let interval;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const checkVerificationStatus = async () => {
    try {
      // Check if verification was already passed in this session
      const sessionVerification = sessionStorage.getItem('verificationPassed');
      if (sessionVerification === 'true') {
        console.log('✅ Verification already passed in this session');
        setVerificationPassed(true);
        setCheckingVerification(false);
        return;
      }

      console.log('🔍 Checking user verification status...');

      // Check user's verification setup status
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('❌ Not authenticated, redirecting to login');
        router.push('/login');
        return;
      }
      
      const data = await response.json();
      if (data.success && data.user) {
        console.log('👤 User data:', {
          hasVerificationFaceImage: !!data.user.verificationFaceImage,
          hasVerificationVoiceAudio: !!data.user.verificationVoiceAudio,
          verificationSetupCompleted: data.user.verificationSetupCompleted
        });

        // Check if user has completed verification setup (has biometric data)
        if (!data.user.verificationSetupCompleted || !data.user.verificationFaceImage || !data.user.verificationVoiceAudio) {
          // User hasn't completed profile setup with biometric data
          const missing = [
            !data.user.verificationFaceImage && 'Face Data',
            !data.user.verificationVoiceAudio && 'Voice Data'
          ].filter(Boolean).join(', ');
          
          console.error(`❌ Biometric setup incomplete. Missing: ${missing}`);
          setError(`Biometric setup incomplete. Missing: ${missing}. Please complete your profile setup first.`);
          setCheckingVerification(false);
          return;
        }
        
        // User has baseline data but hasn't verified yet in this session
        // They must pass verification test before interview
        console.log('⚠️ User has baseline but needs to verify before interview');
        setVerificationPassed(false);
      }
    } catch (error) {
      console.error('❌ Verification check error:', error);
      setError('Failed to check verification status');
    } finally {
      setCheckingVerification(false);
    }
  };

  const initializeData = async () => {
    try {
      await Promise.all([
        fetchJobDetails(),
        fetchUserData(),
        checkMicrophonePermission(),
        initializeVAPI()
      ]);
    } catch (error) {
      console.error('Initialization error:', error);
      setError('Failed to initialize interview system');
      setLoading(false);
    }
  };

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.jobId}/details?interview=true`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          const message = errorData.error || 'You are not authorized to access this interview';
          setError(`Access Denied: ${message}. Please check if you have applied and been shortlisted for this position.`);
          throw new Error(message);
        } else if (response.status === 404) {
          setError('Job not found. This interview session may have expired or been removed.');
          throw new Error('Job not found');
        } else {
          setError(`Failed to load interview details (Error ${response.status}). Please try again.`);
          throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to fetch job details'}`);
        }
      }
      
      const data = await response.json();
      if (data.success) {
        setJob(data.job);
        console.log('Job details loaded successfully:', data.job.jobTitle);
      } else {
        throw new Error(data.error || 'Job not found');
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      if (!error.message.includes('Access Denied') && !error.message.includes('Job not found')) {
        setError('Failed to load interview details. Please check your internet connection and try again.');
      }
      throw error;
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        router.push('/login');
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        // Debug: Log complete user data structure
        console.log('👤 User Data Fetched:', {
          userId: data.user._id,
          name: data.user.name,
          verificationSetupCompleted: data.user.verificationSetupCompleted,
          hasVerificationFaceImage: !!data.user.verificationFaceImage,
          verificationFaceImageLength: data.user.verificationFaceImage?.length,
          hasVerificationVoiceAudio: !!data.user.verificationVoiceAudio,
          verificationVoiceAudioLength: data.user.verificationVoiceAudio?.length,
          allUserKeys: Object.keys(data.user)
        });
        
        setUser(data.user);
        
        // Check for previous interview attempts
        await checkPreviousInterview(data.user._id);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      router.push('/login');
    }
  };

  const [previousInterview, setPreviousInterview] = useState(null);
  const [isReinterview, setIsReinterview] = useState(false);

  const checkPreviousInterview = async (userId) => {
    try {
      const response = await fetch(`/api/jobs/${params.jobId}/application-status?userId=${userId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.application) {
          const app = data.application;
          
          if (app.voiceInterviewCompleted) {
            setIsReinterview(true);
            setPreviousInterview({
              attemptNumber: app.interviewAttempts || 1,
              score: app.voiceInterviewScore,
              finalScore: app.finalScore,
              completedAt: app.interviewCompletedAt,
              totalAttempts: (app.interviewHistory?.length || 0) + 1
            });
            
            console.log(`🔄 Previous interview found - Attempt ${app.interviewAttempts || 1}, Score: ${app.voiceInterviewScore}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check previous interview:', error);
    }
  };

  const checkMicrophonePermission = async () => {
    try {
      console.log('Requesting microphone permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      console.log('Microphone permission granted');
      setPermissionGranted(true);
      
      // Test audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      console.log('Audio context created successfully');
      
      // Stop the stream and audio context after testing
      stream.getTracks().forEach(track => track.stop());
      await audioContext.close();
      
    } catch (error) {
      console.error('Microphone permission error:', error);
      setPermissionGranted(false);
      setError(`Microphone access failed: ${error.message}. Please allow microphone access and refresh.`);
    }
  };

  const initializeVAPI = async () => {
    if (vapiInitialized.current) return;
    
    try {
      setLoading(true);
      
      // Get VAPI public key
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      
      if (!publicKey) {
        throw new Error('VAPI public key not configured');
      }

      console.log('Initializing VAPI client...');
      
      // Initialize VAPI client directly
      const client = new Vapi(publicKey);
      setVapiClient(client);
      setIsVapiReady(true);
      vapiInitialized.current = true;
      
      // Setup event listeners
      setupVAPIEventListeners(client);
      
      console.log('VAPI client initialized successfully');
      setLoading(false);
      
    } catch (error) {
      console.error('Failed to initialize VAPI:', error);
      setError(`Failed to initialize interview system: ${error.message}`);
      setLoading(false);
    }
  };

  const setupVAPIEventListeners = (client) => {
    try {
      console.log('Setting up VAPI event listeners...');

      // Call started
      client.on('call-start', () => {
        console.log('✅ Interview call started');
        setIsCallActive(true);
        setLoading(false);
        setError(null);
      });

      // User speaking events (for console visibility)
      client.on('speech-start', () => {
        console.log('🎤 User started speaking');
      });

      client.on('speech-end', () => {
        console.log('🎤 User stopped speaking');
      });

      // Live transcript updates (visible in console during interview)
      client.on('message', (message) => {
        console.log('📝 Live transcript update:', message);
        
        // Store ALL messages in both state and ref
        // Use ref to avoid closure issues in call-end handler
        if (message) {
          messagesRef.current = [...messagesRef.current, message];
          setTranscriptMessages(prev => [...prev, message]);
        }
      });

      // ONLY event that matters - Manual End Call by User
      client.on('call-end', async () => {
        console.log('🎯 User manually ended interview call');
        
        setIsCallActive(false);
        setIsCallEnded(true);
        
        // Process transcript locally since webhook won't work on localhost
        try {
          // Use ref to get current messages (avoids closure issue)
          const collectedMessages = messagesRef.current;
          
          console.log('📝 Processing interview transcript...');
          console.log('📊 Total messages collected:', collectedMessages.length);
          
          if (collectedMessages.length > 0) {
            console.log('✅ Sending transcript to local processing endpoint...');
            console.log('📋 First few messages:', collectedMessages.slice(0, 3));
            
            const response = await fetch('/api/interview/process-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                jobId: params.jobId,
                messages: collectedMessages,
                duration: callDuration
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log('✅ Interview processed successfully:', result);
              console.log('🎯 Score:', result.score);
            } else {
              const errorData = await response.json();
              console.error('❌ Failed to process interview:', response.status, errorData);
            }
          } else {
            console.error('❌ No transcript messages collected during interview');
            console.error('❌ This should not happen - check message event listener');
          }
        } catch (error) {
          console.error('❌ Error processing transcript:', error);
          console.error('❌ Error stack:', error.stack);
        }
        
        // Redirect to completion page
        setTimeout(() => {
          router.push(`/interview/${params.jobId}/completed`);
        }, 3000);
      });

      // Error handling (real errors only)
      client.on('error', (error) => {
        console.error('❌ VAPI Error:', error);
        
        // Ignore benign errors that happen after call has ended
        const errorMsg = error?.errorMsg || error?.message || '';
        if (errorMsg.includes('Meeting has ended') || 
            errorMsg.includes('ended due to ejection')) {
          console.log('ℹ️ Ignoring post-call error:', errorMsg);
          return; // Don't show error to user, call already ended successfully
        }
        
        // Only show errors that matter
        setError(`Interview error: ${errorMsg || 'Unknown error'}`);
        setIsCallActive(false);
        setLoading(false);
      });

      console.log('✅ VAPI event listeners setup complete');
      
    } catch (error) {
      console.error('❌ Event listener setup error:', error);
      setError('Failed to setup interview system');
      setLoading(false);
    }
  };

  const startInterview = async () => {
    if (!vapiClient) {
      setError('Interview system not ready. Please refresh and try again.');
      return;
    }

    if (!permissionGranted) {
      setError('Microphone permission is required to start the interview.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTranscriptMessages([]); // Clear previous transcript
      messagesRef.current = []; // Also clear ref
      
      console.log('Starting interview process...');
      
      // Start session tracking
      await fetch('/api/interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobId: params.jobId,
          assistantId: finalAssistantId || urlAssistantId || 'creating',
          action: 'start'
        })
      });
      
      // Start the call with the assistant and proper configuration
      console.log('Interview session started, preparing VAPI call...');

      try {
        // Determine which assistant to use
        let assistantToUse = finalAssistantId || urlAssistantId || job?.vapiAssistantId;
        
        console.log('🔍 Debug - Assistant selection:', {
          finalAssistantId,
          urlAssistantId,
          jobVapiAssistantId: job?.vapiAssistantId,
          assistantToUse
        });
        
        // Create a fresh interview assistant with questions from database
        console.log('🏗️ Creating fresh interview assistant for job:', params.jobId);
        
        const assistantResponse = await fetch('/api/interview/create-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: params.jobId })
        });
        
        console.log('📡 Assistant creation response status:', assistantResponse.status);
        const assistantResult = await assistantResponse.json();
        console.log('📄 Assistant creation result:', assistantResult);
        
        if (assistantResult.success) {
          assistantToUse = assistantResult.assistantId;
          setFinalAssistantId(assistantToUse);
          console.log('✅ Interview assistant created:', assistantToUse);
          console.log('📝 Questions loaded:', assistantResult.questionsCount);
        } else {
          throw new Error(`Failed to create assistant: ${assistantResult.error}`);
        }
        
        // Pre-flight checks
        console.log('🔍 Pre-flight checks...');
        console.log('🔧 VAPI client ready:', !!vapiClient);
        console.log('🔑 Public key available:', !!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
        console.log('🎯 Assistant ID:', assistantToUse);
        
        if (!vapiClient) {
          throw new Error('VAPI client not initialized');
        }
        
        if (!assistantToUse) {
          throw new Error('No assistant ID available');
        }
        
        const callConfig = {
          metadata: {
            jobId: params.jobId,
            userId: user?._id,
            userName: user?.name || 'Candidate',
            jobTitle: job?.jobTitle || 'Position',
            platform: 'hireai'
          },
          maxDurationSeconds: (job?.voiceInterviewDuration || 15) * 60 + 120
        };
        
        console.log('🎯 Call configuration:', callConfig);
        console.log('🚀 Starting VAPI call with assistant:', assistantToUse);
        
        // Start the VAPI call with the created assistant
        const startPromise = vapiClient.start(assistantToUse, callConfig);
        console.log('📡 VAPI start method called, waiting for response...');
        
        await startPromise;
        
        console.log('✅ VAPI interview started successfully');
        
      } catch (error) {
        console.error('❌ Interview start failed:', error);
        console.error('❌ Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
          cause: error?.cause
        });
        throw error;
      }
      
      console.log('VAPI call started successfully');
      
    } catch (error) {
      console.error('Failed to start interview:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: error.status,
        statusCode: error.statusCode
      });
      
      let errorMsg = 'Failed to start interview';
      
      // Handle specific VAPI errors
      if (error.message && error.message.includes('403')) {
        errorMsg = '❌ VAPI Key Permission Error: Your public key does not have web call permissions. Please check your VAPI dashboard settings.';
      } else if (error.message && error.message.includes('404')) {
        errorMsg = '❌ Interview assistant not found. The assistant ID may belong to a different VAPI organization. Please create a new interview assistant.';
      } else if (error.message && error.message.includes('network')) {
        errorMsg = 'Network connection failed. Please check your internet and try again.';
      } else if (error.message) {
        errorMsg += `: ${error.message}`;
      } else if (typeof error === 'string') {
        errorMsg += `: ${error}`;
      }
      
      setError(`${errorMsg}. Please check your microphone and try again.`);
      setLoading(false);
      
      // Also try to reinitialize VAPI client as a fallback
      setTimeout(() => {
        console.log('Attempting to reinitialize VAPI client...');
        initializeVAPI();
      }, 2000);
    }
  };

  const endInterview = async () => {
    if (vapiClient) {
      try {
        setLoading(true);
        await vapiClient.stop();
      } catch (error) {
        console.error('Error ending interview:', error);
        setError('Error ending interview');
        setLoading(false);
      }
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      setError(null);
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setError('Microphone access is required for the interview. Please allow microphone access and refresh the page.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview system...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we prepare your interview</p>
        </div>
      </div>
    );
  }

  // Checking verification status
  if (checkingVerification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking verification status...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we verify your identity</p>
        </div>
      </div>
    );
  }

  // Verification required
  if (!verificationPassed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Identity Verification Required</h2>
          <p className="text-gray-600 mb-6">
            Before starting the interview, we need to verify your identity using the biometric data from your profile.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-blue-900 mb-2">Verification includes:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Face verification against your profile photo</li>
              <li>• Voice verification for authenticity</li>
              <li>• Real-time identity confirmation</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                // Store the current interview URL to return after verification
                sessionStorage.setItem('returnToInterview', window.location.href);
                router.push('/verification/test');
              }}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center"
            >
              <Shield className="h-5 w-5 mr-2" />
              Start Verification
            </button>
            
            <button
              onClick={() => router.push('/profile')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Complete Profile Setup
            </button>
            
            <button
              onClick={() => router.push('/jobs')}
              className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Back to Jobs
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Your verification data is encrypted and securely stored. It will only be used for interview authentication.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {error?.includes('Access Denied') ? 'Interview Access Restricted' : 'Interview System Error'}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          {error?.includes('Access Denied') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-blue-900 mb-2">To access this interview:</h3>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Apply to the job position</li>
                <li>Wait for your resume to be reviewed</li>
                <li>Get shortlisted by the employer</li>
                <li>Receive the interview invitation link</li>
              </ol>
            </div>
          )}
          
          <div className="space-y-3">
            {!permissionGranted && !error?.includes('Access Denied') && (
              <button
                onClick={requestMicrophonePermission}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Grant Microphone Permission
              </button>
            )}
            
            {error?.includes('Access Denied') ? (
              <button 
                onClick={() => router.push('/jobs')}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Browse Available Jobs
              </button>
            ) : (
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium"
              >
                Refresh Page
              </button>
            )}
            
            <button 
              onClick={() => router.push('/jobs')}
              className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Job not found
  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Job not found</h2>
          <p className="text-gray-600 mb-6">The interview session you're looking for doesn't exist or has expired.</p>
          <button 
            onClick={() => router.push('/jobs')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Voice Interview</h1>
            <p className="text-gray-600">{job.jobTitle} at {job.hostId?.organization}</p>
            <p className="text-sm text-gray-500 mt-2">Duration: {job.voiceInterviewDuration} minutes</p>
            {user && (
              <p className="text-sm text-blue-600 mt-1">Candidate: {user.name}</p>
            )}
          </div>

          {/* Permission Status */}
          {!permissionGranted && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Microphone Permission Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please allow microphone access to participate in the voice interview.
                  </p>
                  <button
                    onClick={requestMicrophonePermission}
                    className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
                  >
                    Grant Permission
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Re-interview Notice */}
          {isReinterview && previousInterview && !isCallActive && !isCallEnded && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-left flex-1">
                  <h3 className="text-sm font-medium text-blue-800">Re-interview Opportunity</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You've already completed this interview (Attempt #{previousInterview.attemptNumber}, Score: {previousInterview.score}/100).
                    You can retake it to improve your score. Your latest attempt will be used for evaluation.
                  </p>
                  <div className="mt-2 text-xs text-blue-600">
                    <div>Previous Score: {previousInterview.score}/100</div>
                    <div>Final Score: {previousInterview.finalScore}/100</div>
                    <div>Total Attempts: {previousInterview.totalAttempts}</div>
                    <div>Last Completed: {new Date(previousInterview.completedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interview Status */}
          <div className="text-center mb-8">
            {!isCallActive && !isCallEnded && permissionGranted && (
              <div>
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {isReinterview ? 'Ready to Retake Interview?' : 'Ready to Start?'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {isReinterview ? (
                    'Take your time and give it your best! This attempt will replace your previous score.'
                  ) : (
                    'Make sure you\'re in a quiet environment with a good internet connection. The AI interviewer will ask you questions about your background and experience.'
                  )}
                </p>
                <button
                  onClick={startInterview}
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Assistant & Starting...' : (isReinterview ? 'Retake Interview' : 'Start Interview')}
                </button>
              </div>
            )}

            {isCallActive && (
              <div>
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Mic className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Interview in Progress</h2>
                <p className="text-gray-600 mb-4">Speak clearly and take your time to answer each question.</p>
                <div className="text-2xl font-bold text-gray-900 mb-4">{formatTime(callDuration)}</div>
                <button
                  onClick={endInterview}
                  disabled={loading}
                  className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 disabled:opacity-50"
                >
                  <PhoneOff className="h-5 w-5 inline mr-2" />
                  {loading ? 'Ending...' : 'End Interview'}
                </button>
                
                {/* Live Status Indicators */}
                <div className="mt-6 flex justify-center space-x-4 text-sm">
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                    Recording Active
                  </div>
                  <div className="flex items-center text-blue-600">
                    <Mic className="w-4 h-4 mr-1" />
                    Listening
                  </div>
                </div>
              </div>
            )}

            {isCallEnded && (
              <div>
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Interview Completed!</h2>
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-green-700 text-sm">{successMessage}</p>
                  </div>
                )}
                <p className="text-gray-600 mb-4">
                  Thank you for completing the interview. You'll be redirected to see your results shortly.
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">
                  Processing your interview responses...
                </p>
                {callId && (
                  <p className="text-xs text-gray-400 mt-2">
                    Interview ID: {callId}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Interview Tips */}
          {!isCallActive && !isCallEnded && permissionGranted && (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Interview Tips:</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Speak clearly and at a normal pace</li>
                <li>• Take a moment to think before answering</li>
                <li>• Be specific and provide examples when possible</li>
                <li>• If you don't understand a question, ask for clarification</li>
                <li>• Stay calm and be yourself</li>
                <li>• Ensure your microphone is working properly</li>
              </ul>
            </div>
          )}

          {/* Technical Requirements */}
          {!isCallActive && !isCallEnded && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Technical Requirements:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    permissionGranted ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  Microphone Access: {permissionGranted ? 'Granted' : 'Required'}
                </div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    isVapiReady ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  Interview System: {isVapiReady ? 'Ready' : 'Loading...'}
                </div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    navigator.onLine ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  Internet Connection: {navigator.onLine ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monitoring removed - transcript-based feedback after interview */}
    </div>
  );
}