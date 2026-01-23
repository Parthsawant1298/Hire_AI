# python-services/voice_service_fixed.py
# FIXED Voice Verification Service - Updated with Resemblyzer (Deep Learning)

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import librosa
import base64
import requests
from io import BytesIO
import logging
from resemblyzer import VoiceEncoder, preprocess_wav
import warnings
warnings.filterwarnings('ignore')

# Try to import pydub for audio conversion with multiple FFmpeg path options
try:
    import os
    
    # Multiple potential FFmpeg paths (KEEPING YOUR ROBUST LOGIC)
    ffmpeg_paths = [
        r"C:\Users\PARTH\ffmpeg\bin",
        r"C:\ffmpeg\bin", 
        "/usr/bin",
        "/usr/local/bin",
        "/opt/homebrew/bin"  # macOS
    ]
    
    # Find working FFmpeg path
    ffmpeg_found = False
    for path in ffmpeg_paths:
        ffmpeg_exe = os.path.join(path, "ffmpeg.exe" if os.name == 'nt' else "ffmpeg")
        if os.path.exists(ffmpeg_exe):
            os.environ["PATH"] = path + os.pathsep + os.environ.get("PATH", "")
            ffmpeg_found = True
            break
    
    from pydub import AudioSegment
    
    if ffmpeg_found:
        AudioSegment.converter = ffmpeg_exe
        AudioSegment.ffmpeg = ffmpeg_exe
        AudioSegment.ffprobe = ffmpeg_exe.replace("ffmpeg", "ffprobe")
        PYDUB_AVAILABLE = True
    else:
        PYDUB_AVAILABLE = False
        
except ImportError as e:
    PYDUB_AVAILABLE = False

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class ImprovedVoiceVerification:
    def __init__(self):
        # NEW TECH: Resemblyzer allows for high accuracy, so we use a standard high threshold
        self.voice_threshold = 0.50
        self.high_confidence_threshold = 0.85
        self.min_duration = 1.0  # Deep learning models can work with shorter audio
        
        logger.info("🎤 Deep Learning Voice Verification initialized (Resemblyzer)")
        logger.info("🧠 Loading AI Model... (This might take a moment)")
        self.encoder = VoiceEncoder() # Downloads/Loads the pre-trained brain
        logger.info("✅ AI Model Loaded Successfully")
        logger.info(f"📊 Voice threshold: {self.voice_threshold}")

    def download_audio_from_url(self, audio_url):
        """Download audio from Cloudinary URL (UNCHANGED)"""
        try:
            logger.info(f"📥 Downloading audio from: {audio_url}")
            response = requests.get(audio_url, timeout=30)
            response.raise_for_status()
            
            audio_data = BytesIO(response.content)
            logger.info(f"✅ Downloaded {len(response.content)} bytes")
            return audio_data
        except Exception as e:
            logger.error(f"❌ Failed to download audio: {e}")
            raise

    def convert_audio_to_wav(self, audio_data, input_format='webm'):
        """Convert audio to WAV format (UNCHANGED - Required for stability)"""
        try:
            if PYDUB_AVAILABLE:
                logger.info(f"🔄 Converting {input_format} to WAV using pydub...")
                
                # Handle different input formats
                if input_format in ['webm', 'mkv']:
                    audio = AudioSegment.from_file(audio_data, format="webm")
                elif input_format == 'mp4':
                    audio = AudioSegment.from_file(audio_data, format="mp4") 
                elif input_format == 'ogg':
                    audio = AudioSegment.from_file(audio_data, format="ogg")
                else:
                    audio = AudioSegment.from_wav(audio_data)
                
                # Convert to mono, 16kHz (Standard for Resemblyzer)
                audio = audio.set_channels(1).set_frame_rate(16000)
                
                # Export to WAV
                wav_io = BytesIO()
                audio.export(wav_io, format="wav")
                wav_io.seek(0)
                
                logger.info("✅ Audio conversion successful")
                return wav_io
            else:
                logger.warning("⚠️ Pydub not available, using raw audio")
                return audio_data
                
        except Exception as e:
            logger.error(f"❌ Audio conversion failed: {e}")
            return audio_data

    def get_voice_embedding(self, audio_wav_io):
        """NEW TECH: Extract Deep Learning Embeddings instead of MFCCs"""
        try:
            logger.info("🧠 Generating AI Voice Embedding...")
            
            # Load audio to numpy array using librosa (Standard bridge to Resemblyzer)
            # We use the BytesIO object directly
            wav, sr = librosa.load(audio_wav_io, sr=16000)
            
            # Preprocess (Normalize, Trim Silence)
            wav = preprocess_wav(wav)
            
            # Generate Embedding (256-dimensional vector representing identity)
            embedding = self.encoder.embed_utterance(wav)
            
            logger.info("✅ Embedding generated successfully")
            return embedding
            
        except Exception as e:
            logger.error(f"❌ AI Embedding generation failed: {e}")
            raise

    def verify_voices(self, stored_audio_url, test_audio_base64):
        """Main voice verification method REPLACED with Deep Learning logic"""
        try:
            logger.info("🎤 Starting AI voice verification...")
            
            # 1. Download & Convert (Keep existing flow)
            stored_audio_data = self.download_audio_from_url(stored_audio_url)
            stored_wav_io = self.convert_audio_to_wav(stored_audio_data, 'webm')
            
            # 2. Convert test audio from base64 (Keep existing flow)
            test_audio_bytes = base64.b64decode(test_audio_base64.split(',')[1])
            test_audio_data = BytesIO(test_audio_bytes)
            test_wav_io = self.convert_audio_to_wav(test_audio_data, 'webm')
            
            # 3. NEW TECH: Get AI Embeddings
            embed_stored = self.get_voice_embedding(stored_wav_io)
            embed_test = self.get_voice_embedding(test_wav_io)
            
            # 4. Calculate Similarity (Dot Product of Embeddings)
            # Resemblyzer embeddings are normalized, so dot product = cosine similarity
            similarity = np.inner(embed_stored, embed_test)
            
            # 5. Verify using Threshold
            verified = bool(similarity >= self.voice_threshold)
            
            # Determine confidence level
            if similarity >= self.high_confidence_threshold:
                confidence = 'HIGH'
            elif verified:
                confidence = 'MODERATE'
            else:
                confidence = 'LOW'
            
            # 6. Construct Response (KEEPING EXACT JSON STRUCTURE FOR FRONTEND)
            # We map the single robust score to the previous fields to prevent breaking the UI
            result = {
                'verified': bool(verified),
                'similarity': float(similarity),
                'confidence': str(confidence),
                'threshold_used': float(self.voice_threshold),
                'metrics': {
                    'cosine': float(similarity),      # AI score is fundamentally cosine sim
                    'euclidean': float(similarity),   # Placeholder to keep structure
                    'voice_specific': float(similarity), # AI accounts for pitch implicitly
                    'ensemble': float(similarity)     # The ensemble is now just the AI score
                },
                'model_used': 'Resemblyzer_DeepLearning_v1'
            }
            
            logger.info(f"🎯 VERIFICATION RESULT: {verified}")
            logger.info(f"📊 AI Similarity: {similarity:.4f} (threshold: {self.voice_threshold})")
            logger.info(f"🎖️ Confidence: {confidence}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Voice verification failed: {e}")
            return {
                'verified': False,
                'similarity': 0.0,
                'confidence': 'ERROR',
                'error': str(e),
                'model_used': 'Resemblyzer_DeepLearning_v1'
            }

