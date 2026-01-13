# python-services/voice_service_fixed.py
# FIXED Voice Verification Service - Proper voice matching with strict thresholds

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import librosa
import base64
import requests
from io import BytesIO
import tempfile
import os
import logging
from sklearn.metrics.pairwise import cosine_similarity
from scipy.spatial.distance import euclidean
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# Try to import pydub for audio conversion with multiple FFmpeg path options
try:
    import os
    
    # Multiple potential FFmpeg paths
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
        # FIXED: Stricter thresholds for better accuracy
        self.voice_threshold = 0.75  # Increased from likely 0.5
        self.high_confidence_threshold = 0.85
        self.min_duration = 3.0  # Minimum 3 seconds of audio
        
        logger.info("🎤 ImprovedVoiceVerification initialized")
        logger.info(f"📊 Voice threshold: {self.voice_threshold}")
        logger.info(f"⏱️ Min duration: {self.min_duration}s")

    def download_audio_from_url(self, audio_url):
        """Download audio from Cloudinary URL"""
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
        """Convert audio to WAV format using pydub or ffmpeg"""
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
                
                # Convert to mono, 16kHz
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
            # Return original data as fallback
            return audio_data

    def extract_voice_features(self, audio_data):
        """Extract comprehensive voice features for verification"""
        try:
            logger.info("🎵 Extracting voice features...")
            
            # Load audio with librosa
            y, sr = librosa.load(audio_data, sr=16000, duration=30)
            
            # Check duration
            duration = len(y) / sr
            logger.info(f"⏱️ Audio duration: {duration:.2f}s")
            
            if duration < self.min_duration:
                raise ValueError(f"Audio too short: {duration:.2f}s < {self.min_duration}s")
            
            features = {}
            
            # 1. MFCC features (most important for voice ID)
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            features['mfcc_mean'] = np.mean(mfcc, axis=1)
            features['mfcc_std'] = np.std(mfcc, axis=1)
            
            # 2. Pitch/F0 features (fundamental frequency)
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr, threshold=0.1)
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t] if magnitudes[index, t] > 0 else 0
                if pitch > 0:
                    pitch_values.append(pitch)
            
            if len(pitch_values) > 0:
                features['pitch_mean'] = np.mean(pitch_values)
                features['pitch_std'] = np.std(pitch_values)
                features['pitch_median'] = np.median(pitch_values)
                features['pitch_range'] = np.max(pitch_values) - np.min(pitch_values)
            else:
                features['pitch_mean'] = features['pitch_std'] = 0
                features['pitch_median'] = features['pitch_range'] = 0
            
            # 3. Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            features['spectral_centroid_mean'] = np.mean(spectral_centroids)
            features['spectral_centroid_std'] = np.std(spectral_centroids)
            
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            features['spectral_rolloff_mean'] = np.mean(spectral_rolloff)
            features['spectral_rolloff_std'] = np.std(spectral_rolloff)
            
            # 4. Energy and rhythm features
            rms_energy = librosa.feature.rms(y=y)[0]
            features['energy_mean'] = np.mean(rms_energy)
            features['energy_std'] = np.std(rms_energy)
            
            zcr = librosa.feature.zero_crossing_rate(y)[0]
            features['zcr_mean'] = np.mean(zcr)
            features['zcr_std'] = np.std(zcr)
            
            # Convert to numpy array
            feature_vector = np.array([
                *features['mfcc_mean'], *features['mfcc_std'],
                features['pitch_mean'], features['pitch_std'], 
                features['pitch_median'], features['pitch_range'],
                features['spectral_centroid_mean'], features['spectral_centroid_std'],
                features['spectral_rolloff_mean'], features['spectral_rolloff_std'],
                features['energy_mean'], features['energy_std'],
                features['zcr_mean'], features['zcr_std']
            ])
            
            logger.info(f"✅ Extracted {len(feature_vector)} features")
            logger.info(f"📊 Feature ranges: min={feature_vector.min():.3f}, max={feature_vector.max():.3f}")
            
            return feature_vector, features
            
        except Exception as e:
            logger.error(f"❌ Feature extraction failed: {e}")
            raise

    def calculate_voice_similarity(self, stored_features, test_features, stored_raw, test_raw):
        """Calculate voice similarity using multiple metrics"""
        try:
            logger.info("📊 Calculating voice similarity...")
            
            # 1. Cosine similarity (primary metric)
            stored_norm = stored_features / (np.linalg.norm(stored_features) + 1e-8)
            test_norm = test_features / (np.linalg.norm(test_features) + 1e-8)
            cosine_sim = np.dot(stored_norm, test_norm)
            
            # 2. Euclidean distance similarity 
            euclidean_dist = euclidean(stored_features, test_features)
            max_dist = np.linalg.norm(stored_features) + np.linalg.norm(test_features)
            euclidean_sim = 1 - (euclidean_dist / (max_dist + 1e-8))
            
            # 3. Voice-specific verification (pitch and prosody patterns)
            voice_specific_score = self.voice_specific_verification(stored_raw, test_raw)
            
            # Combine metrics with weights
            ensemble_similarity = (cosine_sim * 0.7) + (euclidean_sim * 0.3)
            final_score = (ensemble_similarity * 0.6) + (voice_specific_score * 0.4)
            
            logger.info(f"📈 Cosine similarity: {cosine_sim:.4f}")
            logger.info(f"📉 Euclidean similarity: {euclidean_sim:.4f}")
            logger.info(f"🎵 Voice-specific score: {voice_specific_score:.4f}")
            logger.info(f"🎯 Final ensemble score: {final_score:.4f}")
            
            return final_score, {
                'cosine': float(cosine_sim),
                'euclidean': float(euclidean_sim), 
                'voice_specific': float(voice_specific_score),
                'ensemble': float(ensemble_similarity)
            }
            
        except Exception as e:
            logger.error(f"❌ Similarity calculation failed: {e}")
            return 0.0, {'error': str(e)}

    def voice_specific_verification(self, stored_features, test_features):
        """Additional voice-specific verification using pitch contours and speaking rate"""
        try:
            # Compare pitch patterns
            stored_pitch_mean = stored_features.get('pitch_mean', 0)
            test_pitch_mean = test_features.get('pitch_mean', 0)
            stored_pitch_std = stored_features.get('pitch_std', 0) 
            test_pitch_std = test_features.get('pitch_std', 0)
            
            # Pitch similarity (normalized)
            if stored_pitch_mean > 0 and test_pitch_mean > 0:
                pitch_diff = abs(stored_pitch_mean - test_pitch_mean) / max(stored_pitch_mean, test_pitch_mean)
                pitch_similarity = max(0, 1 - pitch_diff)
                
                pitch_std_diff = abs(stored_pitch_std - test_pitch_std) / max(stored_pitch_std, test_pitch_std, 1)
                pitch_variation_similarity = max(0, 1 - pitch_std_diff)
            else:
                pitch_similarity = 0.5  # Neutral score if pitch not detected
                pitch_variation_similarity = 0.5
            
            # Speaking rate similarity (using ZCR as proxy)
            stored_zcr = stored_features.get('zcr_mean', 0)
            test_zcr = test_features.get('zcr_mean', 0)
            
            if stored_zcr > 0 and test_zcr > 0:
                zcr_diff = abs(stored_zcr - test_zcr) / max(stored_zcr, test_zcr)
                speaking_rate_similarity = max(0, 1 - zcr_diff)
            else:
                speaking_rate_similarity = 0.5
            
            # Combine voice-specific features
            voice_score = (pitch_similarity * 0.5) + (pitch_variation_similarity * 0.3) + (speaking_rate_similarity * 0.2)
            
            logger.info(f"🎵 Voice-specific: pitch={pitch_similarity:.3f}, variation={pitch_variation_similarity:.3f}, rate={speaking_rate_similarity:.3f}")
            
            return voice_score
            
        except Exception as e:
            logger.error(f"❌ Voice-specific verification failed: {e}")
            return 0.0

    def verify_voices(self, stored_audio_url, test_audio_base64):
        """Main voice verification method with improved accuracy"""
        try:
            logger.info("🎤 Starting voice verification...")
            
            # Download stored audio
            stored_audio_data = self.download_audio_from_url(stored_audio_url)
            stored_wav = self.convert_audio_to_wav(stored_audio_data, 'webm')
            
            # Convert test audio from base64
            test_audio_bytes = base64.b64decode(test_audio_base64.split(',')[1])
            test_audio_data = BytesIO(test_audio_bytes)
            test_wav = self.convert_audio_to_wav(test_audio_data, 'webm')
            
            # Extract features
            stored_features, stored_raw = self.extract_voice_features(stored_wav)
            test_features, test_raw = self.extract_voice_features(test_wav)
            
            # Calculate similarity
            similarity, metrics = self.calculate_voice_similarity(
                stored_features, test_features, stored_raw, test_raw
            )
            
            # FIXED: Use strict threshold for verification - ensure Python bool
            verified = bool(similarity >= self.voice_threshold)
            
            # Determine confidence level
            if similarity >= self.high_confidence_threshold:
                confidence = 'HIGH'
            elif verified:
                confidence = 'MODERATE'
            else:
                confidence = 'LOW'
            
            # Convert all numpy types to Python native types for JSON serialization
            result = {
                'verified': bool(verified),
                'similarity': float(similarity),
                'confidence': str(confidence),
                'threshold_used': float(self.voice_threshold),
                'metrics': {
                    'cosine': float(metrics.get('cosine', 0)),
                    'euclidean': float(metrics.get('euclidean', 0)),
                    'voice_specific': float(metrics.get('voice_specific', 0)),
                    'ensemble': float(metrics.get('ensemble', 0))
                },
                'model_used': 'ImprovedVoiceVerification_v2'
            }
            
            logger.info(f"🎯 VERIFICATION RESULT: {verified}")
            logger.info(f"📊 Similarity: {similarity:.4f} (threshold: {self.voice_threshold})")
            logger.info(f"🎖️ Confidence: {confidence}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Voice verification failed: {e}")
            return {
                'verified': False,
                'similarity': 0.0,
                'confidence': 'ERROR',
                'error': str(e),
                'model_used': 'ImprovedVoiceVerification_v2'
            }

# Initialize the voice verification system
voice_verifier = ImprovedVoiceVerification()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'voice_verification_fixed',
        'version': '2.0',
        'pydub_available': PYDUB_AVAILABLE,
        'thresholds': {
            'voice_threshold': voice_verifier.voice_threshold,
            'min_duration': voice_verifier.min_duration
        }
    })

@app.route('/verify', methods=['POST'])
def verify_voice():
    """Voice verification endpoint"""
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
            'model_used': 'ImprovedVoiceVerification_v2'
        }), 500

if __name__ == '__main__':
    logger.info("🚀 Starting Fixed Voice Verification Service...")
    logger.info(f"🎤 Voice threshold: {voice_verifier.voice_threshold}")
    logger.info(f"🔊 Pydub available: {PYDUB_AVAILABLE}")
    app.run(host='0.0.0.0', port=8003, debug=True)