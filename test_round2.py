import requests
import base64
import time
from io import BytesIO
from PIL import Image
import numpy as np
import sys
import json

def test_face_service():
    print("--------------------------------------------------")
    print("🧪 Testing Face Verification Service (Port 8001)...")
    try:
        # 1. Test Health Check
        health_resp = requests.get('http://localhost:8001/health')
        print(f"Health Check: {health_resp.status_code}")
        print(f"Health Data: {json.dumps(health_resp.json(), indent=2)}")
        
        if health_resp.status_code != 200:
            print("❌ Face service health check failed")
            return False
            
        print("✅ Face service is running and healthy")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Face service is NOT running (Connection Refused)")
        return False

def test_voice_service():
    print("--------------------------------------------------")
    print("🧪 Testing Voice Verification Service (Port 8003)...")
    try:
        # 1. Test Health Check
        health_resp = requests.get('http://localhost:8003/health')
        print(f"Health Check: {health_resp.status_code}")
        print(f"Health Data: {json.dumps(health_resp.json(), indent=2)}")
        
        if health_resp.status_code != 200:
            print("❌ Voice service health check failed")
            return False
            
        print("✅ Voice service is running and healthy")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Voice service is NOT running (Connection Refused)")
        return False

if __name__ == "__main__":
    print("🚀 Starting Round 2 Services Diagnostic...")
    face_ok = test_face_service()
    voice_ok = test_voice_service()
    
    print("--------------------------------------------------")
    if face_ok and voice_ok:
        print("🎉 ALL ROUND 2 MICROSERVICES ARE ONLINE AND HEALTHY!")
    else:
        print("⚠️ SOME SERVICES ARE OFFLINE. PLEASE CHECK LOGS.")
        sys.exit(1)
