// File: app/interview/[jobId]/page.js
// =================
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, CheckCircle, Shield, Video, VideoOff, MoreHorizontal, Sparkles, Activity, Wifi, User } from 'lucide-react';
import VapiSDK from '@vapi-ai/web';

const Vapi = VapiSDK.default || VapiSDK;

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
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [aiVideoLoaded, setAiVideoLoaded] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState(null); // 'assistant' or 'user'
  const [partialTranscript, setPartialTranscript] = useState('');

  const vapiInitialized = useRef(false);
  const messagesRef = useRef([]); // Use ref to avoid closure issues in event handlers
  const transcriptEndRef = useRef(null);
  const aiVideoRef = useRef(null);
  const isCallActiveRef = useRef(false); // Use ref to access in event handlers
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

  // Auto-scroll Transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptMessages]);

  // Control AI video playback based on call state and speaker
  useEffect(() => {
    console.log('🎬 Video control triggered:', {
      currentSpeaker,
      isCallActive,
      aiVideoLoaded
    });

    if (aiVideoRef.current && aiVideoLoaded) {
      if (isCallActive) {
        // CORRECT LOGIC:
        // - When AI agent speaks (assistant) = PLAY video ✅
        // - When user speaks = PAUSE video ✅
        if (currentSpeaker === 'assistant' || currentSpeaker === null) {
          console.log('🎬 AI AGENT SPEAKING → PLAYING AI VIDEO');
          aiVideoRef.current.play().catch(e => console.log('Video autoplay handled:', e));
        } else if (currentSpeaker === 'user') {
          console.log('🎤 USER SPEAKING → PAUSING AI VIDEO');
          aiVideoRef.current.pause();
        }
      } else if (isCallEnded) {
        // Pause video when interview ends
        console.log('📞 Interview ended → PAUSING AI VIDEO');
        aiVideoRef.current.pause();
      } else {
        // Keep playing before interview starts
        console.log('⏳ Before interview → PLAYING AI VIDEO');
        aiVideoRef.current.play().catch(e => console.log('Video autoplay handled:', e));
      }
    }
  }, [isCallActive, isCallEnded, aiVideoLoaded, currentSpeaker]);

  // Real-time verification functions removed - only pre-interview verification is used

  // Check if Flask services are running
  const checkFlaskServices = async () => {
    console.log('🔍 Checking Flask services for real-time biometric monitoring...');

    try {
      // Check face service (port 8001)
      const faceCheck = await fetch('http://localhost:8001/health', {
        method: 'GET',
        timeout: 5000
      }).catch(() => null);

      // Check voice service (port 8003)
      const voiceCheck = await fetch('http://localhost:8003/health', {
        method: 'GET',
        timeout: 5000
      }).catch(() => null);

      const faceStatus = faceCheck ? 'RUNNING ✅' : 'DOWN ❌';
      const voiceStatus = voiceCheck ? 'RUNNING ✅' : 'DOWN ❌';

      console.log('🔍 Flask services status:', {
        faceService: faceStatus,
        voiceService: voiceStatus
      });

      if (faceCheck && voiceCheck) {
        console.log('🎯 ALL BIOMETRIC SERVICES READY! Real-time verification active.');
      } else {
        console.warn('⚠️ Some Flask services are down! Real verification may not work.');
        console.warn('⚠️ To fix, run in separate terminals:');
        console.warn('⚠️ python python-services/face_service.py (port 8001)');
        console.warn('⚠️ python python-services/voice_service.py (port 8003)');
        console.warn('⚠️ The interview will work but verification will be limited.');
      }

      return { faceService: !!faceCheck, voiceService: !!voiceCheck };
    } catch (error) {
      console.error('🔍 Flask service check failed:', error);
      return { faceService: false, voiceService: false };
    }
  };

  // Real-time proctoring removed - only pre-interview verification is used

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
        throw new Error('VAPI public key not configured in environment variables');
      }

      console.log('Initializing VAPI client...');
      console.log('🔑 VAPI Public Key (first 10 chars):', publicKey.substring(0, 10) + '...');
      
      // Initialize VAPI client with correct configuration
      const client = new Vapi(publicKey);
      
      // Setup event listeners
      client.on('speech-start', async () => {
        console.log('🤖 AI ASSISTANT started speaking - AI video should PLAY');
        setCurrentSpeaker('assistant'); // AI is speaking = PLAY video
      });

      client.on('speech-end', async () => {
        console.log('🎤 AI ASSISTANT stopped speaking - User will speak - AI video should PAUSE');
        setCurrentSpeaker('user'); // User will speak = PAUSE video
      });
      
      client.on('call-start', () => {
        console.log('✅ Interview call started');
        setIsCallActive(true);
        isCallActiveRef.current = true; // Update ref for event handlers
        setLoading(false);
        setError(null);
      });
      
      client.on('call-end', async () => {
        console.log('🎯 User manually ended interview call');
        
        setIsCallActive(false);
        isCallActiveRef.current = false; // Update ref for event handlers
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
              console.error('❌ Error details:', errorData.details);
              console.error('❌ This likely means AI analysis failed - check if OpenRouter API is working');
              
              // Show error to user
              alert(`Interview processing failed: ${errorData.details || errorData.error}\n\nThis usually means the AI analysis service is unavailable. Your interview was recorded but not scored.`);
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
      
      // Track voice verification state
      let voiceRecordingInProgress = false;
      let lastVoiceCheck = 0;
      
      client.on('message', async (message) => {
        console.log('📝 Live transcript update:', message);

        // Handle different types of VAPI messages properly
        if (message && message.type === 'transcript') {
          const { role, transcriptType, transcript } = message;

          // Only process final transcripts to avoid fragmentation
          if (transcriptType === 'final' && transcript && transcript.trim()) {
            const cleanTranscript = transcript.trim();

            // Create a proper transcript message
            const transcriptMessage = {
              role: role,
              content: cleanTranscript,
              timestamp: new Date().toISOString(),
              type: 'transcript'
            };

            console.log('📝 Adding final transcript:', transcriptMessage);

            // Clear partial transcript when we get the final one
            setPartialTranscript('');

            // Store in both ref and state
            messagesRef.current = [...messagesRef.current, transcriptMessage];
            setTranscriptMessages(prev => [...prev, transcriptMessage]);
          } else if (transcriptType === 'partial' && transcript) {
            // Ignore partial transcripts - only use final ones
            console.log('⏭️ Skipping partial transcript');
          }
        } else if (message && message.type === 'conversation-update') {
          // DISABLED: conversation-update causes duplicates
          // Only use transcript messages for clean output
          console.log('⏭️ Skipping conversation-update (using transcript events only)');
        }

        // DO NOT store raw messages - only final transcripts
        // This prevents duplicates and ensures clean transcript
      });
      
      client.on('error', (error) => {
        console.error('❌ VAPI Error:', error);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        console.error('❌ Error type:', typeof error);
        console.error('❌ Error keys:', Object.keys(error || {}));
        
        // Extract error message from nested structure
        const errorMsg = String(
          error?.error?.error?.message || 
          error?.error?.message || 
          error?.errorMsg || 
          error?.message || 
          error?.error || 
          ''
        );
        
        console.log('📝 Extracted error message:', errorMsg);
        
        // Ignore benign errors that happen after call has ended
        if (errorMsg.includes('Meeting has ended') || 
            errorMsg.includes('ended due to ejection')) {
          console.log('ℹ️ Ignoring post-call error:', errorMsg);
          return; // Don't show error to user, call already ended successfully
        }
        
        // Check for common API issues
        if (errorMsg.includes("Key doesn't allow assistantId") || errorMsg.includes("assistantId")) {
          setError('❌ Assistant Key Mismatch: This assistant was created with a different VAPI key. You need to recreate the assistant. Go to host dashboard → Jobs → Edit this job → Click "Recreate Assistant"');
        } else if (errorMsg.includes('Wallet Balance') || errorMsg.includes('Purchase More Credits')) {
          setError('❌ VAPI Account Out of Credits: Your VAPI account balance is negative. Please add credits at https://vapi.ai/dashboard/billing to continue conducting interviews.');
        } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          setError('❌ VAPI Permission Error: Your API key does not have web call permissions. Please enable "Web" in your VAPI dashboard.');
        } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          setError('❌ VAPI Authentication Failed: Your API key is invalid or expired. Please check your VAPI dashboard at https://vapi.ai/dashboard');
        } else if (errorMsg.includes('404')) {
          setError('❌ Assistant not found: The assistant ID may be invalid. Please recreate the assistant.');
        } else if (errorMsg) {
          setError(`Interview error: ${errorMsg}`);
        } else {
          setError('❌ VAPI connection error. Please check:\n1. VAPI API key is valid\n2. Web permissions enabled in VAPI dashboard\n3. Internet connection is stable');
        }
        
        setIsCallActive(false);
        setLoading(false);
      });
      
      setVapiClient(client);
      setIsVapiReady(true);
      vapiInitialized.current = true;
      
      console.log('VAPI client initialized successfully');
      setLoading(false);
      
    } catch (error) {
      console.error('Failed to initialize VAPI:', error);
      setError(`Failed to initialize interview system: ${error.message}`);
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
      setPartialTranscript(''); // Clear partial transcript
      setCurrentSpeaker(null); // Reset speaker
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
        // Create a fresh interview assistant for each interview (ensures current API key)
        console.log('🏗️ Creating fresh interview assistant for job:', params.jobId);
        
        const assistantResponse = await fetch('/api/interview/create-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: params.jobId })
        });
        
        console.log('📡 Assistant creation response status:', assistantResponse.status);
        const assistantResult = await assistantResponse.json();
        console.log('📄 Assistant creation result:', assistantResult);
        
        if (!assistantResult.success) {
          throw new Error(`Failed to create assistant: ${assistantResult.error}`);
        }
        
        const assistantToUse = assistantResult.assistantId;
        setFinalAssistantId(assistantToUse);
        console.log('✅ Interview assistant created:', assistantToUse);
        console.log('📝 Questions loaded:', assistantResult.questionsCount);
        
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

  // Main return - clean white and blue UI to match platform
  return (
    <div className="h-screen bg-gray-50 text-gray-900 font-sans flex flex-col overflow-hidden">

      {/* TOP HEADER */}
      <header className="h-16 px-6 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm shrink-0 z-30">
          <div className="flex items-center gap-4">
             <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles size={18} className="text-white" />
             </div>
             <div>
                <h1 className="text-sm font-bold text-gray-900 tracking-wide">AI Voice Interview</h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCallActive ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`} />
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                        {isCallActive ? 'Live Interview' : 'Ready to Start'}
                    </span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 flex items-center gap-2 text-xs font-mono text-gray-600">
                 <Wifi size={12} className={`${navigator.onLine ? 'text-green-500' : 'text-red-500'}`} />
                 <span>{navigator.onLine ? 'Connected' : 'Offline'}</span>
             </div>
             {job && (
               <div className="text-xs text-gray-600 font-medium">
                 {job.jobTitle}
               </div>
             )}
          </div>
      </header>

      {/* MAIN STAGE */}
      <main className="flex-1 p-4 lg:p-6 flex gap-6 overflow-hidden">
         
         {/* LEFT: VIDEO GRID */}
         <section className="flex-[2] flex flex-col gap-4 min-h-0">
            <div className="flex-1 flex gap-4 min-h-0">
                {/* AI AVATAR (Video) */}
                <div className="relative w-full h-full bg-gray-100 overflow-hidden rounded-2xl border border-gray-300 shadow-lg">
                  <div className="w-full h-full relative">
                    <video
                      ref={aiVideoRef}
                      src="/interview.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        isCallActive ? 'brightness-110 scale-[1.02]' : 'brightness-100 scale-100'
                      }`}
                      style={{ objectPosition: 'center 20%' }}
                      onTimeUpdate={(e) => {
                        // Restart video 2 seconds before end for seamless loop
                        const video = e.target;
                        if (video.duration - video.currentTime < 2) {
                          video.currentTime = 0;
                        }
                      }}
                      onLoadedData={() => {
                        console.log('✅ AI interviewer video loaded successfully');
                        setAiVideoLoaded(true);
                      }}
                      onError={(e) => {
                        console.error('❌ Video failed to load:', e);
                        console.log('🔄 Falling back to image');
                        setAiVideoLoaded(false);
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop"
                      alt="AI Interviewer Fallback"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: 'center 20%', display: 'none' }}
                    />

                    {/* Loading overlay for video */}
                    {!aiVideoLoaded && (
                      <div className="absolute inset-0 bg-white flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-600">Loading AI Interviewer...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LABEL */}
                  <div className="absolute bottom-4 left-4 z-20">
                    <div className={`backdrop-blur-md border px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isCallActive ? 'bg-blue-500/20 border-blue-500/30 text-blue-700 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/90 border-gray-300 text-gray-700'}`}>
                        <Sparkles size={12} className={isCallActive ? "text-blue-500 animate-pulse" : "text-gray-500"} />
                        <span>AI Interviewer</span>
                    </div>
                  </div>

                  {/* SPEAKING INDICATOR */}
                  {isCallActive && (
                    <div className="absolute bottom-5 right-5 flex items-end gap-1 h-6 z-20">
                        <span className="w-1 bg-blue-500 animate-[bounce_1s_infinite] h-3 rounded-full" />
                        <span className="w-1 bg-blue-500 animate-[bounce_1.2s_infinite] h-5 rounded-full" />
                        <span className="w-1 bg-blue-500 animate-[bounce_0.8s_infinite] h-2 rounded-full" />
                    </div>
                  )}
                </div>
                
                {/* USER WEBCAM */}
                <UserWebcam
                  isVideoOn={videoOn}
                  isMicOn={micOn}
                  userName={user?.name}
                  isCallActive={isCallActive}
                />
            </div>

            {/* CONTROLS BAR */}
            <div className="h-20 bg-white border border-gray-200 rounded-2xl flex items-center justify-between px-8 shadow-lg shrink-0 relative">

                {/* Timer */}
                <div className="flex items-center gap-3 font-mono text-gray-600 text-sm w-32">
                   <span className={`w-2 h-2 ${isCallActive ? 'bg-red-500' : 'bg-blue-500'} rounded-full ${isCallActive ? 'animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}`}></span>
                   {formatTime(callDuration)}
                </div>

                {/* Center Buttons */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
                    <button
                        onClick={() => setMicOn(!micOn)}
                        className={`p-4 rounded-full transition-all duration-200 ${micOn ? 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-500' : 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30'}`}
                        title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                    >
                        {micOn ? <Mic size={22} /> : <MicOff size={22} />}
                    </button>

                    <button
                        onClick={() => setVideoOn(!videoOn)}
                        className={`p-4 rounded-full transition-all duration-200 ${videoOn ? 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-500' : 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30'}`}
                        title={videoOn ? "Turn Off Camera" : "Turn On Camera"}
                    >
                        {videoOn ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>

                    {isCallActive ? (
                      <button
                          onClick={endInterview}
                          disabled={loading}
                          className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium ml-4 shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                          <PhoneOff size={20} />
                          <span>{loading ? 'Ending...' : 'End'}</span>
                      </button>
                    ) : (
                      <button
                          onClick={startInterview}
                          disabled={loading || !permissionGranted}
                          className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-full font-medium ml-4 shadow-lg shadow-green-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <Phone size={20} />
                          <span>{loading ? 'Starting...' : 'Start Interview'}</span>
                      </button>
                    )}
                </div>

                <div className="w-32 flex justify-end">
                    <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                        <MoreHorizontal size={24} />
                    </button>
                </div>
            </div>
         </section>

         {/* RIGHT: TRANSCRIPT */}
         <aside className="w-[380px] hidden lg:flex bg-white border border-gray-200 rounded-2xl flex-col overflow-hidden shadow-lg">
            <div className="p-5 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Live Transcript</span>
                <Activity size={14} className="text-blue-500" />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
                {transcriptMessages.length === 0 && !partialTranscript && !isCallActive && (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    <p>Transcript will appear here during the interview</p>
                  </div>
                )}

                {/* Display completed transcript messages - ONLY FINAL TRANSCRIPTS */}
                {transcriptMessages
                  .filter(msg => {
                    // Only show final transcripts with actual content
                    return msg.content && 
                           msg.content.trim() && 
                           msg.content !== 'Message' &&
                           msg.type === 'transcript' && // Only transcript type messages
                           msg.content.length > 2; // Filter out very short/noise
                  })
                  .map((msg, index) => {
                    const isAI = msg.role === 'assistant' || msg.role === 'ai';
                    const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();

                    return (
                      <div key={`${index}-${msg.timestamp}`} className={`flex flex-col gap-1 ${isAI ? 'items-start' : 'items-end'}`}>
                          <div className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider mb-1 ${isAI ? 'text-blue-500 flex-row' : 'text-gray-500 flex-row-reverse'}`}>
                              <span>{isAI ? 'AI' : 'You'}</span>
                              <span>•</span>
                              <span>{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[90%] ${
                              isAI
                              ? 'bg-blue-50 text-blue-900 rounded-tl-none border border-blue-200'
                              : 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10'
                          }`}>
                              {msg.content}
                          </div>
                      </div>
                    );
                  })}

                {/* Display partial transcript DISABLED - only show final */}
                {false && partialTranscript && partialTranscript.trim() && (
                  <div className="flex flex-col gap-1 items-end opacity-70">
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider mb-1 text-gray-400 flex-row-reverse">
                          <span>You</span>
                          <span>•</span>
                          <span>typing...</span>
                      </div>
                      <div className="p-4 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[90%] bg-gray-200 text-gray-700 rounded-tr-none border border-gray-300 italic">
                          {partialTranscript}
                      </div>
                  </div>
                )}

                <div ref={transcriptEndRef} />
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-4 text-sm text-gray-600 flex items-center gap-2">
                  {isCallActive ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Listening...</span>
                    </>
                  ) : (
                    <span>Waiting to start...</span>
                  )}
                </div>
            </div>
         </aside>

      </main>

      {/* Instructions Overlay - Show before interview starts */}
      {!isCallActive && !isCallEnded && permissionGranted && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="max-w-md bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isReinterview ? 'Ready to Retake Interview?' : 'Ready to Start?'}
            </h2>
            <p className="text-gray-600 mb-6">
              {job?.jobTitle} at {job?.hostId?.organization}
            </p>
            <p className="text-gray-700 mb-6 text-sm">
              {isReinterview ? (
                'This attempt will replace your previous score. Take your time and give it your best!'
              ) : (
                'Make sure you\'re in a quiet environment. The AI will ask questions about your background and experience.'
              )}
            </p>

            {/* Interview Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Interview Tips:</h3>
              <ul className="text-xs text-gray-700 space-y-2">
                <li>• Speak clearly and at a normal pace</li>
                <li>• Take a moment to think before answering</li>
                <li>• Be specific and provide examples</li>
                <li>• Stay calm and be yourself</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/jobs')}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={startInterview}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting...' : 'Start Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Ended Overlay */}
      {isCallEnded && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="max-w-md bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Interview Completed!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing the interview. Processing your responses...
            </p>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// User Webcam Component
const UserWebcam = ({ isVideoOn, isMicOn, userName, isCallActive }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [cameraError, setCameraError] = useState(false);

    useEffect(() => {
        let stream = null;
        const startCamera = async () => {
            if (isVideoOn) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            facingMode: 'user',
                            frameRate: { ideal: 30 },
                            aspectRatio: { ideal: 16/9 }
                        },
                        audio: false
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        setCameraError(false);
                    }
                } catch (err) {
                    console.error("Camera Error:", err);
                    setCameraError(true);
                }
            } else {
                if (videoRef.current) videoRef.current.srcObject = null;
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            }
        };
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isVideoOn]);

    // Canvas drawing DISABLED - No real-time proctoring overlay
    useEffect(() => {
        // Real-time proctoring disabled
        return;
    }, [isCallActive]);

    return (
        <div className="relative w-full h-full bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-300 shadow-lg">
            {isVideoOn && !cameraError ? (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    {/* Proctoring Overlay Canvas - DISABLED */}
                </>
            ) : (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                        {cameraError ? <AlertCircle size={24} className="text-red-500" /> : <VideoOff size={24} />}
                    </div>
                    <span className="text-xs uppercase tracking-wider font-bold text-center">
                        {cameraError ? 'Camera Error' : 'Camera Off'}
                    </span>
                </div>
            )}

            {/* Proctoring Status Indicators - DISABLED */}

            {/* Mic Status Badge */}
            <div className="absolute top-4 right-4 z-20">
                {!isMicOn ? (
                    <div className="bg-red-500 text-white p-2 rounded-full shadow-lg">
                        <MicOff size={16} />
                    </div>
                ) : (
                    <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg">
                        <Mic size={16} />
                    </div>
                )}
            </div>

            {/* Label */}
            <div className="absolute bottom-4 left-4 z-20">
                <div className="bg-white/90 backdrop-blur-md border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                    {userName || 'You'}
                </div>
            </div>

            {/* Removed violations alert - we show status badges instead */}
        </div>
    );
};