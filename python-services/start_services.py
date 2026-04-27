# python-services/start_services.py
# Script to start both Python verification services

import subprocess
import sys
import time
import threading
import signal
import os

# Global variables for process management
processes = []
shutdown_event = threading.Event()

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print("\n🛑 Shutdown signal received, stopping services...")
    shutdown_event.set()
    
    for proc in processes:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    
    print("✅ All services stopped")
    sys.exit(0)

def start_service(service_name, script_name, port):
    """Start a single service"""
    try:
        print(f"🚀 Starting {service_name} on port {port}...")
        proc = subprocess.Popen([sys.executable, script_name])
        processes.append(proc)
        print(f"✅ {service_name} started (PID: {proc.pid})")
        return proc
    except Exception as e:
        print(f"❌ Failed to start {service_name}: {e}")
        return None

def monitor_services():
    """Monitor service health"""
    while not shutdown_event.is_set():
        time.sleep(10)  # Check every 10 seconds
        
        for i, proc in enumerate(processes):
            if proc.poll() is not None:
                print(f"⚠️ Service {i+1} has stopped unexpectedly")
                # Optionally restart the service here
        
        shutdown_event.wait(10)

def main():
    """Main function to start all services"""
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🎯 Starting Python Verification Services...")
    
    # Check if requirements are installed
    try:
        import insightface
        import librosa
        import flask
        print("✅ Required packages are installed")
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("Please run: python setup.py")
        return False
    
    # Start services
    face_service = start_service("Face Verification Service", "face_service.py", 8001)
    time.sleep(2)  # Give first service time to start
    
    voice_service = start_service("Voice Verification Service", "voice_service.py", 8003)
    time.sleep(2)  # Give second service time to start
    
    if not face_service or not voice_service:
        print("❌ Failed to start one or more services")
        return False
    
    print("\n🎉 All services started successfully!")
    print("\nService endpoints:")
    print("- Face Verification: http://localhost:8001/verify-face")
    print("- Voice Verification: http://localhost:8003/verify-voice")
    print("- Health Checks: http://localhost:8001/health, http://localhost:8003/health")
    print("\nPress Ctrl+C to stop all services")
    
    # Start monitoring thread
    monitor_thread = threading.Thread(target=monitor_services, daemon=True)
    monitor_thread.start()
    
    # Wait for shutdown
    try:
        while not shutdown_event.is_set():
            shutdown_event.wait(1)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
