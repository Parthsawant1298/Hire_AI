"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PreInterviewVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const assistantId = searchParams.get('assistant');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const [step, setStep] = useState(0); // 0: Loading, 1: Face, 2: Voice, 3: Success, 4: Failed
  const [user, setUser] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [verificationText, setVerificationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  
  const [faceResult, setFaceResult] = useState(null);
  const [voiceResult, setVoiceResult] = useState(null);

  // Check authentication and setup status
  useEffect(() => {
    checkAuthAndSetup();
  }, []);

  const checkAuthAndSetup = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });

      if (!response.ok) {
        router.push(`/login?redirect=/verification/pre-interview?jobId=${jobId}&assistant=${assistantId}`);
        return;
      }

      const data = await response.json();
      setUser(data.user);

      if (!data.user.verificationSetupCompleted) {
        router.push(`/verification/setup?redirect=/verification/pre-interview?jobId=${jobId}&assistant=${assistantId}`);
        return;
      }

      // Generate verification text
      const textResponse = await fetch('/api/verification/generate-text', {
        method: 'POST',
        credentials: 'include'
      });
      const textData = await textResponse.json();
      setVerificationText(textData.text);

      setStep(1); // Start with face verification
    } catch (err) {
      setError('Failed to load verification page. Please try again.');
      console.error('Auth check error:', err);
    }
  };

  // STEP 1: CAPTURE AND VERIFY FACE
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraStarted(true);
        setError('');
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraStarted(false);
    }
  };

  const captureAndVerifyFace = async () => {
    setLoading(true);
    setError('');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!video || !canvas) {
        setError('Video or canvas element not ready');
        return;
      }

      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);

      // Verify face
      const response = await fetch('/api/verification/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ testImageBase64: imageDataUrl })
      });

      const result = await response.json();
      setFaceResult(result);

      if (result.verified) {
        stopCamera();
        setStep(2); // Move to voice verification
      } else {
        setError(`Face verification failed. Match: ${(result.similarity * 100).toFixed(1)}% (Required: 60%). Please try again.`);
        setCapturedImage(null);
      }
    } catch (err) {
      setError('Face verification error. Please try again.');
      console.error('Face verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: RECORD AND VERIFY VOICE
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      setError('');

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && recording) {
          stopVoiceRecording();
        }
      }, 10000);
    } catch (err) {
      setError('Failed to access microphone. Please ensure microphone permissions are granted.');
      console.error('Microphone error:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const verifyVoice = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate recorded audio
      if (!recordedAudio) {
        setError('No voice recording found. Please record your voice first.');
        setLoading(false);
        return;
      }

      // Check audio size (should be at least 10KB for a few seconds of audio)
      if (recordedAudio.size < 10000) {
        setError('Voice recording too short. Please speak for at least 3-5 seconds.');
        setRecordedAudio(null);
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('testAudio', recordedAudio, 'test-voice.webm');

      const response = await fetch('/api/verification/verify-voice', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      console.log('Voice verification response status:', response.status);

      const result = await response.json();
      console.log('Voice verification result:', result);
      setVoiceResult(result);

      if (result.verified) {
        setStep(3); // Success - redirect to interview
        setTimeout(() => {
          router.push(`/interview/${jobId}?assistant=${assistantId}&verified=true`);
        }, 3000);
      } else {
        // Handle different error cases
        if (result.error) {
          setError(`Voice verification failed: ${result.error}. Please try again.`);
        } else if (isNaN(result.similarity)) {
          setError('Voice verification failed: Unable to process audio. Please ensure you speak clearly and try again.');
        } else {
          setError(`Voice verification failed. Match: ${(result.similarity * 100).toFixed(1)}% (Required: 50%). Please try again.`);
        }
        setRecordedAudio(null);
      }
    } catch (err) {
      setError('Voice verification error. Please try again.');
      console.error('Voice verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const retakeVoice = () => {
    setRecordedAudio(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (mediaRecorderRef.current && recording) {
        stopVoiceRecording();
      }
    };
  }, []);

  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🔒 Pre-Interview Verification</h1>
            <p className="text-gray-600">Verify your identity before starting the interview</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className="ml-2 font-medium">Face</span>
            </div>
            <div className={`w-16 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <span className="ml-2 font-medium">Voice</span>
            </div>
            <div className={`w-16 h-1 mx-4 ${step >= 3 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                {step >= 3 ? '✓' : '3'}
              </div>
              <span className="ml-2 font-medium">Done</span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* STEP 1: Face Verification */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📸 Face Verification</h2>
              <p className="text-gray-600 mb-6">Position your face clearly in the frame to verify your identity.</p>

              <div className="space-y-6">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraStarted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                      <button
                        onClick={startCamera}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                      >
                        Start Camera
                      </button>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {cameraStarted && (
                  <button
                    onClick={captureAndVerifyFace}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    {loading ? 'Verifying Face...' : '📸 Capture & Verify Face'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Voice Verification */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🎤 Voice Verification</h2>
              <p className="text-gray-600 mb-6">Read the text below clearly to verify your voice.</p>

              <div className="space-y-6">
                {faceResult && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <p className="text-green-700 font-medium">✓ Face verified! Match: {(faceResult.similarity * 100).toFixed(1)}%</p>
                  </div>
                )}

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-lg font-medium text-gray-800 leading-relaxed">
                    {verificationText || 'Loading verification text...'}
                  </p>
                </div>

                {!recordedAudio ? (
                  <div className="text-center">
                    {!recording ? (
                      <button
                        onClick={startVoiceRecording}
                        disabled={!verificationText}
                        className="bg-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400"
                      >
                        🎤 Start Recording
                      </button>
                    ) : (
                      <div>
                        <div className="mb-4">
                          <div className="inline-block animate-pulse bg-red-600 text-white px-6 py-3 rounded-lg font-semibold">
                            🔴 Recording... (Max 10 seconds)
                          </div>
                        </div>
                        <button
                          onClick={stopVoiceRecording}
                          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
                        >
                          ⏹️ Stop Recording
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                      <p className="text-green-700 font-medium">✓ Voice recorded successfully!</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={retakeVoice}
                        className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition"
                      >
                        🔄 Re-record
                      </button>
                      <button
                        onClick={verifyVoice}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
                      >
                        {loading ? 'Verifying Voice...' : '✓ Verify & Continue'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="inline-block bg-green-100 rounded-full p-6">
                  <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">✓ Verification Complete!</h2>
              {faceResult && voiceResult && (
                <div className="max-w-md mx-auto mb-6 space-y-2">
                  <p className="text-gray-600">✓ Face Match: {(faceResult.similarity * 100).toFixed(1)}%</p>
                  <p className="text-gray-600">✓ Voice Match: {(voiceResult.similarity * 100).toFixed(1)}%</p>
                </div>
              )}
              <p className="text-gray-600 mb-2">Your identity has been verified successfully.</p>
              <p className="text-gray-500">Redirecting to interview in 3 seconds...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PreInterviewVerification() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>}>
      <PreInterviewVerificationContent />
    </Suspense>
  );
}
