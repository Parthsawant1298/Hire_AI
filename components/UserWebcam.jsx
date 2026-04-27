import { useEffect, useRef } from 'react';
import { Video, VideoOff, User } from 'lucide-react';

export default function UserWebcam({
  isVideoOn,
  isMicOn,
  userName,
  isCallActive,
  videoRef,
  canvasRef
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const aspectRatio = 16 / 9;

      // Make container square for better face detection
      const size = Math.min(container.offsetWidth, container.offsetHeight);
      container.style.width = `${size}px`;
      container.style.height = `${size}px`;
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden rounded-2xl border border-gray-300 shadow-lg" ref={containerRef}>
      {isVideoOn ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          <div className="absolute bottom-4 right-4 z-20">
            <div className="backdrop-blur-md bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isCallActive ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`} />
              <span className="text-green-700">{userName || 'You'}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <div className="text-center">
            <VideoOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Camera Off</p>
            <p className="text-gray-400 text-xs mt-1">{userName || 'You'}</p>
          </div>
        </div>
      )}

      {/* Microphone Status Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <div className={`backdrop-blur-md border px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${
          isMicOn ? 'bg-green-500/20 border-green-500/30 text-green-700' : 'bg-red-500/20 border-red-500/30 text-red-700'
        }`}>
          {isMicOn ? (
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          ) : (
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
          <span>{isMicOn ? 'Mic On' : 'Mic Off'}</span>
        </div>
      </div>
    </div>
  );
}