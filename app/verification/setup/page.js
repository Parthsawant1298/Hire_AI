"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mic, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function VerificationSetup() {
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
  const [success, setSuccess] = useState(false);

  // Generate verification text when component mounts
  useEffect(() => {
    generateVerificationText();
  }, []);

  const generateVerificationText = async () => {
    try {
      const response = await fetch('/api/verification/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'profile' })
      });

      const data = await response.json();
      if (data.success) {
        setVerificationText(data.text);
      } else {
        setError('Failed to generate verification text');
      }
    } catch (error) {
      console.error('Text generation error:', error);
      setError('Failed to generate verification text');
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
    setRecordingTime(0);
  };

  const submitVerificationData = async () => {
    if (!capturedImage || !recordedAudio) {
      setError('Please complete both face and voice verification');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      
      // Convert base64 image to blob
      const imageResponse = await fetch(capturedImage);
      const imageBlob = await imageResponse.blob();
      formData.append('faceImage', imageBlob, 'face.jpg');
      
      // Add audio blob
      formData.append('voiceAudio', recordedAudio, 'voice.wav');
      formData.append('textRead', verificationText);

      const response = await fetch('/api/verification/upload-profile', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/profile');
        }, 2000);
      } else {
        setError(data.error || 'Failed to setup verification profile');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload verification data');
    } finally {
      setLoading(false);
    }
  };

  // Start camera when component mounts
  useEffect(() => {
    if (step === 1) {
      startCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Setup Complete!</h2>
          <p className="text-gray-600">Redirecting to your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">Setup Verification Profile</h1>
            <p className="text-blue-100 mt-2">Complete face and voice verification for secure interviews</p>
            
            {/* Progress Steps */}
            <div className="flex items-center mt-6 space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-white' : 'text-blue-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-white text-blue-600' : 'bg-blue-500'}`}>
                  {capturedImage ? <CheckCircle className="h-5 w-5" /> : '1'}
                </div>
                <span className="ml-2">Face Capture</span>
              </div>
              
              <div className="h-px bg-blue-400 flex-1"></div>
              
              <div className={`flex items-center ${step >= 2 ? 'text-white' : 'text-blue-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-white text-blue-600' : 'bg-blue-500'}`}>
                  {recordedAudio ? <CheckCircle className="h-5 w-5" /> : '2'}
                </div>
                <span className="ml-2">Voice Recording</span>
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

            {/* Step 1: Face Capture */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Capture Your Face</h2>
                  <p className="text-gray-600">Position your face in the center and capture a clear photo</p>
                </div>

                <div className="flex justify-center">
                  <div className="relative">
                    {!capturedImage ? (
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-96 h-72 object-cover rounded-lg border-4 border-blue-200"
                        />
                        <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-lg m-4 pointer-events-none"></div>
                      </div>
                    ) : (
                      <img
                        src={capturedImage}
                        alt="Captured face"
                        className="w-96 h-72 object-cover rounded-lg border-4 border-green-200"
                      />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  {!capturedImage ? (
                    <button
                      onClick={captureImage}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Capture Photo
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={retakeImage}
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
                      >
                        Retake
                      </button>
                      <button
                        onClick={() => setStep(2)}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center"
                      >
                        Continue to Voice
                        <CheckCircle className="h-5 w-5 ml-2" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Voice Recording */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Mic className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Record Your Voice</h2>
                  <p className="text-gray-600">Read the following text clearly for 30 seconds</p>
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
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                        <p className="text-green-700">Voice recorded successfully!</p>
                      </div>
                      
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={retakeVoice}
                          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
                        >
                          Re-record
                        </button>
                        <button
                          onClick={() => setStep(1)}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                        >
                          Back to Face
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                {capturedImage && recordedAudio && (
                  <div className="text-center pt-6 border-t">
                    <button
                      onClick={submitVerificationData}
                      disabled={loading}
                      className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center mx-auto"
                    >
                      {loading ? (
                        <>
                          <Loader className="h-5 w-5 mr-2 animate-spin" />
                          Setting up verification...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Complete Setup
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
