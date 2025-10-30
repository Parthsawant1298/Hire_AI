'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const FLASK_FACE_SERVICE = process.env.NEXT_PUBLIC_FLASK_FACE_SERVICE_URL || 'http://localhost:8001';
const FLASK_VOICE_SERVICE = process.env.NEXT_PUBLIC_FLASK_VOICE_SERVICE_URL || 'http://localhost:8003';
const VOICE_CHUNK_DURATION_MS = 6000;

export default function InterviewMonitoring({ 
  isActive, 
  onAnomalyDetected, 
  userId, 
  jobId, 
  userName, 
  storedFaceData, 
  storedVoiceData 
}) {
  // Debug: Log props on mount and when they change
  useEffect(() => {
    console.log('🔍 InterviewMonitoring Props:', {
      isActive,
      userId,
      jobId,
      userName,
      hasStoredFaceData: !!storedFaceData,
      hasStoredVoiceData: !!storedVoiceData,
      storedFaceDataLength: storedFaceData?.length,
      storedVoiceDataLength: storedVoiceData?.length
    });
  }, [isActive, userId, jobId, userName, storedFaceData, storedVoiceData]);

  const [cameraStream, setCameraStream] = useState(null);
  const [monitoringData, setMonitoringData] = useState({
    faceDeviations: 0,
    voiceAnomalies: 0,
    personSwitches: 0,
    attentionLapses: 0,
    environmentChanges: 0,
    faceDetections: 0,
    faceMatches: 0,
    voiceMatches: 0,
    anomalies: 0,
    clothingChanges: 0
  });
  const [faceDetection, setFaceDetection] = useState({
    detected: false,
    confidence: 0,
    confidenceLabel: null,
    boundingBox: null,
    verified: false
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const monitoringInterval = useRef(null);
  const monitoringLoopRunningRef = useRef(false);
  const baselineDataRef = useRef(null);
  const lastFrameDataRef = useRef(null);
  const lastAnomalyTimeRef = useRef(0);
  const voiceProcessingRef = useRef(false);
  
  // REAL continuous face tracking
  const faceTrackingIntervalRef = useRef(null);
  const [isRealTimeTracking, setIsRealTimeTracking] = useState(false);
  
  // Audio recording refs for voice matching
  const audioRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const voiceBaselineRef = useRef(null);
  
  // Utility function to calculate spectral centroid
  const calculateSpectralCentroid = (dataArray) => {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      numerator += i * dataArray[i];
      denominator += dataArray[i];
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  };
  
  // Audio visualization
  const audioCanvasRef = useRef(null);
  const audioDataRef = useRef([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceAnomaly, setVoiceAnomaly] = useState(null);
  
  // Real-time verification states
  const [isFlaskConnected, setIsFlaskConnected] = useState(false);
  const [faceServiceOnline, setFaceServiceOnline] = useState(false);
  const [voiceServiceOnline, setVoiceServiceOnline] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [realTimeFaceMatch, setRealTimeFaceMatch] = useState(null);
  const [realTimeVoiceMatch, setRealTimeVoiceMatch] = useState(null);

  // Check video element on mount
  useEffect(() => {
    console.log('🎥 InterviewMonitoring component mounted');
    console.log('📊 Props received:', { isActive, userId, jobId, userName });
    
    // Check if video element is available after render
    setTimeout(() => {
      if (videoRef.current) {
        console.log('✅ Video element found in DOM');
      } else {
        console.warn('❌ Video element not found in DOM');
      }
    }, 100);
  }, []);

  const checkFlaskServices = useCallback(async () => {
    try {
      const [faceCheck, voiceCheck] = await Promise.all([
        fetch(`${FLASK_FACE_SERVICE}/health`).catch(() => null),
        fetch(`${FLASK_VOICE_SERVICE}/health`).catch(() => null)
      ]);
      
      const faceConnected = faceCheck?.ok;
      const voiceConnected = voiceCheck?.ok;
      
      setFaceServiceOnline(!!faceConnected);
      setVoiceServiceOnline(!!voiceConnected);
      setIsFlaskConnected(!!faceConnected && !!voiceConnected);
      console.log('🔧 Flask Services Status:', { 
        face: faceConnected ? '✅' : '❌', 
        voice: voiceConnected ? '✅' : '❌' 
      });
    } catch (error) {
      console.error('❌ Flask service check failed:', error);
      setIsFlaskConnected(false);
      setFaceServiceOnline(false);
      setVoiceServiceOnline(false);
    }
  }, []);

  useEffect(() => {
    checkFlaskServices();
    const intervalId = setInterval(checkFlaskServices, 15000);
    return () => clearInterval(intervalId);
  }, [checkFlaskServices]);

  useEffect(() => {
    if (!cameraStream) return;

    if (voiceServiceOnline && storedVoiceData) {
      console.log('🔁 Voice service online - ensuring recorder is running');
      setupFlaskVoiceRecording(cameraStream);
    } else if (audioRecorderRef.current) {
      console.log('🔁 Voice service offline or no stored voice data - stopping recorder');
      try {
        if (audioRecorderRef.current.state !== 'inactive') {
          audioRecorderRef.current.stop();
        }
      } catch (err) {
        console.error('❌ Error stopping audio recorder:', err);
      }
      audioRecorderRef.current = null;
    }
  }, [voiceServiceOnline, storedVoiceData, cameraStream]);

  // Initialize camera and monitoring when interview starts and user is available
  useEffect(() => {
    console.log('🔄 Monitoring effect triggered:', { 
      isActive, 
      userId: !!userId, 
      jobId: !!jobId, 
      userName,
      storedFaceData: !!storedFaceData,
      storedVoiceData: !!storedVoiceData
    });

    if (isActive && userId && jobId) {
      console.log('✅ Starting monitoring with userId:', userId, 'jobId:', jobId, 'userName:', userName);
      startMonitoring();
    } else {
      if (isActive && (!userId || !jobId)) {
        console.warn('⚠️ Cannot start monitoring - missing data:', { isActive, userId: !!userId, jobId: !!jobId });
      } else if (!isActive) {
        console.log('📴 Monitoring not active, stopping...');
      }
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [isActive, userId, jobId]);

  // Debug video element state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const checkVideoState = () => {
        console.log('🔍 Video element state:', {
          srcObject: !!video.srcObject,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          clientWidth: video.clientWidth,
          clientHeight: video.clientHeight,
          readyState: video.readyState,
          networkState: video.networkState,
          paused: video.paused,
          ended: video.ended,
          currentTime: video.currentTime
        });
      };

      // Check immediately and then every 2 seconds
      checkVideoState();
      const interval = setInterval(checkVideoState, 2000);

      return () => clearInterval(interval);
    }
  }, [cameraStream]);

  const startMonitoring = async () => {
    try {
      console.log('🔴 Starting interview monitoring system...');

      monitoringLoopRunningRef.current = false;
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
        monitoringInterval.current = null;
      }

      await checkFlaskServices();

      // Check if browser supports required APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support camera/microphone access');
      }

      // Start camera feed
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });

      console.log('📷 Camera access granted, stream obtained');
      setCameraStream(stream);

      if (videoRef.current) {
        const video = videoRef.current;
        console.log('📹 Video element found:', !!video);
        
        // Ensure video element is properly configured
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        
        // Set the stream immediately
        video.srcObject = stream;
        console.log('🎥 Video srcObject set:', !!video.srcObject);
        console.log('🎥 Stream tracks:', stream.getVideoTracks().length, 'video,', stream.getAudioTracks().length, 'audio');
        
        // Set up event listeners
        const handleVideoReady = () => {
          console.log('📹 Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
          
          // Set canvas dimensions to match video
          if (canvasRef.current) {
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
          }
          
          if (overlayCanvasRef.current) {
            overlayCanvasRef.current.width = video.videoWidth;
            overlayCanvasRef.current.height = video.videoHeight;
          }
          
          // Start monitoring after video is properly loaded
          setTimeout(() => {
            establishBaseline();
            startMonitoringLoop();
          }, 1000);
        };

        const handleVideoError = (error) => {
          console.error('❌ Video loading error:', error);
        };

        // Add event listeners
        video.addEventListener('loadedmetadata', handleVideoReady, { once: true });
        video.addEventListener('error', handleVideoError, { once: true });
        
        // Start playing the video
        video.play()
          .then(() => {
            console.log('▶️ Video started playing successfully');
            console.log('📐 Video element dimensions:', video.clientWidth, 'x', video.clientHeight);
            
            // If metadata not loaded yet, set up backup timer
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              console.log('⏳ Video dimensions not ready, waiting for metadata...');
              setTimeout(() => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  console.log('📹 Video dimensions now ready:', video.videoWidth, 'x', video.videoHeight);
                  if (canvasRef.current) {
                    canvasRef.current.width = video.videoWidth;
                    canvasRef.current.height = video.videoHeight;
                  }
                  if (overlayCanvasRef.current) {
                    overlayCanvasRef.current.width = video.videoWidth;
                    overlayCanvasRef.current.height = video.videoHeight;
                  }
                  establishBaseline();
                  startMonitoringLoop();
                }
              }, 2000);
            } else {
              // Metadata already loaded
              handleVideoReady();
            }
          })
          .catch(playError => {
            console.error('❌ Video play failed:', playError);
          });
      }

      // Setup audio monitoring
      setupAudioMonitoring(stream);

    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
    }
  };

  const setupAudioMonitoring = (stream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        source.connect(analyserRef.current);

        // Setup audio recording for Flask voice verification if service is online
        if (voiceServiceOnline && storedVoiceData) {
          setupFlaskVoiceRecording(stream);
        } else {
          console.warn('⚠️ Voice service offline or no stored voice data; skipping Flask recording setup');
        }

        console.log('🎤 Audio monitoring initialized');
      }
    } catch (error) {
      console.error('❌ Audio monitoring setup failed:', error);
    }
  };

  const setupFlaskVoiceRecording = (stream) => {
    if (!voiceServiceOnline) {
      console.warn('⚠️ Flask voice service not connected, skipping voice recording setup');
      return;
    }

    if (!storedVoiceData) {
      console.warn('⚠️ No stored voice data available for verification');
      return;
    }

    // Check if recorder is already running
    if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
      console.log('⚠️ Voice recorder already running, skipping duplicate setup');
      return;
    }

    try {
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop();
      }

      // Check MediaRecorder support and get supported MIME types
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      
      let selectedMimeType = null;
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log(`✅ Using MIME type: ${type}`);
          break;
        }
      }
      
      if (!selectedMimeType) {
        console.warn('⚠️ No supported audio MIME types found, using default');
      }

      // Create MediaRecorder with error handling
      let recorder;
      try {
        recorder = selectedMimeType ? 
          new MediaRecorder(stream, { mimeType: selectedMimeType }) :
          new MediaRecorder(stream);
          
        console.log(`✅ MediaRecorder created with MIME type: ${selectedMimeType || 'default'}`);
      } catch (mimeError) {
        console.warn('⚠️ Failed with MIME type, trying default:', mimeError);
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          await processVoiceChunk(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        console.error('❌ MediaRecorder state:', recorder.state);
      };
      
      recorder.onstart = () => {
        console.log('✅ Voice recording started successfully');
      };

      // Start recording with error handling - try without time slice first for better compatibility
      try {
        recorder.start();
        audioRecorderRef.current = recorder;
        console.log('✅ Voice recording started without time slice');
      } catch (startError) {
        console.error('❌ Failed to start MediaRecorder:', startError);
        console.error('❌ Stream tracks:', stream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted
        })));
        
        // Fallback: try with time slice (some browsers support this)
        try {
          console.log('🔄 Trying to start with time slice...');
          recorder.start(VOICE_CHUNK_DURATION_MS);
          audioRecorderRef.current = recorder;
          console.log(`🎤 Flask voice recording setup completed (${VOICE_CHUNK_DURATION_MS / 1000}s chunks)`);
        } catch (fallbackError) {
          console.error('❌ All voice recording methods failed:', fallbackError);
        }
      }

    } catch (error) {
      console.error('❌ Flask voice recording setup failed:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  };

  const processVoiceChunk = async (audioBlob) => {
    if (!audioBlob || !voiceServiceOnline) {
      return;
    }

    if (voiceProcessingRef.current) {
      console.log('⏳ Voice chunk processing already in progress, skipping this chunk');
      return;
    }

    voiceProcessingRef.current = true;

    try {
      console.log('🚀 STARTING REAL Flask voice verification...');
      console.log('🎤 Audio blob:', audioBlob?.size, 'bytes, type:', audioBlob?.type);

      // Create FormData exactly like verification test page
      const formData = new FormData();
      formData.append('testAudio', audioBlob, 'realtime-voice-chunk.wav');
      formData.append('textRead', 'Real-time monitoring audio'); // Placeholder text for real-time
      console.log('✅ FormData created with testAudio field');

      console.log('📤 Calling /api/verification/verify-voice (SAME as test page)...');

      // Call the EXACT same API endpoint as verification test page
      const response = await fetch('/api/verification/verify-voice', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      console.log('📥 Response received, status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ REAL Flask voice verification result:', result);

      // Use exact same response structure as verification test page
      if (result.success) {
        const score = result.ensembleScore || result.confidence || 0;
        const verified = result.verified || false;
        const confidence = result.confidence || 'UNKNOWN';

        console.log('✅ REAL voice verification successful (same as test page):', {
          verified,
          score,
          confidence,
          result: result.result
        });

        setRealTimeVoiceMatch({
          verified: verified,
          score: score,
          confidence: confidence,
          confidenceLabel: confidence,
          result: result.result || 'UNKNOWN',
          details: result.details || '',
          timestamp: Date.now(),
          raw: result
        });

        setMonitoringData(prev => ({
          ...prev,
          voiceMatches: prev.voiceMatches + (verified ? 1 : 0)
        }));

        if (!verified && score < 0.9) {
          console.warn('🚨 REAL voice verification anomaly detected:', result);

          const anomaly = {
            detected: true,
            type: 'flask_voice_verification_failed',
            severity: score < 0.85 ? 'high' : 'medium',
            data: {
              ensembleScore: score,
              confidenceLabel: confidence,
              result: result.result,
              timestamp: Date.now()
            }
          };

          setVoiceAnomaly(anomaly);
          updateAnomalyData({ detected: false }, anomaly, { detected: false });
        } else {
          setVoiceAnomaly(null);
        }
      } else {
        console.warn('❌ REAL voice verification failed (same as test page):', result.error);

        setRealTimeVoiceMatch({
          verified: false,
          score: 0,
          confidence: 'ERROR',
          confidenceLabel: 'ERROR',
          result: 'VERIFICATION_FAILED',
          error: result.error,
          timestamp: Date.now()
        });

        const anomaly = {
          detected: true,
          type: 'flask_voice_verification_failed',
          severity: 'high',
          data: {
            ensembleScore: 0,
            confidenceLabel: 'ERROR',
            error: result.error,
            timestamp: Date.now()
          }
        };

        setVoiceAnomaly(anomaly);
        updateAnomalyData({ detected: false }, anomaly, { detected: false });
      }
    } catch (error) {
      console.error('❌ Flask voice detection FAILED:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Mark voice as not verified when Flask fails
      setRealTimeVoiceMatch({
        verified: false,
        score: 0,
        confidence: 'ERROR',
        confidenceLabel: 'FLASK_FAILED',
        result: 'DETECTION_FAILED',
        error: error.message,
        timestamp: Date.now()
      });

      console.warn('⚠️ Voice verification failed - marking as NOT VERIFIED');
    } finally {
      voiceProcessingRef.current = false;
    }
  };

  const drawAudioWaveform = () => {
    if (!audioCanvasRef.current || !analyserRef.current) return;

    const canvas = audioCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate current audio level
    const currentLevel = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength / 255;
    setAudioLevel(currentLevel);

    // Store audio data for visualization
    audioDataRef.current.push(currentLevel);
    if (audioDataRef.current.length > canvas.width) {
      audioDataRef.current.shift();
    }

    // Professional voice status determination
    const isVoiceVerified = realTimeVoiceMatch?.verified;
    const hasVoiceAnomaly = voiceAnomaly?.detected;
    const isActiveSpeaking = currentLevel > 0.1;

    // Clear canvas with professional background
    if (hasVoiceAnomaly) {
      // Red background for anomalies
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#7f1d1d');
      gradient.addColorStop(1, '#1f2937');
      ctx.fillStyle = gradient;
    } else if (isVoiceVerified && isActiveSpeaking) {
      // Blue background for verified voice
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1e3a8a');
      gradient.addColorStop(1, '#1f2937');
      ctx.fillStyle = gradient;
    } else {
      // Default dark background
      ctx.fillStyle = '#1F2937';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Professional waveform rendering
    if (audioDataRef.current.length > 0) {
      // Main waveform
      const waveformColor = hasVoiceAnomaly
        ? '#EF4444'
        : isVoiceVerified
          ? '#2563EB'
          : isActiveSpeaking
            ? '#10B981'
            : '#6B7280';

      ctx.strokeStyle = waveformColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const sliceWidth = canvas.width / audioDataRef.current.length;
      let x = 0;

      for (let i = 0; i < audioDataRef.current.length; i++) {
        const v = audioDataRef.current[i];
        const y = (1 - v) * canvas.height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      // Add glow effect for verified voice
      if (isVoiceVerified && isActiveSpeaking) {
        ctx.shadowColor = '#2563EB';
        ctx.shadowBlur = 5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Professional level indicator with status
    const levelHeight = Math.max(currentLevel * (canvas.height - 20), 2);
    const levelColor = hasVoiceAnomaly
      ? '#EF4444'
      : isVoiceVerified
        ? '#2563EB'
        : '#10B981';

    // Level bar background
    ctx.fillStyle = 'rgba(75, 85, 99, 0.3)';
    ctx.fillRect(canvas.width - 15, 5, 10, canvas.height - 10);

    // Level bar
    ctx.fillStyle = levelColor;
    ctx.fillRect(canvas.width - 15, canvas.height - 5 - levelHeight, 10, levelHeight);

    // Professional status indicators
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';

    // Voice status text
    const statusText = hasVoiceAnomaly
      ? 'ANOMALY'
      : isVoiceVerified
        ? 'VERIFIED'
        : isActiveSpeaking
          ? 'ACTIVE'
          : 'IDLE';

    const statusColor = hasVoiceAnomaly
      ? '#FEE2E2'
      : isVoiceVerified
        ? '#DBEAFE'
        : '#F0FDF4';

    // Status background
    const statusWidth = ctx.measureText(statusText).width + 8;
    ctx.fillStyle = levelColor;
    ctx.fillRect(5, 5, statusWidth, 16);

    // Status text
    ctx.fillStyle = 'white';
    ctx.fillText(statusText, 9, 15);

    // Audio level percentage
    ctx.fillStyle = '#D1D5DB';
    ctx.font = '9px system-ui, -apple-system, sans-serif';
    const levelText = `${Math.round(currentLevel * 100)}%`;
    ctx.fillText(levelText, 5, canvas.height - 8);

    // Real-time timestamp
    const timestamp = new Date().toLocaleTimeString().slice(-8);
    const timeWidth = ctx.measureText(timestamp).width;
    ctx.fillText(timestamp, canvas.width - timeWidth - 20, canvas.height - 8);

    // Voice verification score if available
    if (realTimeVoiceMatch?.score !== undefined) {
      const score = Math.round(realTimeVoiceMatch.score * 100);
      const scoreText = `${score}%`;
      const scoreWidth = ctx.measureText(scoreText).width;

      ctx.fillStyle = isVoiceVerified ? '#2563EB' : '#F59E0B';
      ctx.fillRect(canvas.width - scoreWidth - 25, 25, scoreWidth + 8, 14);

      ctx.fillStyle = 'white';
      ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
      ctx.fillText(scoreText, canvas.width - scoreWidth - 21, 35);
    }
  };

  const establishBaseline = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) return;

      console.log('📊 Establishing monitoring baseline...');

      // Capture baseline face data
      const faceBaseline = await captureFaceData();
      const voiceBaseline = captureVoiceProfile();

      baselineDataRef.current = {
        face: faceBaseline,
        voice: voiceBaseline,
        timestamp: Date.now()
      };

      console.log('✅ Baseline established for continuous monitoring');

    } catch (error) {
      console.error('❌ Baseline establishment failed:', error);
    }
  };

  const startMonitoringLoop = () => {
    if (monitoringLoopRunningRef.current) {
      console.log('⚠️ Monitoring loop already running, skipping duplicate start');
      return;
    }

    monitoringLoopRunningRef.current = true;
    console.log('🔁 Starting continuous monitoring loop...');

    monitoringInterval.current = setInterval(async () => {
      if (!monitoringLoopRunningRef.current) {
        console.log('� Monitoring loop stopped, clearing interval');
        if (monitoringInterval.current) {
          clearInterval(monitoringInterval.current);
          monitoringInterval.current = null;
        }
        return;
      }

      try {
        // Face monitoring - use continuous tracking results if available, otherwise capture new data
        let currentFaceData = null;
        if (isRealTimeTracking && realTimeFaceMatch && Date.now() - realTimeFaceMatch.timestamp < 3000) {
          // Use recent continuous tracking results to avoid duplicate API calls
          currentFaceData = {
            similarity: realTimeFaceMatch.similarity || 0,
            confidence: realTimeFaceMatch.confidenceLabel || 'UNKNOWN',
            verified: realTimeFaceMatch.verified || false,
            timestamp: realTimeFaceMatch.timestamp,
            detectedFaces: detectedFaces,
            matchResult: realTimeFaceMatch.raw
          };
          console.log('📊 Using cached face data from continuous tracking');
        } else {
          // Fallback to direct capture if continuous tracking not available
          currentFaceData = await captureFaceData();
        }

        // Voice monitoring (traditional method for baseline)
        const currentVoiceData = captureVoiceProfile();

        // Update audio visualization continuously
        drawAudioWaveform();

        // Environment monitoring
        const environmentAnomaly = detectEnvironmentChange();

        // Check for anomalies only if we have baseline data
        if (baselineDataRef.current && currentFaceData) {
          const faceAnomaly = detectFaceAnomaly(currentFaceData);
          const voiceAnomaly = detectVoiceAnomaly(currentVoiceData);
          
          // Update voice anomaly state for visualization
          setVoiceAnomaly(voiceAnomaly.detected ? voiceAnomaly : null);

          // Enhanced anomaly detection with Flask results
          const enhancedFaceAnomaly = enhanceFaceAnomalyWithFlask(faceAnomaly, currentFaceData);
          const enhancedVoiceAnomaly = enhanceVoiceAnomalyWithFlask(voiceAnomaly);

          // Update monitoring data if anomalies detected
          if (enhancedFaceAnomaly.detected || enhancedVoiceAnomaly.detected || environmentAnomaly.detected) {
            updateAnomalyData(enhancedFaceAnomaly, enhancedVoiceAnomaly, environmentAnomaly, null);
          }
        }

        // Update monitoring stats with Flask verification results
        setMonitoringData(prev => ({
          ...prev,
          faceDetections: prev.faceDetections + (currentFaceData?.detectedFaces?.length || 0),
          faceMatches: prev.faceMatches + (realTimeFaceMatch?.verified ? 1 : 0),
          voiceMatches: prev.voiceMatches + (realTimeVoiceMatch?.verified ? 1 : 0)
        }));

      } catch (error) {
        console.error('❌ Monitoring loop error:', error);
      }
    }, 2000); // Check every 2 seconds for continuous tracking
  };

  const enhanceFaceAnomalyWithFlask = (baseAnomaly, faceData) => {
    // If Flask detected multiple faces, that's an anomaly
    if (faceData?.detectedFaces?.length > 1) {
      return {
        detected: true,
        type: 'multiple_faces_detected',
        severity: 'high',
        data: {
          faceCount: faceData.detectedFaces.length,
          flaskResult: faceData.matchResult
        }
      };
    }

    // If Flask verification failed but traditional detection passed
    const faceScore = realTimeFaceMatch?.similarity ?? 0;
    if (realTimeFaceMatch && !realTimeFaceMatch.verified && faceScore < 0.6) {
      return {
        detected: true,
        type: 'flask_face_verification_failed',
        severity: 'high',
        data: {
          flaskSimilarity: faceScore,
          flaskConfidenceLabel: realTimeFaceMatch.confidenceLabel,
          traditionalResult: baseAnomaly
        }
      };
    }

    return baseAnomaly;
  };

  const enhanceVoiceAnomalyWithFlask = (baseAnomaly) => {
    // If Flask voice verification failed
    const voiceScore = realTimeVoiceMatch?.score ?? 0;
    if (realTimeVoiceMatch && !realTimeVoiceMatch.verified && voiceScore < 0.9) {
      return {
        detected: true,
        type: 'flask_voice_verification_failed',
        severity: 'high',
        data: {
          ensembleScore: voiceScore,
          confidenceLabel: realTimeVoiceMatch.confidenceLabel,
          raw: realTimeVoiceMatch.raw,
          traditionalResult: baseAnomaly
        }
      };
    }

    return baseAnomaly;
  };

  const captureFaceData = async () => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        console.warn('⚠️ Missing video or canvas reference');
        resolve(null);
        return;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      // Ensure video has dimensions before proceeding
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn('⚠️ Video dimensions not ready:', video.videoWidth, 'x', video.videoHeight);
        resolve(null);
        return;
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('📹 Capturing face data:', canvas.width, 'x', canvas.height);
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 for face analysis
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Use Flask service for real-time face detection and matching
      console.log('🔍 Flask Detection Check:', {
        faceServiceOnline,
        hasStoredFaceData: !!storedFaceData,
        storedFaceDataType: typeof storedFaceData,
        storedFaceDataLength: storedFaceData?.length
      });

      if (faceServiceOnline && storedFaceData) {
        console.log('✅ Using REAL Flask face detection');
        performFlaskFaceDetection(imageData, canvas, video, resolve);
      } else {
        console.warn('⚠️ Using FAKE fallback detection because:', {
          faceServiceOnline,
          hasStoredFaceData: !!storedFaceData
        });
        // Fallback to self-contained detection
        const faceDetectionResult = performSelfContainedFaceDetection(imageData, canvas, video);
        
        console.log('🔍 Self-contained face detection result:', faceDetectionResult);
        
        setFaceDetection({
          detected: faceDetectionResult.detected,
          confidence: faceDetectionResult.confidence,
          confidenceLabel: faceDetectionResult.confidence > 0.7 ? 'HIGH' : faceDetectionResult.confidence > 0.4 ? 'MEDIUM' : 'LOW',
          verified: faceDetectionResult.verified,
          boundingBox: faceDetectionResult.boundingBox
        });

        // NOTE: Drawing now handled by continuous tracking loop
        // drawFaceBoundingBox(faceDetectionResult.verified, faceDetectionResult.confidence);

        resolve({
          similarity: faceDetectionResult.confidence,
          confidence: faceDetectionResult.confidence > 0.7 ? 'HIGH' : faceDetectionResult.confidence > 0.4 ? 'MEDIUM' : 'LOW',
          verified: faceDetectionResult.verified,
          imageData: imageData,
          timestamp: Date.now()
        });
      }
    });
  };

  const performFlaskFaceDetection = async (imageData, canvas, video, resolve) => {
    try {
      console.log('� STARTING REAL Flask face detection...');
      console.log('📹 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      console.log('🖼️ Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('🔑 Image data length:', imageData?.length);

      // Convert base64 imageData to blob exactly like verification test page
      console.log('📦 Converting image data to blob...');
      const response = await fetch(imageData);
      const imageBlob = await response.blob();
      console.log('✅ Blob created:', imageBlob.size, 'bytes, type:', imageBlob.type);

      // Create FormData exactly like verification test page
      const formData = new FormData();
      formData.append('testImage', imageBlob, 'realtime-verification.jpg');
      console.log('✅ FormData created with testImage field');

      console.log('📤 Calling /api/verification/verify-face (SAME as test page)...');

      // Call the EXACT same API endpoint as verification test page
      const verifyResponse = await fetch('/api/verification/verify-face', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      console.log('📥 Response received, status:', verifyResponse.status, verifyResponse.statusText);

      if (!verifyResponse.ok) {
        throw new Error(`API returned ${verifyResponse.status}: ${verifyResponse.statusText}`);
      }

      const verifyResult = await verifyResponse.json();
      console.log('✅ REAL Flask face verification result:', verifyResult);

      // Use exact same response structure as verification test page
      let similarity, confidenceLabel, verified;

      if (verifyResult.success) {
        similarity = verifyResult.similarity || 0;
        confidenceLabel = verifyResult.confidence || 'UNKNOWN';
        verified = verifyResult.verified || false;

        console.log('✅ REAL verification successful (same as test page):', {
          similarity,
          confidenceLabel,
          verified,
          result: verifyResult.result
        });
      } else {
        similarity = 0;
        confidenceLabel = 'ERROR';
        verified = false;

        console.warn('❌ REAL verification failed (same as test page):', verifyResult.error);
      }

      const parseBbox = (bboxArray) => {
        if (!Array.isArray(bboxArray) || bboxArray.length < 4) return null;
        const [x1, y1, x2, y2] = bboxArray;
        const x = Math.max(0, Math.min(x1, x2));
        const y = Math.max(0, Math.min(y1, y2));
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        if (width === 0 || height === 0) return null;
        return { x, y, width, height };
      };

      const detected = [];
      if (Array.isArray(verifyResult.detected_faces)) {
        verifyResult.detected_faces.forEach((face) => {
          const parsed = parseBbox(face);
          if (parsed) detected.push(parsed);
        });
      }

      if (detected.length === 0) {
        const primary = parseBbox(verifyResult.face2_bbox || verifyResult.face1_bbox);
        if (primary) {
          detected.push(primary);
        }
      }

      if (detected.length === 0) {
        console.warn('⚠️ Flask verification returned no bounding boxes; using fallback box');
        detected.push({
          x: canvas.width * 0.25,
          y: canvas.height * 0.2,
          width: canvas.width * 0.5,
          height: canvas.height * 0.6
        });
      }

      setDetectedFaces(detected);

      setRealTimeFaceMatch({
        verified: verified,
        similarity,
        confidenceLabel,
        result: verifyResult.result || 'UNKNOWN',
        details: verifyResult.details || '',
        timestamp: Date.now(),
        raw: verifyResult
      });

      setFaceDetection({
        detected: detected.length > 0,
        confidence: similarity,
        confidenceLabel,
        verified: verified,
        boundingBox: detected[0]
      });

      // Only draw bounding boxes here if continuous tracking is not active
      // Continuous tracking handles its own drawing to avoid conflicts
      if (!isRealTimeTracking) {
        drawFlaskFaceBoundingBoxes(detected, {
          verified: verified,
          similarity,
          confidenceLabel
        });
      }

      resolve({
        similarity,
        confidence: confidenceLabel,
        verified: verified,
        imageData,
        timestamp: Date.now(),
        detectedFaces: detected,
        matchResult: verifyResult
      });
    } catch (error) {
      console.error('❌ Flask face detection FAILED - using fake fallback:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Mark that Flask detection failed
      const fallbackResult = performSelfContainedFaceDetection(imageData, canvas, video);
      fallbackResult.method = 'FAKE_FALLBACK_FLASK_FAILED';
      fallbackResult.error = error.message;

      console.warn('⚠️ USING FAKE DETECTION - Flask service failed!', fallbackResult);

      setFaceDetection({
        detected: fallbackResult.detected,
        confidence: fallbackResult.confidence,
        confidenceLabel: 'FAKE_FALLBACK',
        verified: false, // Don't trust fallback verification
        boundingBox: fallbackResult.boundingBox
      });

      // NOTE: Drawing now handled by continuous tracking loop
      // drawFaceBoundingBox(false, 0);

      resolve({
        similarity: 0,
        confidence: 'FAKE_FALLBACK',
        verified: false,
        imageData,
        timestamp: Date.now(),
        error: 'Flask detection failed',
        fallback: true
      });
    }
  };

  // Self-contained face detection using basic computer vision techniques
  const performSelfContainedFaceDetection = (imageData, canvas, video) => {
    try {
      console.log('🔍 Starting self-contained face detection...');

      if (!canvas || !video) {
        console.warn('⚠️ Missing canvas or video for face detection');
        return {
          detected: true,
          confidence: 0.7,
          verified: true,
          boundingBox: null,
          method: 'fallback-no-canvas'
        };
      }

      const ctx = canvas.getContext('2d');
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;

      console.log('📊 Image data:', { width: canvas.width, height: canvas.height, dataLength: data.length });

      // Simple presence detection - if there's image data, assume face is present
      let totalPixels = 0;
      let brightPixels = 0;
      let colorVariance = 0;
      let averageBrightness = 0;

      // Sample every 4th pixel for performance
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r !== undefined && g !== undefined && b !== undefined) {
          const brightness = (r + g + b) / 3;
          averageBrightness += brightness;

          if (brightness > 30) brightPixels++; // Not completely dark

          // Calculate color variance as a proxy for detail
          const variance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
          colorVariance += variance;

          totalPixels++;
        }
      }

      if (totalPixels === 0) {
        console.warn('⚠️ No valid pixel data found');
        return {
          detected: true,
          confidence: 0.6,
          verified: false,
          boundingBox: null,
          method: 'fallback-no-data'
        };
      }

      averageBrightness /= totalPixels;
      const brightPixelRatio = brightPixels / totalPixels;
      const averageColorVariance = colorVariance / totalPixels;

      // More generous detection algorithm
      let confidence = 0.5; // Base confidence

      // Boost for reasonable brightness (not too dark, not blown out)
      if (averageBrightness > 20 && averageBrightness < 240) {
        confidence += 0.3;
      }

      // Boost for image detail (color variance)
      if (averageColorVariance > 10) {
        confidence += 0.2;
      }

      // Boost for non-black image
      if (brightPixelRatio > 0.1) {
        confidence += 0.2;
      }

      // Cap confidence
      confidence = Math.min(confidence, 1.0);

      const verified = confidence > 0.7;
      const detected = confidence > 0.4;

      console.log('🎯 Enhanced face detection metrics:', {
        averageBrightness: averageBrightness.toFixed(1),
        brightPixelRatio: brightPixelRatio.toFixed(3),
        averageColorVariance: averageColorVariance.toFixed(1),
        confidence: confidence.toFixed(2),
        detected,
        verified
      });

      return {
        detected,
        confidence,
        verified,
        boundingBox: {
          x: canvas.width * 0.25,
          y: canvas.height * 0.2,
          width: canvas.width * 0.5,
          height: canvas.height * 0.6
        },
        method: 'enhanced-detection'
      };

    } catch (error) {
      console.error('Self-contained face detection error:', error);

      // Always return positive detection as fallback
      return {
        detected: true,
        confidence: 0.8,
        verified: true,
        boundingBox: null,
        method: 'error-fallback'
      };
    }
  };

  // Calculate difference between frames for movement detection
  const calculateFrameDifference = (currentData, previousData) => {
    let difference = 0;
    const sampleRate = 100; // Sample every 100th pixel for performance

    for (let i = 0; i < currentData.length; i += 4 * sampleRate) {
      const currentBrightness = (currentData[i] + currentData[i + 1] + currentData[i + 2]) / 3;
      const previousBrightness = (previousData[i] + previousData[i + 1] + previousData[i + 2]) / 3;
      difference += Math.abs(currentBrightness - previousBrightness);
    }

    return difference / (currentData.length / (4 * sampleRate));
  };

  const drawFlaskFaceBoundingBoxes = (faces, meta) => {
    const { verified, similarity, confidenceLabel } = meta;
    if (!overlayCanvasRef.current || !videoRef.current) {
      console.warn('⚠️ Cannot draw Flask bounding boxes - missing canvas or video reference');
      return;
    }

    const overlay = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = overlay.getContext('2d');

    // Set canvas dimensions to match video
    overlay.width = video.videoWidth || video.getBoundingClientRect().width;
    overlay.height = video.videoHeight || video.getBoundingClientRect().height;

    console.log('🎨 Drawing Flask bounding boxes:', {
      faceCount: faces?.length || 0,
      canvasSize: `${overlay.width}x${overlay.height}`,
      videoSize: `${video.videoWidth}x${video.videoHeight}`,
      verified,
      similarity,
      confidenceLabel
    });

    // Clear previous drawings
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // If no faces, draw a test indicator to verify canvas is working
    if (!faces || faces.length === 0) {
      console.log('🔴 No faces detected - drawing test indicator');
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 100, 30);
      ctx.fillStyle = '#FF0000';
      ctx.font = '14px Arial';
      ctx.fillText('No Face Detected', 15, 30);
      return;
    }

    faces.forEach((face, index) => {
      const { x, y, width, height } = face;
      
      console.log(`🎯 Drawing face ${index + 1}:`, { x, y, width, height });
      
      // Choose color based on verification status for the primary face
      const isPrimaryFace = index === 0;
      const color = isPrimaryFace && verified ? '#2563EB' : '#EF4444'; // Blue for verified, red for not verified

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Draw name label for primary face
      if (isPrimaryFace && userName) {
        const similarityPercent = typeof similarity === 'number' ? Math.round(similarity * 100) : null;
        const primaryLabel = verified ? `✓ ${userName}` : `${userName}${similarityPercent !== null ? ` (${similarityPercent}%)` : ''}`;
        const labelSuffix = confidenceLabel ? ` • ${confidenceLabel}` : '';
        const labelText = `${primaryLabel}${labelSuffix}`;
        const labelHeight = 30;
        const labelPadding = 10;

        // Measure text width
        ctx.font = '16px system-ui, -apple-system, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const labelWidth = textWidth + labelPadding * 2;

        // Draw label background
        ctx.fillStyle = color;
        ctx.fillRect(x, y - labelHeight - 5, labelWidth, labelHeight);

        // Draw label text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(labelText, x + labelPadding, y - 10);
      }

      // Draw confidence indicator for primary face
      if (isPrimaryFace) {
        const similarityPercent = typeof similarity === 'number' ? Math.round(similarity * 100) : null;
        const confidenceText = confidenceLabel
          ? `Confidence: ${confidenceLabel}${similarityPercent !== null ? ` • ${similarityPercent}%` : ''}`
          : similarityPercent !== null
            ? `Score: ${similarityPercent}%`
            : 'Confidence: N/A';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(confidenceText, x, y + height + 20);
      }

      // Draw face number for multiple faces
      if (faces.length > 1) {
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(`${index + 1}`, x + width - 20, y + 20);
      }
    });
  };

  // REAL-TIME continuous face detection
  const performRealTimeDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceServiceOnline || !storedFaceData) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Ensure video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capture current frame
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Convert to blob for API call
      const response = await fetch(imageData);
      const imageBlob = await response.blob();

      const formData = new FormData();
      formData.append('testImage', imageBlob, 'realtime.jpg');

      // Call Flask detection API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const verifyResponse = await fetch('/api/verification/verify-face', {
        method: 'POST',
        credentials: 'include',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (verifyResponse.ok) {
        const result = await verifyResponse.json();
        console.log('✅ Real-time detection result:', {
          verified: result.verified,
          similarity: result.similarity,
          hasBbox: !!result.bbox
        });

        // Parse bounding boxes like performFlaskFaceDetection does
        const parseBbox = (bboxArray) => {
          if (!Array.isArray(bboxArray) || bboxArray.length < 4) return null;
          const [x1, y1, x2, y2] = bboxArray;
          const x = Math.max(0, Math.min(x1, x2));
          const y = Math.max(0, Math.min(y1, y2));
          const width = Math.abs(x2 - x1);
          const height = Math.abs(y2 - y1);
          if (width === 0 || height === 0) return null;
          return { x, y, width, height };
        };

        const detected = [];
        if (Array.isArray(result.detected_faces)) {
          result.detected_faces.forEach((face) => {
            const parsed = parseBbox(face);
            if (parsed) detected.push(parsed);
          });
        }

        if (detected.length === 0) {
          const primary = parseBbox(result.face2_bbox || result.face1_bbox);
          if (primary) {
            detected.push(primary);
          }
        }

        if (detected.length === 0) {
          // Use fallback box
          detected.push({
            x: video.videoWidth * 0.25,
            y: video.videoHeight * 0.2,
            width: video.videoWidth * 0.5,
            height: video.videoHeight * 0.6
          });
        }

        // Update detected faces state
        setDetectedFaces(detected);

        // Draw bounding boxes using the same function as performFlaskFaceDetection
        drawFlaskFaceBoundingBoxes(detected, {
          verified: result.verified,
          similarity: result.similarity,
          confidenceLabel: result.confidence
        });

        // Update real-time match state
        setRealTimeFaceMatch({
          verified: result.verified,
          similarity: result.similarity,
          confidence: result.confidence,
          confidenceLabel: result.confidence,
          timestamp: Date.now(),
          raw: result
        });
      } else {
        console.warn('⚠️ Detection API failed');
        // Clear bounding boxes
        if (overlayCanvasRef.current) {
          const ctx = overlayCanvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Real-time detection error:', error);
      }
      // Don't clear box on timeout, just skip this frame
    }
  }, [faceServiceOnline, storedFaceData]);

  // Start REAL continuous face tracking
  const startContinuousFaceTracking = useCallback(() => {
    if (faceTrackingIntervalRef.current) {
      clearInterval(faceTrackingIntervalRef.current);
    }

    console.log('🚀 Starting REAL continuous face tracking (every 2s)...');
    setIsRealTimeTracking(true);

    // Check immediately
    performRealTimeDetection();

    // Then check every 2 seconds for continuous tracking
    faceTrackingIntervalRef.current = setInterval(() => {
      performRealTimeDetection();
    }, 2000);
  }, [performRealTimeDetection]);

  // Stop continuous face tracking
  const stopContinuousFaceTracking = useCallback(() => {
    if (faceTrackingIntervalRef.current) {
      clearInterval(faceTrackingIntervalRef.current);
      faceTrackingIntervalRef.current = null;

      // Clear the overlay canvas
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }

      setIsRealTimeTracking(false);
      console.log('⏹️ Stopped continuous face tracking');
    }
  }, []);

  // Start/stop continuous tracking based on monitoring state
  useEffect(() => {
    if (isActive && faceServiceOnline && storedFaceData) {
      console.log('✅ Conditions met, starting continuous tracking...');
      startContinuousFaceTracking();
    } else {
      console.log('⏹️ Conditions not met, stopping tracking...', {
        isActive,
        faceServiceOnline,
        hasStoredFaceData: !!storedFaceData
      });
      stopContinuousFaceTracking();
    }

    return () => {
      stopContinuousFaceTracking();
    };
  }, [isActive, faceServiceOnline, storedFaceData, startContinuousFaceTracking, stopContinuousFaceTracking]);

  const captureVoiceProfile = () => {
    if (!analyserRef.current) return null;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate voice characteristics
    const averageVolume = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const maxVolume = Math.max(...dataArray);
    const spectralCentroid = calculateSpectralCentroid(dataArray);

    return {
      averageVolume,
      maxVolume,
      spectralCentroid,
      timestamp: Date.now(),
      frequencyData: Array.from(dataArray)
    };
  };

  const detectClothingChange = (imageData) => {
    if (!clothingBaselineRef.current) {
      // Establish baseline clothing colors from chest area
      const baselineColors = extractClothingColors(imageData);
      clothingBaselineRef.current = baselineColors;
      return { detected: false, type: 'baseline_established' };
    }

    const currentColors = extractClothingColors(imageData);
    const baselineColors = clothingBaselineRef.current;

    // Calculate color difference
    const colorDiff = calculateColorDifference(baselineColors, currentColors);

    if (colorDiff > 30) { // Significant color change threshold
      console.warn('🚨 Clothing change detected:', { colorDiff });
      setClothingAnomaly({
        detected: true,
        type: 'clothing_change',
        severity: 'high',
        data: {
          colorDifference: colorDiff,
          timestamp: Date.now()
        }
      });

      return {
        detected: true,
        type: 'clothing_change',
        severity: 'high',
        data: {
          colorDifference: colorDiff,
          baselineColors,
          currentColors,
          timestamp: Date.now()
        }
      };
    }

    setClothingAnomaly(null);
    return { detected: false, type: 'normal' };
  };

  const extractClothingColors = (imageData) => {
    // Extract colors from chest/upper body area (roughly center-bottom of frame)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Sample chest area (center 40% width, bottom 30% height)
        const chestX = Math.floor(canvas.width * 0.3);
        const chestY = Math.floor(canvas.height * 0.4);
        const chestWidth = Math.floor(canvas.width * 0.4);
        const chestHeight = Math.floor(canvas.height * 0.3);
        
        const imageData = ctx.getImageData(chestX, chestY, chestWidth, chestHeight);
        const data = imageData.data;
        
        let totalR = 0, totalG = 0, totalB = 0;
        let pixelCount = 0;
        
        // Sample every 10th pixel for performance
        for (let i = 0; i < data.length; i += 40) {
          totalR += data[i];
          totalG += data[i + 1];
          totalB += data[i + 2];
          pixelCount++;
        }
        
        resolve({
          r: Math.round(totalR / pixelCount),
          g: Math.round(totalG / pixelCount),
          b: Math.round(totalB / pixelCount)
        });
      };
      
      img.src = imageData;
    });
  };

  const calculateColorDifference = (color1, color2) => {
    // Calculate Euclidean distance in RGB space
    const rDiff = color1.r - color2.r;
    const gDiff = color1.g - color2.g;
    const bDiff = color1.b - color2.b;
    
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  };

  const detectFaceAnomaly = (currentFaceData) => {
    if (!currentFaceData || !baselineDataRef.current?.face) {
      return { detected: false, type: 'no_data' };
    }

    // If we have recent Flask verification and it's verified, don't check traditional anomalies
    if (realTimeFaceMatch && realTimeFaceMatch.verified && Date.now() - realTimeFaceMatch.timestamp < 5000) {
      return { detected: false, type: 'flask_verified' };
    }

    const baseline = baselineDataRef.current.face;
    const similarityThreshold = 0.6; // Threshold for same person

    // Face verification anomaly
    if (currentFaceData.similarity < similarityThreshold) {
      console.log('🚨 Face anomaly detected: Different person or face not detected');
      return {
        detected: true,
        type: 'person_switch',
        severity: 'high',
        data: {
          currentSimilarity: currentFaceData.similarity,
          threshold: similarityThreshold,
          confidence: currentFaceData.confidence
        }
      };
    }

    // Face quality anomaly
    if (currentFaceData.confidence === 'LOW') {
      return {
        detected: true,
        type: 'face_quality_low',
        severity: 'medium',
        data: { confidence: currentFaceData.confidence }
      };
    }

    return { detected: false, type: 'normal' };
  };

  const detectVoiceAnomaly = (currentVoiceData) => {
    if (!currentVoiceData || !voiceBaselineRef.current) {
      // Set initial baseline if not set
      if (currentVoiceData && !voiceBaselineRef.current) {
        voiceBaselineRef.current = currentVoiceData;
      }
      return { detected: false, type: 'no_baseline' };
    }

    const baseline = voiceBaselineRef.current;

    // Volume change anomaly
    const volumeChange = Math.abs(currentVoiceData.averageVolume - baseline.averageVolume);
    if (volumeChange > 50) { // Significant volume change
      return {
        detected: true,
        type: 'volume_change',
        severity: 'medium',
        data: {
          currentVolume: currentVoiceData.averageVolume,
          baselineVolume: baseline.averageVolume,
          change: volumeChange
        }
      };
    }

    // Spectral change anomaly (voice characteristics change)
    const spectralChange = Math.abs(currentVoiceData.spectralCentroid - baseline.spectralCentroid);
    if (spectralChange > 20) {
      return {
        detected: true,
        type: 'voice_characteristics_change',
        severity: 'high',
        data: {
          currentSpectral: currentVoiceData.spectralCentroid,
          baselineSpectral: baseline.spectralCentroid,
          change: spectralChange
        }
      };
    }

    return { detected: false, type: 'normal' };
  };

  const detectEnvironmentChange = () => {
    // Simple environment change detection based on lighting/background
    if (!videoRef.current || !lastFrameDataRef.current) {
      // Store current frame for next comparison
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100; // Small size for efficiency
        canvas.height = 75;
        ctx.drawImage(videoRef.current, 0, 0, 100, 75);
        lastFrameDataRef.current = ctx.getImageData(0, 0, 100, 75);
      }
      return { detected: false, type: 'no_baseline' };
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 100;
    canvas.height = 75;
    ctx.drawImage(videoRef.current, 0, 0, 100, 75);
    const currentFrame = ctx.getImageData(0, 0, 100, 75);

    // Calculate pixel difference
    let totalDiff = 0;
    for (let i = 0; i < currentFrame.data.length; i += 4) {
      const rDiff = Math.abs(currentFrame.data[i] - lastFrameDataRef.current.data[i]);
      const gDiff = Math.abs(currentFrame.data[i + 1] - lastFrameDataRef.current.data[i + 1]);
      const bDiff = Math.abs(currentFrame.data[i + 2] - lastFrameDataRef.current.data[i + 2]);
      totalDiff += (rDiff + gDiff + bDiff) / 3;
    }

    const avgDiff = totalDiff / (currentFrame.data.length / 4);
    lastFrameDataRef.current = currentFrame;

    if (avgDiff > 30) { // Significant environment change
      return {
        detected: true,
        type: 'environment_change',
        severity: 'medium',
        data: { averageDifference: avgDiff }
      };
    }

    return { detected: false, type: 'normal' };
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const updateAnomalyData = useCallback((faceAnomaly, voiceAnomaly, environmentAnomaly, clothingAnomaly = null) => {
    // Check if we have required data
    if (!userId || !jobId) {
      console.warn('⚠️ Missing userId or jobId for anomaly detection:', { userId: !!userId, jobId: !!jobId });
      return;
    }

    // Professional anomaly detection with debouncing
    const now = Date.now();
    const timeSinceLastAnomaly = now - (lastAnomalyTimeRef.current || 0);

    if (timeSinceLastAnomaly < 1000) { // 1 second debounce for performance
      console.log('🕰️ Debouncing rapid anomaly detection - maintaining system stability');
      return;
    }

    lastAnomalyTimeRef.current = now;

    // Create comprehensive anomaly report
    const anomalyReport = {
      timestamp: now,
      sessionId: `${userId}-${jobId}-${Date.now()}`,
      userId,
      jobId,
      userName,
      anomalyTypes: [],
      redFlags: [],
      severity: 'low'
    };

    // Professional anomaly categorization and red flag detection
    if (faceAnomaly.detected) {
      anomalyReport.anomalyTypes.push('face');

      if (faceAnomaly.type === 'person_switch' || faceAnomaly.type === 'multiple_faces_detected') {
        anomalyReport.redFlags.push({
          type: 'IDENTITY_FRAUD_SUSPECTED',
          details: faceAnomaly.type === 'person_switch' ? 'Different person detected during interview' : 'Multiple people in camera view',
          severity: 'CRITICAL',
          timestamp: now,
          data: faceAnomaly.data
        });
        anomalyReport.severity = 'critical';
        console.log('🚨 CRITICAL SECURITY ALERT: Potential identity fraud detected');
      } else if (faceAnomaly.type === 'flask_face_verification_failed') {
        anomalyReport.redFlags.push({
          type: 'FACE_VERIFICATION_FAILED',
          details: `Face verification failed with similarity ${faceAnomaly.data?.flaskSimilarity || 'unknown'}`,
          severity: 'HIGH',
          timestamp: now,
          data: faceAnomaly.data
        });
        anomalyReport.severity = anomalyReport.severity === 'critical' ? 'critical' : 'high';
      }
    }

    if (voiceAnomaly.detected) {
      anomalyReport.anomalyTypes.push('voice');

      if (voiceAnomaly.type === 'flask_voice_verification_failed') {
        anomalyReport.redFlags.push({
          type: 'VOICE_VERIFICATION_FAILED',
          details: `Voice verification failed with score ${voiceAnomaly.data?.ensembleScore || 'unknown'}`,
          severity: 'HIGH',
          timestamp: now,
          data: voiceAnomaly.data
        });
        anomalyReport.severity = anomalyReport.severity === 'critical' ? 'critical' : 'high';
      } else if (voiceAnomaly.type === 'voice_characteristics_change') {
        anomalyReport.redFlags.push({
          type: 'VOICE_PATTERN_ANOMALY',
          details: 'Significant change in voice characteristics detected',
          severity: 'MEDIUM',
          timestamp: now,
          data: voiceAnomaly.data
        });
        anomalyReport.severity = anomalyReport.severity === 'critical' || anomalyReport.severity === 'high' ? anomalyReport.severity : 'medium';
      }
    }

    if (environmentAnomaly.detected) {
      anomalyReport.anomalyTypes.push('environment');
      anomalyReport.redFlags.push({
        type: 'ENVIRONMENT_CHANGE',
        details: 'Significant environmental change detected (potential location switch)',
        severity: 'LOW',
        timestamp: now,
        data: environmentAnomaly.data
      });
    }

    if (clothingAnomaly?.detected) {
      anomalyReport.anomalyTypes.push('appearance');
      anomalyReport.redFlags.push({
        type: 'APPEARANCE_CHANGE',
        details: 'Clothing change detected during interview',
        severity: 'LOW',
        timestamp: now,
        data: clothingAnomaly.data
      });
    }

    setMonitoringData(prev => {
      const updated = { ...prev };

      // Update counters
      if (faceAnomaly.detected) {
        if (faceAnomaly.type === 'person_switch') {
          updated.personSwitches += 1;
        } else {
          updated.faceDeviations += 1;
        }
      }

      if (voiceAnomaly.detected) {
        updated.voiceAnomalies += 1;
      }

      if (environmentAnomaly.detected) {
        updated.environmentChanges += 1;
      }

      if (clothingAnomaly?.detected) {
        updated.clothingChanges = (updated.clothingChanges || 0) + 1;
      }

      // Add to cumulative red flags
      updated.totalRedFlags = (updated.totalRedFlags || 0) + anomalyReport.redFlags.length;
      updated.criticalAlerts = (updated.criticalAlerts || 0) + (anomalyReport.severity === 'critical' ? 1 : 0);

      // Enhanced anomaly report with all context
      const fullAnomalyReport = {
        ...anomalyReport,
        faceAnomaly: faceAnomaly.detected ? faceAnomaly : null,
        voiceAnomaly: voiceAnomaly.detected ? voiceAnomaly : null,
        environmentAnomaly: environmentAnomaly.detected ? environmentAnomaly : null,
        clothingAnomaly: clothingAnomaly?.detected ? clothingAnomaly : null,
        cumulativeData: updated,
        realTimeFaceMatch,
        realTimeVoiceMatch,
        faceServiceStatus: faceServiceOnline,
        voiceServiceStatus: voiceServiceOnline
      };

      // Professional logging for HR review
      if (anomalyReport.redFlags && anomalyReport.redFlags.length > 0) {
        console.log('📋 PROFESSIONAL MONITORING LOG:', {
          timestamp: new Date(now).toISOString(),
          candidateName: userName,
          jobId,
          anomalyCount: anomalyReport.redFlags.length,
          severity: anomalyReport.severity,
          redFlags: anomalyReport.redFlags.map(flag => `${flag.type}: ${flag.details}`),
          interviewContinues: true, // Interview never stops
          note: 'All anomalies logged for HR review - candidate unaware'
        });
      }

      // Send to parent and backend without interrupting interview
      setTimeout(() => {
        onAnomalyDetected(fullAnomalyReport);
        storeAnomalyData(fullAnomalyReport);
      }, 0);

      return updated;
    });
  }, [userId, jobId, onAnomalyDetected]);

  const storeAnomalyData = async (anomalyData) => {
    try {
      await fetch('/api/interview/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(anomalyData)
      });
    } catch (error) {
      console.error('❌ Failed to store anomaly data:', error);
    }
  };

  const stopMonitoring = () => {
    console.log('🛑 Stopping interview monitoring...');

    monitoringLoopRunningRef.current = false;
    voiceProcessingRef.current = false;

    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop Flask audio recording
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      try {
        audioRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping audio recorder:', e);
      }
      audioRecorderRef.current = null;
    }

    // Reset refs
    baselineDataRef.current = null;
    lastFrameDataRef.current = null;
    voiceBaselineRef.current = null;
    
    // Reset Flask-related states
    setDetectedFaces([]);
    setRealTimeFaceMatch(null);
    setRealTimeVoiceMatch(null);
    setFaceServiceOnline(false);
    setVoiceServiceOnline(false);
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Live camera feed - Enhanced Size */}
      <div className="bg-white rounded-lg shadow-lg p-4 w-80">
        <div className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            Real-time Monitoring
          </div>
          <div className="text-xs text-gray-500">
            {realTimeFaceMatch?.verified && realTimeVoiceMatch?.verified ? '✅ Verified' : '🔍 Checking...'}
          </div>
        </div>

        {/* Enhanced Video feed - Bigger for better visibility */}
        <div className="relative mb-3">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-48 bg-gray-900 rounded-lg object-cover border-2"
            style={{
              maxWidth: '100%',
              height: '192px',
              backgroundColor: '#111827',
              border: `3px solid ${realTimeFaceMatch?.verified ? '#2563EB' : '#EF4444'}`,
              display: 'block'
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Overlay canvas for face detection bounding boxes */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute top-0 left-0 pointer-events-none rounded"
            style={{ 
              zIndex: 10, 
              width: '100%', 
              height: '128px'
            }}
          />

          {/* Enhanced Status overlay */}
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-80 text-white text-xs px-3 py-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${cameraStream ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span>Live Feed</span>
            </div>
          </div>

          {/* Enhanced System Status */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-80 text-white text-xs px-3 py-2 rounded-lg">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${faceServiceOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>Face AI</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${voiceServiceOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>Voice AI</span>
              </div>
            </div>
          </div>

          {/* Professional Verification Status */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg">
            <div className="flex flex-col space-y-1 text-right">
              {realTimeFaceMatch && (
                <div className={`flex items-center justify-end space-x-2 ${
                  realTimeFaceMatch.verified ? 'text-green-300' : 'text-red-300'
                }`}>
                  <span>Face</span>
                  <div className={`w-2 h-2 rounded-full ${
                    realTimeFaceMatch.verified ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                  }`}></div>
                </div>
              )}
              {realTimeVoiceMatch && (
                <div className={`flex items-center justify-end space-x-2 ${
                  realTimeVoiceMatch.verified ? 'text-green-300' : 'text-red-300'
                }`}>
                  <span>Voice</span>
                  <div className={`w-2 h-2 rounded-full ${
                    realTimeVoiceMatch.verified ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                  }`}></div>
                </div>
              )}
            </div>
          </div>

          {/* Security Alert Overlay */}
          {(!realTimeFaceMatch?.verified || !realTimeVoiceMatch?.verified) && (realTimeFaceMatch || realTimeVoiceMatch) && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-20 rounded-lg">
              <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm animate-pulse">
                ⚠️ IDENTITY VERIFICATION REQUIRED
              </div>
            </div>
          )}
        </div>

        {/* Professional Voice Analysis with Real-time Status */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Voice Analysis</span>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                realTimeVoiceMatch?.verified
                  ? 'bg-blue-500'
                  : voiceAnomaly?.detected
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}></div>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${
              realTimeVoiceMatch?.verified
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : voiceAnomaly?.detected
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-yellow-50 text-yellow-800 border-yellow-200'
            }`}>
              {realTimeVoiceMatch?.verified ? '✓ AUTHORIZED' : voiceAnomaly?.detected ? '⚠️ ANOMALY' : '🔍 SCANNING'}
            </div>
          </div>

          <canvas
            ref={audioCanvasRef}
            width={320}
            height={60}
            className={`w-full h-15 rounded-lg border-3 shadow-lg transition-all duration-300 ${
              realTimeVoiceMatch?.verified
                ? 'border-blue-400 shadow-blue-200'
                : voiceAnomaly?.detected
                  ? 'border-red-400 shadow-red-200 animate-pulse'
                  : 'border-yellow-400 shadow-yellow-200'
            }`}
          />

          {/* Professional Voice Status Details */}
          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <div className={`px-2 py-1 rounded font-medium ${
                audioLevel > 0.1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {audioLevel > 0.1 ? '🎤 SPEAKING' : '🔇 QUIET'}
              </div>

              {realTimeVoiceMatch && (
                <div className={`px-2 py-1 rounded font-medium ${
                  realTimeVoiceMatch.verified ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  Match: {Math.round((realTimeVoiceMatch.score || 0) * 100)}%
                </div>
              )}
            </div>

            <div className="text-gray-500 font-mono">
              {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Enhanced Anomaly Alert */}
          {voiceAnomaly?.detected && (
            <div className="mt-2 bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">⚠</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    Voice Security Alert
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {voiceAnomaly.type.replace(/_/g, ' ').toUpperCase()} - Severity: {voiceAnomaly.severity?.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Monitoring stats (hidden from user, for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-500">
            <div>Faces Detected: {monitoringData.faceDetections}</div>
            <div>Face Matches: {monitoringData.faceMatches}</div>
            <div>Voice Matches: {monitoringData.voiceMatches}</div>
            <div>Anomalies: {monitoringData.anomalies}</div>
            <div>Env Changes: {monitoringData.environmentChanges}</div>
            
            {/* Manual start button */}
            <button 
              onClick={() => {
                console.log('🧪 Manual monitoring start triggered');
                startMonitoring();
              }}
              className="mt-1 w-full bg-green-500 text-white text-xs py-1 px-2 rounded hover:bg-green-600"
            >
              Start Monitoring Manually
            </button>
            
            {/* Manual test button */}
            <button 
              onClick={async () => {
                console.log('🧪 Manual face detection test triggered');
                if (captureFaceData) {
                  await captureFaceData();
                } else {
                  console.warn('captureFaceData function not available');
                }
              }}
              className="mt-1 w-full bg-blue-500 text-white text-xs py-1 px-2 rounded hover:bg-blue-600"
            >
              Test Face Detection
            </button>
            
            <div className="mt-1 pt-1 border-t border-gray-300">
              <div>Face Service: {faceServiceOnline ? 'Online' : 'Offline'}</div>
              <div>Voice Service: {voiceServiceOnline ? 'Online' : 'Offline'}</div>
              <div>Detected Faces: {detectedFaces.length}</div>
              {realTimeFaceMatch && (
                <div>Face Verify: {realTimeFaceMatch.verified ? 'PASS' : 'FAIL'} ({realTimeFaceMatch.confidenceLabel || 'N/A'})</div>
              )}
              {realTimeVoiceMatch && (
                <div>Voice Verify: {realTimeVoiceMatch.verified ? 'PASS' : 'FAIL'} ({realTimeVoiceMatch.confidenceLabel || 'N/A'})</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}