# Initialize the system
voice_verifier = ImprovedVoiceVerification()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint (UNCHANGED)"""
    return jsonify({
        'status': 'healthy',
        'service': 'voice_verification_fixed',
        'version': '3.0 (AI)',
        'pydub_available': PYDUB_AVAILABLE,
        'thresholds': {
            'voice_threshold': voice_verifier.voice_threshold,
            'min_duration': voice_verifier.min_duration
        }
    })

@app.route('/verify', methods=['POST'])
def verify_voice():
    """Voice verification endpoint (UNCHANGED LOGIC)"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        stored_voice_url = data.get('stored_voice_url')
        test_voice_base64 = data.get('test_voice_base64')
        
        if not stored_voice_url or not test_voice_base64:
            return jsonify({'error': 'Missing stored_voice_url or test_voice_base64'}), 400
        
        logger.info(f"🎤 Voice verification request received")
        logger.info(f"📥 Stored URL: {stored_voice_url[:50]}...")
        logger.info(f"📥 Test audio: {len(test_voice_base64)} chars")
        
        # Perform verification
        result = voice_verifier.verify_voices(stored_voice_url, test_voice_base64)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ API error: {e}")
        return jsonify({
            'verified': False,
            'similarity': 0.0,
            'confidence': 'ERROR',
            'error': str(e),
            'model_used': 'Resemblyzer_DeepLearning_v1'
        }), 500

if __name__ == '__main__':
    logger.info("🚀 Starting AI-Powered Voice Verification Service...")
    logger.info(f"🎤 Voice threshold: {voice_verifier.voice_threshold}")
    logger.info(f"🔊 Pydub available: {PYDUB_AVAILABLE}")
    app.run(host='0.0.0.0', port=8003, debug=True)