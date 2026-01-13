"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mic, Shield, CheckCircle, XCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';

export default function VerificationTest() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const [step, setStep] = useState(1); // 1: Face, 2: Voice
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [verificationText, setVerificationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [faceVerificationResult, setFaceVerificationResult] = useState(null);
  const [voiceVerificationResult, setVoiceVerificationResult] = useState(null);
  const [overallResult, setOverallResult] = useState(null);

  // Generate verification text when component mounts
  useEffect(() => {
    generateVerificationText();
  }, []);

  const generateVerificationText = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/api/verification/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'verification' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setVerificationText(data.text);
      } else {
        setError(data.message || 'Failed to generate verification text');
      }
    } catch (error) {
      console.error('Text generation error:', error);
      if (error.name === 'AbortError') {
        setError('Request timed out. Please refresh the page and try again.');
      } else {
        setError('Failed to generate verification text. Please refresh and try again.');
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    setFaceVerificationResult(null);
    startCamera();
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 30-second timer
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 29) {
            stopVoiceRecording();
            clearInterval(timer);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Microphone access error:', error);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retakeVoice = () => {
    setRecordedAudio(null);
    setVoiceVerificationResult(null);
    setRecordingTime(0);
  };

  const verifyFace = async () => {
    if (!capturedImage) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();

      // Convert base64 image to blob
      const imageResponse = await fetch(capturedImage);
      const imageBlob = await imageResponse.blob();
      formData.append('testImage', imageBlob, 'test-face.jpg');

      const response = await fetch('/api/verification/verify-face', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error('Empty response from server');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', text);
        throw new Error('Invalid JSON response from server');
      }

      setFaceVerificationResult(data);

      if (data.success && data.verified) {
        // Auto-proceed to voice step
        setTimeout(() => setStep(2), 1500);
      } else if (!data.success) {
        setError(data.message || 'Face verification failed');
      }

    } catch (error) {
      console.error('Face verification error:', error);
      setError('Failed to verify face. Please try again.');
      setFaceVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const verifyVoice = async () => {
    if (!recordedAudio) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('testAudio', recordedAudio, 'test-voice.wav');
      formData.append('textRead', verificationText);

      const response = await fetch('/api/verification/verify-voice', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error('Empty response from server');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('🎵 VOICE VERIFICATION RESULT:', {
        verified: data.verified,
        confidence: data.confidence,
        ensembleScore: data.ensembleScore,
        result: data.result,
        modelResults: data.modelResults,
        fullResponse: data
      });
      
      setVoiceVerificationResult(data);

      // Calculate overall result
      const faceVerified = faceVerificationResult?.verified || false;
      const voiceVerified = data.verified || false;

      setOverallResult({
        verified: faceVerified && voiceVerified,
        faceScore: faceVerificationResult?.similarity || 0,
        voiceScore: data.ensembleScore || 0, // Use ensembleScore (0-1 range)
        details: {
          face: faceVerificationResult,
          voice: data
        }
      });

      if (!data.success && data.message) {
        setError(data.message);
      }

    } catch (error) {
      console.error('Voice verification error:', error);
      setError('Failed to verify voice. Please try again.');
      setVoiceVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const proceedToInterview = () => {
    // Store verification success
    sessionStorage.setItem('verificationPassed', 'true');
    
    // Check if there's a return URL (interview link)
    const returnUrl = sessionStorage.getItem('returnToInterview');
    if (returnUrl) {
      sessionStorage.removeItem('returnToInterview');
      window.location.href = returnUrl; // Use window.location to ensure page refresh
    } else {
      // Default redirect to main page or dashboard
      router.push('/main');
    }
  };

  // Start camera when on face step
  useEffect(() => {
    if (step === 1 && !capturedImage) {
      startCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  // Auto-verify face when image is captured
  useEffect(() => {
    if (capturedImage && !faceVerificationResult && !loading) {
      verifyFace();
    }
  }, [capturedImage]);

  // Auto-verify voice when recording is done
  useEffect(() => {
    if (recordedAudio && !voiceVerificationResult && !loading && verificationText) {
      verifyVoice();
    }
  }, [recordedAudio, verificationText]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-purple-600 text-white p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-2xl font-bold">Identity Verification</h1>
                <p className="text-purple-100 mt-1">Verify your identity before starting the interview</p>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center mt-6 space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-white' : 'text-purple-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  faceVerificationResult?.verified ? 'bg-green-500' : 
                  faceVerificationResult ? 'bg-red-500' : 
                  step >= 1 ? 'bg-white text-purple-600' : 'bg-purple-500'
                }`}>
                  {faceVerificationResult?.verified ? <CheckCircle className="h-5 w-5" /> :
                   faceVerificationResult && !faceVerificationResult.verified ? <XCircle className="h-5 w-5" /> : '1'}
                </div>
                <span className="ml-2">Face Verification</span>
              </div>
              
              <div className="h-px bg-purple-400 flex-1"></div>
              
              <div className={`flex items-center ${step >= 2 ? 'text-white' : 'text-purple-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  voiceVerificationResult?.verified ? 'bg-green-500' : 
                  voiceVerificationResult ? 'bg-red-500' : 
                  step >= 2 ? 'bg-white text-purple-600' : 'bg-purple-500'
                }`}>
                  {voiceVerificationResult?.verified ? <CheckCircle className="h-5 w-5" /> :
                   voiceVerificationResult && !voiceVerificationResult.verified ? <XCircle className="h-5 w-5" /> : '2'}
                </div>
                <span className="ml-2">Voice Verification</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Step 1: Face Verification */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Face Verification</h2>
                  <p className="text-gray-600">Position your face in the center for verification</p>
                </div>

                <div className="flex justify-center">
                  <div className="relative">
                    {!capturedImage ? (
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-96 h-72 object-cover rounded-lg border-4 border-purple-200"
                        />
                        <div className="absolute inset-0 border-2 border-dashed border-purple-400 rounded-lg m-4 pointer-events-none"></div>
                      </div>
                    ) : (
                      <img
                        src={capturedImage}
                        alt="Captured face"
                        className={`w-96 h-72 object-cover rounded-lg border-4 ${
                          faceVerificationResult?.verified ? 'border-green-200' : 
                          faceVerificationResult ? 'border-red-200' : 'border-gray-200'
                        }`}
                      />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>

                {/* Face Verification Result */}
                {faceVerificationResult && (
                  <div className={`p-4 rounded-lg border ${
                    faceVerificationResult.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-center">
                      {faceVerificationResult.verified ? (
                        <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500 mr-2" />
                      )}
                      <span className={`font-semibold ${
                        faceVerificationResult.verified ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {faceVerificationResult.verified ? 'Face Verified Successfully!' : 'Face Verification Failed'}
                      </span>
                    </div>
                    <p className={`text-center mt-2 text-sm ${
                      faceVerificationResult.verified ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Similarity: {(faceVerificationResult.similarity * 100).toFixed(1)}%
                    </p>
                  </div>
                )}

                <div className="flex justify-center space-x-4">
                  {!capturedImage ? (
                    <button
                      onClick={captureImage}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Capture & Verify
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={retakeImage}
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center"
                      >
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Retake
                      </button>
                      {faceVerificationResult?.verified && (
                        <button
                          onClick={() => setStep(2)}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center"
                        >
                          Continue to Voice
                          <CheckCircle className="h-5 w-5 ml-2" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {loading && (
                  <div className="text-center">
                    <Loader className="h-6 w-6 text-purple-600 mx-auto animate-spin" />
                    <p className="text-gray-600 mt-2">Verifying face...</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Voice Verification */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Mic className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Voice Verification</h2>
                  <p className="text-gray-600">Read the following text clearly for verification</p>
                </div>

                {/* Text to Read */}
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h3 className="font-semibold text-gray-900 mb-3">Please read this text aloud:</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {verificationText || 'Loading verification text...'}
                  </p>
                </div>

                {/* Recording Interface */}
                <div className="text-center">
                  {!recordedAudio ? (
                    <div className="space-y-4">
                      {!isRecording ? (
                        <button
                          onClick={startVoiceRecording}
                          className="bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 flex items-center mx-auto"
                        >
                          <Mic className="h-6 w-6 mr-2" />
                          Start Recording (30s)
                        </button>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center space-x-4">
                            <div className="animate-pulse bg-red-500 w-4 h-4 rounded-full"></div>
                            <span className="text-lg font-semibold text-red-600">
                              Recording... {30 - recordingTime}s remaining
                            </span>
                          </div>
                          
                          <button
                            onClick={stopVoiceRecording}
                            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
                          >
                            Stop Recording
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Voice Verification Result */}
                      {voiceVerificationResult && (
                        <div className={`p-4 rounded-lg border ${
                          voiceVerificationResult.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-center">
                            {voiceVerificationResult.verified ? (
                              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                            ) : (
                              <XCircle className="h-6 w-6 text-red-500 mr-2" />
                            )}
                            <span className={`font-semibold ${
                              voiceVerificationResult.verified ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {voiceVerificationResult.verified ? 'Voice Verified Successfully!' : 'Voice Verification Failed'}
                            </span>
                          </div>
                          <p className={`text-center mt-2 text-sm ${
                            voiceVerificationResult.verified ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Confidence: {typeof voiceVerificationResult.confidence === 'number' ? 
                              (voiceVerificationResult.confidence * 100).toFixed(1) + '%' : 
                              voiceVerificationResult.confidence}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={retakeVoice}
                          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center"
                        >
                          <RefreshCw className="h-5 w-5 mr-2" />
                          Re-record
                        </button>
                        <button
                          onClick={() => setStep(1)}
                          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
                        >
                          Back to Face
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {loading && (
                  <div className="text-center">
                    <Loader className="h-6 w-6 text-purple-600 mx-auto animate-spin" />
                    <p className="text-gray-600 mt-2">Verifying voice...</p>
                  </div>
                )}
              </div>
            )}

            {/* Overall Result */}
            {overallResult && (
              <div className="mt-8 pt-6 border-t">
                <div className={`p-6 rounded-lg border-2 ${
                  overallResult.verified ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                }`}>
                  <div className="text-center">
                    {overallResult.verified ? (
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    ) : (
                      <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    )}
                    
                    <h3 className={`text-2xl font-bold mb-2 ${
                      overallResult.verified ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {overallResult.verified ? 'Verification Successful!' : 'Verification Failed'}
                    </h3>
                    
                    <p className={`mb-4 ${
                      overallResult.verified ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {overallResult.verified 
                        ? 'You can now proceed to the interview.' 
                        : 'Please retry verification or contact support.'
                      }
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Face Match</p>
                        <p className="text-lg font-semibold">{(overallResult.faceScore * 100).toFixed(1)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Voice Match</p>
                        <p className="text-lg font-semibold">{(overallResult.voiceScore * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    {overallResult.verified ? (
                      <button
                        onClick={proceedToInterview}
                        className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 flex items-center mx-auto"
                      >
                        <Shield className="h-5 w-5 mr-2" />
                        Proceed to Interview
                      </button>
                    ) : (
                      <div className="space-x-4">
                        <button
                          onClick={() => {
                            setStep(1);
                            setCapturedImage(null);
                            setRecordedAudio(null);
                            setFaceVerificationResult(null);
                            setVoiceVerificationResult(null);
                            setOverallResult(null);
                          }}
                          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center mx-auto"
                        >
                          <RefreshCw className="h-5 w-5 mr-2" />
                          Retry Verification
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
