# README for Python Verification Services

## 🔐 Python Verification Services

This directory contains Python microservices that implement your **exact** `face.py` and `audio.py` logic for the recruitment platform.

### 🎯 Services Included

1. **Face Verification Service** (`face_service.py`)
   - Uses **InsightFace ArcFace R100** model
   - Implements your exact face matching thresholds (0.6 similarity, 0.7 high confidence)
   - Cosine similarity calculation with proper normalization
   - Runs on port **8001**

2. **Voice Verification Service** (`voice_service.py`)
   - Uses **your exact EER-optimized thresholds** from `audio.py`
   - Multi-model ensemble with **ultra-strict** verification (0.96 threshold)
   - MFCC, Spectral, Pitch, Formant, Energy, and Tempo analysis
   - Runs on port **8003**

### 🚀 Quick Setup

```bash
# 1. Navigate to python-services directory
cd python-services

# 2. Setup environment and install requirements
python setup.py

# 3. Start both services
python start_services.py
```

### 📋 Requirements

- **Python 3.8+**
- **InsightFace** for face recognition
- **Librosa** for audio processing
- **OpenCV** for image processing
- **Flask** for web services

### 🔧 Manual Setup

```bash
# Install requirements
pip install -r requirements.txt

# Start services individually
python face_service.py    # Port 8001
python voice_service.py   # Port 8003
```

### 🌐 API Endpoints

#### Face Verification
```bash
POST http://localhost:8001/verify-face
Content-Type: application/json

{
  "stored_image_url": "https://cloudinary.com/stored_face.jpg",
  "test_image_base64": "data:image/jpeg;base64,..."
}
```

#### Voice Verification
```bash
POST http://localhost:8003/verify-voice
Content-Type: application/json

{
  "stored_audio_url": "https://cloudinary.com/stored_voice.wav",
  "test_audio_base64": "data:audio/wav;base64,...",
  "original_text": "Text read during enrollment",
  "current_text": "Text read during verification",
  "mode": "ultra_strict"
}
```

### 🔍 Health Checks

```bash
GET http://localhost:8001/health  # Face service health
GET http://localhost:8003/health  # Voice service health
```

### ⚙️ Configuration

Add to your main `.env` file:

```env
PYTHON_FACE_SERVICE_URL=http://localhost:8001
PYTHON_VOICE_SERVICE_URL=http://localhost:8003
```

### 🎯 Integration with Next.js

The JavaScript APIs in your Next.js app will automatically call these Python services:

1. **Priority 1**: Python microservices (your exact logic)
2. **Priority 2**: Cloud APIs (InsightFace/Speaker verification)
3. **Priority 3**: JavaScript fallback (basic similarity)

### 🔒 Security Features

- **Face Verification**: 0.6 similarity threshold (0.7 for high confidence)
- **Voice Verification**: 0.96 ensemble score (ultra-strict mode)
- **Multi-layer decision**: Score + Consensus + Reliability + Model count
- **EER-optimized thresholds**: Minimizes false accepts and rejects

### 🐛 Troubleshooting

**InsightFace Installation Issues:**
```bash
pip install insightface --no-deps
pip install onnxruntime
```

**Audio Processing Issues:**
```bash
pip install soundfile
pip install librosa[soundfile]
```

**Permission Errors:**
```bash
# Run with elevated permissions if needed
sudo python start_services.py
```

### 📊 Monitoring

Services log comprehensive information:
- Feature extraction status
- Similarity scores for each model
- Ensemble decision process
- Error handling and fallbacks

### 🔄 Scaling

For production:
- Use **Docker containers** for each service
- Deploy on **separate servers** for load balancing
- Implement **health monitoring** and auto-restart
- Use **Redis** for caching verification results

---

**🎉 Your exact Python algorithms are now running as production-ready microservices!**
