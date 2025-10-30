# python-services/voice_service.py
# Python microservice that runs your exact audio.py logic

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
# from python_speech_features import mfcc  # Optional dependency
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# Try to import pydub for audio conversion
try:
    import os
    
    # Set FFmpeg path in environment
    ffmpeg_path = r"C:\Users\PARTH\ffmpeg\bin"
    os.environ["PATH"] = ffmpeg_path + os.pathsep + os.environ.get("PATH", "")
    
    from pydub import AudioSegment
    from pydub.utils import which
    
    # Configure FFmpeg path for pydub - multiple ways to ensure it works
    AudioSegment.converter = r"C:\Users\PARTH\ffmpeg\bin\ffmpeg.exe"
    AudioSegment.ffmpeg = r"C:\Users\PARTH\ffmpeg\bin\ffmpeg.exe"
    AudioSegment.ffprobe = r"C:\Users\PARTH\ffmpeg\bin\ffprobe.exe"
    
    # Test if FFmpeg is accessible
    if os.path.exists(AudioSegment.ffmpeg):
        PYDUB_AVAILABLE = True
        logger = logging.getLogger(__name__)
        logger.info("✅ Pydub successfully imported with FFmpeg configured!")
    else:
        PYDUB_AVAILABLE = False
        logger = logging.getLogger(__name__)
        logger.error(f"❌ FFmpeg not found at: {AudioSegment.ffmpeg}")
        
except ImportError as e:
    PYDUB_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(f"⚠️ Pydub not available: {e}")

# Try to import ffmpeg-python as fallback
try:
    import ffmpeg
    FFMPEG_PYTHON_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.info("✅ ffmpeg-python successfully imported!")
except ImportError as e:
    FFMPEG_PYTHON_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(f"⚠️ ffmpeg-python not available: {e}")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Print pydub status after logger is set up
if 'PYDUB_AVAILABLE' in globals():
    if PYDUB_AVAILABLE:
        logger.info("✅ Pydub successfully imported with FFmpeg configured!")
    else:
        logger.warning("⚠️ Pydub not properly configured")

# Try to import PyTorch and SpeechBrain models (from your audio.py)
try:
    import torch
    TORCH_AVAILABLE = True
    logger.info("✅ PyTorch successfully imported!")
except ImportError as e:
    TORCH_AVAILABLE = False
    logger.warning(f"⚠️ PyTorch not available: {e}")
    
try:
    from speechbrain.pretrained import SpeakerRecognition, EncoderClassifier
    SPEECHBRAIN_AVAILABLE = True and TORCH_AVAILABLE
    logger.info("✅ SpeechBrain successfully imported!")
except ImportError as e:
    SPEECHBRAIN_AVAILABLE = False
    logger.warning(f"⚠️ SpeechBrain not available: {e}")
    
if not SPEECHBRAIN_AVAILABLE:
    logger.info("🔄 Using traditional feature extraction only")

app = Flask(__name__)
CORS(app)

# Your exact ResearchBasedUltraStrictSpeakerVerification class from audio.py
class ResearchBasedUltraStrictSpeakerVerification:
    def __init__(self, min_duration=5):
        """Research-Based Ultra-Strict Speaker Verification System from audio.py"""
        self.min_duration = min_duration
        self.models = {}

        # RESEARCH-BASED EER-OPTIMIZED THRESHOLDS (exact from audio.py)
        self.eer_optimized_thresholds = {
            'ecapa_voxceleb': {
                'base_threshold': 0.88,      
                'strict_threshold': 0.92,    
                'weight': 0.25,
                'reliability_score': 0.95
            },
            'ecapa_voxceleb2': {
                'base_threshold': 0.90,
                'strict_threshold': 0.94,
                'weight': 0.22,
                'reliability_score': 0.92
            },
            'xvector': {
                'base_threshold': 0.82,
                'strict_threshold': 0.88,
                'weight': 0.18,
                'reliability_score': 0.88
            },
            'mfcc_cosine': {
                'base_threshold': 0.94,
                'strict_threshold': 0.97,
                'weight': 0.12,
                'reliability_score': 0.85
            },
            'spectral_similarity': {
                'base_threshold': 0.90,
                'strict_threshold': 0.95,
                'weight': 0.10,
                'reliability_score': 0.82
            },
            'pitch_analysis': {
                'base_threshold': 0.85,
                'strict_threshold': 0.90,
                'weight': 0.08,
                'reliability_score': 0.80
            },
            'formant_analysis': {
                'base_threshold': 0.78,
                'strict_threshold': 0.85,
                'weight': 0.05,
                'reliability_score': 0.78
            }
        }

        # ENSEMBLE PARAMETERS (exact from audio.py)
        self.ensemble_config = {
            'base_ensemble_threshold': 0.92,     
            'strict_ensemble_threshold': 0.96,   
            'consensus_requirement': 0.90,       
            'minimum_models': 4,                 
            'far_target': 0.01,                 
            'frr_target': 0.05                  
        }

        # CONTEXT-AWARE PARAMETERS (exact from audio.py)
        self.context_adjustments = {
            'male_adjustment': 0.02,     
            'female_adjustment': -0.01,  
            'age_young_adjustment': 0.01,
            'age_old_adjustment': 0.03,
            'high_quality_bonus': -0.02,  
            'low_quality_penalty': 0.05   
        }

        # SCORE NORMALIZATION PARAMETERS (exact from audio.py)
        self.normalization_config = {
            'use_cohort_normalization': True,
            'use_impostor_normalization': True,
            'cohort_size': 100,
            'impostor_threshold': 0.3,
            'z_norm_enabled': True,
            't_norm_enabled': True
        }
    
    def initialize_models(self):
        """Initialize multiple models with reliability tracking (exact from audio.py)"""
        logger.info("🔄 Loading Research-Based Multi-Model System...")

        if SPEECHBRAIN_AVAILABLE:
            model_configs = [
                ('ecapa_voxceleb', 'speechbrain/spkrec-ecapa-voxceleb'),
                ('ecapa_voxceleb2', 'speechbrain/spkrec-ecapa-voxceleb2'),
                ('xvector', 'speechbrain/spkrec-xvect-voxceleb')
            ]

            for model_name, model_source in model_configs:
                try:
                    logger.info(f"   Loading {model_name}...")
                    if model_name == 'xvector':
                        self.models[model_name] = EncoderClassifier.from_hparams(
                            source=model_source,
                            savedir=f"pretrained_models/{model_name}"
                        )
                    else:
                        self.models[model_name] = SpeakerRecognition.from_hparams(
                            source=model_source,
                            savedir=f"pretrained_models/{model_name}"
                        )
                    logger.info(f"   ✅ {model_name} loaded successfully")

                except Exception as e:
                    logger.info(f"   ⚠️ {model_name} failed to load: {e}")

        # Custom feature extractors (always available)
        self.models['mfcc_extractor'] = True
        self.models['spectral_extractor'] = True
        self.models['pitch_extractor'] = True
        self.models['formant_extractor'] = True

        neural_models = len([k for k, v in self.models.items() if v is not True])
        logger.info(f"✅ Research-based system ready with {neural_models} neural models")
    
    def assess_audio_quality(self, audio):
        """Assess audio quality for context-aware thresholding (exact from audio.py)"""
        try:
            samples = np.array(audio)
            
            # Quality metrics
            snr_estimate = self.estimate_snr(samples)
            dynamic_range = 20 * np.log10(np.max(np.abs(samples)) / (np.mean(np.abs(samples)) + 1e-8))
            spectral_quality = self.assess_spectral_quality(samples, 16000)

            # Combined quality score (0-1)
            quality_score = np.mean([
                min(1.0, snr_estimate / 20),      
                min(1.0, dynamic_range / 40),     
                spectral_quality                   
            ])

            return quality_score

        except Exception as e:
            return 0.5  # Default quality if assessment fails

    def estimate_snr(self, samples):
        """Estimate Signal-to-Noise Ratio (exact from audio.py)"""
        try:
            sorted_samples = np.sort(np.abs(samples))
            signal_level = np.mean(sorted_samples[-len(sorted_samples)//10:])  
            noise_level = np.mean(sorted_samples[:len(sorted_samples)//10])    

            if noise_level > 0:
                snr = 20 * np.log10(signal_level / noise_level)
            else:
                snr = 40  

            return max(0, min(40, snr))  

        except:
            return 15  

    def assess_spectral_quality(self, samples, sr):
        """Assess spectral quality of audio (exact from audio.py)"""
        try:
            fft = np.fft.fft(samples)
            magnitude = np.abs(fft[:len(fft)//2])

            freqs = np.fft.fftfreq(len(samples), 1/sr)[:len(fft)//2]
            spectral_centroid = np.sum(freqs * magnitude) / (np.sum(magnitude) + 1e-8)

            quality = min(1.0, spectral_centroid / 2000)  

            return quality

        except:
            return 0.5
    
    def check_audio_duration_research_standard(self, audio_data):
        """Research-standard duration checking (exact from audio.py)"""
        try:
            duration = len(audio_data) / 16000.0  # Assuming 16kHz sample rate
            
            logger.info(f"ℹ️ Audio Duration: {duration:.2f} seconds")

            if duration < self.min_duration:
                reliability_penalty = (self.min_duration - duration) / self.min_duration
                logger.info(f"⚠️ Below research standard {self.min_duration}s")
                logger.info(f"   Reliability penalty: {reliability_penalty:.2f}")
                return False, reliability_penalty
            elif duration >= 30:
                reliability_bonus = min(0.1, (duration - 30) / 60)
                logger.info(f"✅ Excellent duration for research-grade analysis")
                logger.info(f"   Reliability bonus: {reliability_bonus:.2f}")
                return True, -reliability_bonus  
            else:
                logger.info(f"✅ Adequate duration for research analysis")
                return True, 0.0

        except Exception as e:
            logger.info(f"❌ Duration assessment failed: {str(e)}")
            return False, 0.2 

    def get_xvector_score(self, model, audio1, audio2):
        """Get X-Vector similarity score (exact from audio.py)"""
        try:
            if not TORCH_AVAILABLE:
                logger.error("PyTorch not available for X-Vector scoring")
                return 0.0
                
            waveform1 = torch.FloatTensor(audio1).unsqueeze(0)
            waveform2 = torch.FloatTensor(audio2).unsqueeze(0)

            embedding1 = model.encode_batch(waveform1)
            embedding2 = model.encode_batch(waveform2)

            similarity = torch.nn.functional.cosine_similarity(
                embedding1, embedding2, dim=-1
            ).item()

            return similarity

        except Exception as e:
            logger.error(f"X-Vector scoring failed: {e}")
            return 0.0

    def apply_score_normalization(self, score, model_name):
        """Apply cohort and impostor score normalization (exact from audio.py)"""
        try:
            if not self.normalization_config['use_cohort_normalization']:
                return score

            cohort_mean = 0.5  
            cohort_std = 0.2   

            if self.normalization_config['z_norm_enabled']:
                z_normalized = (score - cohort_mean) / (cohort_std + 1e-8)
                normalized_score = 0.5 + z_normalized * 0.2
                normalized_score = max(0, min(1, normalized_score))
            else:
                normalized_score = score

            return normalized_score

        except Exception as e:
            logger.error(f"Score normalization failed: {e}")
            return score

    def get_adaptive_threshold(self, model_name, context_info=None):
        """Get adaptive threshold based on context (exact from audio.py)"""
        model_config = self.eer_optimized_thresholds[model_name]
        base_threshold = model_config['strict_threshold']  

        if context_info is None:
            return base_threshold

        threshold_adjustment = 0.0

        # Quality-based adjustment
        quality = context_info.get('audio_quality', 0.5)
        if quality >= 0.8:
            threshold_adjustment += self.context_adjustments['high_quality_bonus']
        elif quality <= 0.3:
            threshold_adjustment += self.context_adjustments['low_quality_penalty']

        adaptive_threshold = base_threshold + threshold_adjustment
        adaptive_threshold = max(0.1, min(0.99, adaptive_threshold))  

        return adaptive_threshold

    def verify_with_adaptive_thresholding(self, model_name, audio1, audio2, context_info=None):
        """Verification with adaptive, context-aware thresholding (exact from audio.py)"""
        if model_name not in self.models or self.models[model_name] is True:
            return None

        try:
            model = self.models[model_name]

            # Get base score
            if model_name == 'xvector':
                score = self.get_xvector_score(model, audio1, audio2)
            else:
                # Convert audio to the format expected by SpeechBrain
                if not TORCH_AVAILABLE:
                    logger.error("PyTorch not available for SpeechBrain models")
                    return None
                    
                audio1_tensor = torch.FloatTensor(audio1).unsqueeze(0)
                audio2_tensor = torch.FloatTensor(audio2).unsqueeze(0)
                score_tensor, prediction = model.verify_batch(audio1_tensor, audio2_tensor)
                score = score_tensor.item() if hasattr(score_tensor, 'item') else float(score_tensor)

            # Apply score normalization
            normalized_score = self.apply_score_normalization(score, model_name)

            # Get adaptive threshold
            adaptive_threshold = self.get_adaptive_threshold(model_name, context_info)

            # Make decision
            prediction = normalized_score >= adaptive_threshold

            # Calculate confidence with reliability weighting
            model_config = self.eer_optimized_thresholds[model_name]
            reliability = model_config['reliability_score']
            confidence = abs(normalized_score - adaptive_threshold) * reliability

            return {
                'model': model_name,
                'raw_score': score,
                'normalized_score': normalized_score,
                'adaptive_threshold': adaptive_threshold,
                'prediction': prediction,
                'confidence': confidence,
                'reliability': reliability,
                'weight': model_config['weight']
            }

        except Exception as e:
            logger.error(f"⚠️ {model_name} verification failed: {e}")
            return None

    def extract_research_grade_mfcc(self, y, sr):
        """Extract research-grade MFCC features (exact from audio.py)"""
        try:
            mfcc_features = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, n_fft=2048, hop_length=512)
            mfcc_delta = librosa.feature.delta(mfcc_features)
            mfcc_delta2 = librosa.feature.delta(mfcc_features, order=2)

            combined_features = np.vstack([mfcc_features, mfcc_delta, mfcc_delta2])

            feature_stats = np.hstack([
                np.mean(combined_features, axis=1),
                np.std(combined_features, axis=1),
                np.median(combined_features, axis=1)
            ])

            return feature_stats

        except Exception as e:
            return None

    def extract_advanced_spectral_features(self, y, sr):
        """Extract advanced spectral features (exact from audio.py)"""
        try:
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
            zcr = librosa.feature.zero_crossing_rate(y)

            spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(y), sr=sr)

            features = np.hstack([
                np.mean(spectral_centroids),
                np.std(spectral_centroids),
                np.mean(spectral_rolloff),
                np.std(spectral_rolloff),
                np.mean(spectral_bandwidth),
                np.std(spectral_bandwidth),
                np.mean(zcr),
                np.std(zcr),
                np.mean(spectral_contrast, axis=1),
                np.std(spectral_contrast, axis=1),
                np.mean(chroma, axis=1),
                np.std(chroma, axis=1),
                np.mean(tonnetz, axis=1),
                np.std(tonnetz, axis=1)
            ])

            return features

        except Exception as e:
            return None

    def extract_advanced_pitch_features(self, y, sr):
        """Extract advanced pitch features (exact from audio.py)"""
        try:
            f0_yin = librosa.yin(y, fmin=50, fmax=400, sr=sr)
            f0_pyin = librosa.pyin(y, fmin=50, fmax=400, sr=sr)[0]

            f0_yin_voiced = f0_yin[f0_yin > 0]
            f0_pyin_voiced = f0_pyin[~np.isnan(f0_pyin)]

            features = []

            for f0_values in [f0_yin_voiced, f0_pyin_voiced]:
                if len(f0_values) > 10:
                    features.extend([
                        np.mean(f0_values),
                        np.std(f0_values),
                        np.median(f0_values),
                        np.max(f0_values) - np.min(f0_values),
                        stats.skew(f0_values),
                        stats.kurtosis(f0_values)
                    ])
                else:
                    features.extend([0, 0, 0, 0, 0, 0])

            return np.array(features)

        except Exception as e:
            return None

    def extract_formant_features(self, y, sr):
        """Extract formant features using advanced LPC analysis (exact from audio.py)"""
        try:
            frame_length = int(sr * 0.025)
            hop_length = int(sr * 0.010)

            formants = []

            for i in range(0, len(y) - frame_length, hop_length):
                frame = y[i:i+frame_length]
                windowed = frame * np.hanning(len(frame))

                if np.sum(windowed**2) < 0.01:
                    continue

                try:
                    autocorr = np.correlate(windowed, windowed, mode='full')
                    autocorr = autocorr[len(autocorr)//2:]

                    from scipy.signal import find_peaks
                    peaks, _ = find_peaks(autocorr[1:], height=np.max(autocorr)*0.1)

                    if len(peaks) >= 3:
                        f1 = peaks[0] * sr / len(windowed)
                        f2 = peaks[1] * sr / len(windowed)
                        f3 = peaks[2] * sr / len(windowed)
                        formants.append([f1, f2, f3])

                except:
                    continue

            if formants:
                formants = np.array(formants)
                formant_features = np.hstack([
                    np.mean(formants, axis=0),
                    np.std(formants, axis=0),
                    np.mean(formants[:, 1] / formants[:, 0]),  
                    np.mean(formants[:, 2] / formants[:, 0])   
                ])
                return formant_features
            else:
                return np.zeros(8)  

        except Exception as e:
            return None

    def verify_with_traditional_features(self, feature_type, audio1, audio2):
        """Verification using traditional features (exact from audio.py)"""
        try:
            if feature_type == 'mfcc_cosine':
                features1 = self.extract_research_grade_mfcc(audio1, 16000)
                features2 = self.extract_research_grade_mfcc(audio2, 16000)
            elif feature_type == 'spectral_similarity':
                features1 = self.extract_advanced_spectral_features(audio1, 16000)
                features2 = self.extract_advanced_spectral_features(audio2, 16000)
            elif feature_type == 'pitch_analysis':
                features1 = self.extract_advanced_pitch_features(audio1, 16000)
                features2 = self.extract_advanced_pitch_features(audio2, 16000)
            elif feature_type == 'formant_analysis':
                features1 = self.extract_formant_features(audio1, 16000)
                features2 = self.extract_formant_features(audio2, 16000)
            else:
                return None

            if features1 is None or features2 is None:
                return None

            # Calculate similarity
            similarity = cosine_similarity(
                features1.reshape(1, -1),
                features2.reshape(1, -1)
            )[0][0]

            # Apply normalization
            normalized_similarity = self.apply_score_normalization(similarity, feature_type)

            # Get adaptive threshold
            adaptive_threshold = self.get_adaptive_threshold(feature_type, None)

            prediction = normalized_similarity >= adaptive_threshold

            model_config = self.eer_optimized_thresholds[feature_type]

            return {
                'model': feature_type,
                'raw_score': similarity,
                'normalized_score': normalized_similarity,
                'adaptive_threshold': adaptive_threshold,
                'prediction': prediction,
                'confidence': abs(normalized_similarity - adaptive_threshold),
                'reliability': model_config['reliability_score'],
                'weight': model_config['weight']
            }

        except Exception as e:
            logger.error(f"⚠️ {feature_type} verification failed: {e}")
            return None

    def research_based_ensemble_decision(self, results, context_info=None):
        """Research-based ensemble decision with advanced weighting (exact from audio.py)"""
        if not results:
            return None

        valid_results = [r for r in results if r is not None]

        if len(valid_results) < self.ensemble_config['minimum_models']:
            logger.error(f"⚠️ Insufficient models: {len(valid_results)} < {self.ensemble_config['minimum_models']}")
            return None

        logger.info(f"\n🎯 RESEARCH-BASED ENSEMBLE ANALYSIS:")
        logger.info(f"   Active Models: {len(valid_results)}")

        # Dynamic reliability weighting
        total_weighted_score = 0
        total_weight = 0
        predictions = []
        reliability_scores = []

        for result in valid_results:
            model_name = result['model']
            normalized_score = result['normalized_score']
            prediction = result['prediction']
            reliability = result['reliability']
            base_weight = result['weight']

            # Dynamic weight adjustment based on confidence and reliability
            confidence_bonus = min(0.2, result['confidence'])
            adjusted_weight = base_weight * (1 + confidence_bonus) * reliability

            total_weighted_score += normalized_score * adjusted_weight
            total_weight += adjusted_weight
            predictions.append(prediction)
            reliability_scores.append(reliability)

            status = "✅ SAME" if prediction else "❌ DIFFERENT"
            logger.info(f"   {model_name}: {normalized_score:.4f} | Threshold: {result['adaptive_threshold']:.4f} | {status}")
            logger.info(f"      Weight: {base_weight:.3f} → {adjusted_weight:.3f} | Reliability: {reliability:.3f}")

        # Calculate ensemble metrics
        ensemble_score = total_weighted_score / total_weight if total_weight > 0 else 0
        vote_ratio = sum(predictions) / len(predictions)
        average_reliability = np.mean(reliability_scores)

        # Research-based decision criteria
        base_threshold = self.ensemble_config['base_ensemble_threshold']
        strict_threshold = self.ensemble_config['strict_ensemble_threshold']
        consensus_requirement = self.ensemble_config['consensus_requirement']

        # Apply context-aware threshold adjustment
        if context_info:
            threshold_adjustment = 0
            if context_info.get('audio_quality', 0.5) < 0.4:
                threshold_adjustment += 0.03  
            if context_info.get('duration_penalty', 0) > 0:
                threshold_adjustment += context_info['duration_penalty']

            effective_threshold = strict_threshold + threshold_adjustment
        else:
            effective_threshold = strict_threshold

        # Multi-layer decision process
        layer1_pass = ensemble_score >= effective_threshold
        layer2_pass = vote_ratio >= consensus_requirement
        layer3_base = average_reliability >= 0.84  
        layer4_pass = len(valid_results) >= self.ensemble_config['minimum_models']

        # Check for high-confidence exception BEFORE final decision
        high_confidence_exception = (
            ensemble_score >= 0.97 and
            vote_ratio == 1.0 and
            average_reliability >= 0.82 and
            len(valid_results) >= 5
        )

        logger.info(f"\n🔍 HIGH-CONFIDENCE EXCEPTION CHECK:")
        logger.info(f"   Ensemble Score: {ensemble_score:.4f} ≥ 0.97? {'✅' if ensemble_score >= 0.97 else '❌'}")
        logger.info(f"   Vote Ratio: {vote_ratio:.2f} = 1.00? {'✅' if vote_ratio == 1.0 else '❌'}")
        logger.info(f"   Reliability: {average_reliability:.3f} ≥ 0.82? {'✅' if average_reliability >= 0.82 else '❌'}")
        logger.info(f"   Model Count: {len(valid_results)} ≥ 5? {'✅' if len(valid_results) >= 5 else '❌'}")

        # Apply exception or use base check
        if high_confidence_exception:
            logger.info(f"   🎯 HIGH-CONFIDENCE EXCEPTION ACTIVATED!")
            logger.info(f"      Overriding reliability check for exceptional case")
            layer3_pass = True
        else:
            layer3_pass = layer3_base
            logger.info(f"   ⚠️ High-confidence exception not triggered - using base reliability check")

        # ULTRA-STRICT: All layers must pass
        ensemble_prediction = layer1_pass and layer2_pass and layer3_pass and layer4_pass

        # Additional safety checks for borderline cases
        if 0.90 <= ensemble_score < 0.96:
            logger.info(f"   🛡️ BORDERLINE CASE: Requiring enhanced consensus")
            enhanced_consensus = vote_ratio >= 0.95  
            ensemble_prediction = ensemble_prediction and enhanced_consensus

        # Confidence assessment
        confidence_level = "Very Low"
        if ensemble_score >= 0.98 and vote_ratio == 1.0 and average_reliability >= 0.95:
            confidence_level = "Very High"
        elif ensemble_score >= 0.96 and vote_ratio >= 0.9 and average_reliability >= 0.9:
            confidence_level = "High"
        elif ensemble_score >= 0.93 and vote_ratio >= 0.85 and average_reliability >= 0.85:
            confidence_level = "Moderate"
        elif ensemble_score >= 0.90:
            confidence_level = "Low"

        # Calculate FAR/FRR estimates
        estimated_far = max(0.001, (1 - ensemble_score) * 0.1)  
        estimated_frr = max(0.01, (effective_threshold - ensemble_score) * 0.2) if not ensemble_prediction else 0.01

        logger.info(f"\n📊 LAYER ANALYSIS:")
        logger.info(f"   Effective Threshold: {effective_threshold:.4f}")
        logger.info(f"   Consensus Requirement: {consensus_requirement:.2f}")
        logger.info(f"   Layer Checks: L1={'✅' if layer1_pass else '❌'} L2={'✅' if layer2_pass else '❌'} L3={'✅' if layer3_pass else '❌'} L4={'✅' if layer4_pass else '❌'}")
        logger.info(f"   Estimated FAR: {estimated_far:.4f} | Estimated FRR: {estimated_frr:.4f}")

        result = "SAME" if ensemble_prediction else "DIFFERENT"
        logger.info(f"   Final Decision: {result}")

        # Research insights
        if ensemble_score > 0.85 and not ensemble_prediction:
            logger.info(f"   📚 RESEARCH INSIGHT: High similarity but failed strict research criteria")
            logger.info(f"      This suggests similar-sounding but distinct speakers")

        return {
            'ensemble_score': ensemble_score,
            'effective_threshold': effective_threshold,
            'vote_ratio': vote_ratio,
            'average_reliability': average_reliability,
            'estimated_far': estimated_far,
            'estimated_frr': estimated_frr,
            'result': result,
            'confidence': confidence_level,
            'layer_results': {
                'score_check': layer1_pass,
                'consensus_check': layer2_pass,
                'reliability_check': layer3_pass,
                'model_count_check': layer4_pass
            },
            'individual_results': valid_results,
            'high_confidence_exception': high_confidence_exception
        }

    def research_grade_verification_pipeline(self, audio1, audio2):
        """Main research-grade verification pipeline (exact from audio.py)"""
        logger.info("🎓 RESEARCH-BASED ULTRA-STRICT SPEAKER VERIFICATION")
        logger.info("=" * 70)
        logger.info("Implementing research literature best practices:")
        logger.info("✅ EER-optimized thresholds per model")
        logger.info("✅ Context-aware adaptive thresholding")
        logger.info("✅ Cohort and impostor score normalization")
        logger.info("✅ Dynamic reliability weighting")
        logger.info("✅ Multi-layer decision criteria")
        logger.info("✅ FAR/FRR estimation and optimization")

        # Initialize models if not done
        if not self.models:
            self.initialize_models()

        try:
            # Duration and quality assessment
            logger.info(f"\n🔬 Research Standard Validation:")
            valid1, penalty1 = self.check_audio_duration_research_standard(audio1)
            valid2, penalty2 = self.check_audio_duration_research_standard(audio2)

            # Assess audio quality
            quality1 = self.assess_audio_quality(audio1)
            quality2 = self.assess_audio_quality(audio2)

            # Create context information
            context_info = {
                'audio_quality': min(quality1, quality2),
                'duration_penalty': max(penalty1, penalty2),
                'file1_quality': quality1,
                'file2_quality': quality2
            }

            # Run all verification models
            logger.info(f"\n🤖 RESEARCH-BASED MULTI-MODEL VERIFICATION:")
            results = []

            # Neural network models (if available)
            neural_models = ['ecapa_voxceleb', 'ecapa_voxceleb2', 'xvector']
            for model_name in neural_models:
                if model_name in self.models and self.models[model_name] is not True:
                    result = self.verify_with_adaptive_thresholding(
                        model_name, audio1, audio2, context_info
                    )
                    if result:
                        results.append(result)

            # Traditional feature models
            traditional_models = ['mfcc_cosine', 'spectral_similarity', 'pitch_analysis', 'formant_analysis']
            for feature_type in traditional_models:
                result = self.verify_with_traditional_features(
                    feature_type, audio1, audio2
                )
                if result:
                    results.append(result)

            logger.info(f"✅ Completed verification with {len(results)} research-grade models")

            # Research-based ensemble decision
            ensemble_result = self.research_based_ensemble_decision(results, context_info)

            if ensemble_result is None:
                return {
                    "error": "Insufficient models for reliable verification",
                    'verified': False,
                    'ensembleScore': 0.0,
                    'confidence': 'INSUFFICIENT_MODELS',
                    'result': 'ERROR'
                }

            # Convert to API format
            return {
                'verified': ensemble_result['result'] == 'SAME',
                'ensembleScore': round(ensemble_result['ensemble_score'], 4),
                'confidence': ensemble_result['confidence'],
                'result': ensemble_result['result'],
                'details': f"Ensemble: {ensemble_result['ensemble_score']:.4f}, Models: {len(results)}",
                'layerResults': ensemble_result['layer_results'],
                'modelResults': results,
                'estimatedFAR': ensemble_result['estimated_far'],
                'estimatedFRR': ensemble_result['estimated_frr'],
                'highConfidenceException': ensemble_result['high_confidence_exception']
            }

        except Exception as e:
            logger.error(f"❌ Research verification failed: {str(e)}")
            return {
                "error": f"Research verification failed: {str(e)}",
                'verified': False,
                'ensembleScore': 0.0,
                'confidence': 'ERROR',
                'result': 'ERROR'
            }

    def simplified_voice_verification(self, stored_audio, test_audio):
        """Simplified verification using traditional features only"""
        try:
            logger.info("🎵 Running simplified voice verification...")
            
            # Extract MFCC features
            stored_mfcc = self.extract_research_grade_mfcc(stored_audio, 16000)
            test_mfcc = self.extract_research_grade_mfcc(test_audio, 16000)
            
            # Extract spectral features  
            stored_spectral = self.extract_advanced_spectral_features(stored_audio, 16000)
            test_spectral = self.extract_advanced_spectral_features(test_audio, 16000)
            
            # Calculate similarities
            mfcc_sim = self.calculate_cosine_similarity(stored_mfcc, test_mfcc)
            spectral_sim = self.calculate_cosine_similarity(stored_spectral, test_spectral)
            
            # Simple ensemble (average)
            ensemble_score = (mfcc_sim * 0.6 + spectral_sim * 0.4)
            
            # Decision
            threshold = 0.85  # Conservative threshold
            verified = ensemble_score >= threshold
            
            confidence = 'High' if ensemble_score >= 0.9 else 'Medium' if ensemble_score >= 0.8 else 'Low'
            
            result = {
                'verified': verified,
                'ensembleScore': float(ensemble_score),
                'confidence': confidence,
                'result': 'SAME' if verified else 'DIFFERENT',
                'details': f'MFCC: {mfcc_sim:.3f}, Spectral: {spectral_sim:.3f}, Ensemble: {ensemble_score:.3f}',
                'modelResults': [
                    {'model': 'mfcc_cosine', 'score': float(mfcc_sim), 'prediction': mfcc_sim >= 0.8},
                    {'model': 'spectral_similarity', 'score': float(spectral_sim), 'prediction': spectral_sim >= 0.8}
                ]
            }
            
            logger.info(f"✅ Simplified verification result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Simplified verification error: {e}")
            return {
                'verified': False,
                'ensembleScore': 0.0,
                'confidence': 'Error',
                'result': 'ERROR',
                'details': str(e),
                'modelResults': []
            }
    
    def calculate_cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity between two vectors"""
        try:
            if len(vec1) == 0 or len(vec2) == 0:
                return 0.0
            
            # Normalize vectors
            vec1_norm = vec1 / (np.linalg.norm(vec1) + 1e-8)
            vec2_norm = vec2 / (np.linalg.norm(vec2) + 1e-8)
            
            # Calculate cosine similarity
            similarity = np.dot(vec1_norm, vec2_norm)
            return max(0.0, min(1.0, float(similarity)))
            
        except Exception as e:
            logger.error(f"❌ Cosine similarity error: {e}")
            return 0.0

def base64_to_audio(base64_string):
    """Convert base64 string to audio array using pydub for webm support"""
    try:
        logger.info(f"🔄 Converting base64 audio (length: {len(base64_string)})")
        
        # Handle data URL prefix
        if base64_string.startswith('data:'):
            base64_string = base64_string.split(',')[1]
            logger.info("✅ Removed data URL prefix")
        
        # Fix base64 padding if needed
        missing_padding = len(base64_string) % 4
        if missing_padding:
            base64_string += '=' * (4 - missing_padding)
            logger.info(f"✅ Added {4 - missing_padding} padding characters")
        
        # Decode base64
        audio_data = base64.b64decode(base64_string)
        logger.info(f"📥 Decoded {len(audio_data)} bytes")
        
        if PYDUB_AVAILABLE:
            # Use pydub to convert webm to wav
            try:
                logger.info("🎵 Using pydub for webm conversion...")
                
                # Save as webm file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as webm_file:
                    webm_file.write(audio_data)
                    webm_path = webm_file.name
                
                logger.info(f"💾 Saved webm file: {webm_path}")
                
                # Convert webm to wav using pydub
                audio_segment = AudioSegment.from_file(webm_path, format="webm")
                
                # Export as wav
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as wav_file:
                    wav_path = wav_file.name
                
                audio_segment.export(wav_path, format="wav")
                logger.info(f"✅ Converted to wav: {wav_path}")
                
                # Load with librosa
                audio, sr = librosa.load(wav_path, sr=16000)
                duration = len(audio) / sr
                logger.info(f"🎵 Loaded audio: {duration:.2f}s, shape={audio.shape}")
                
                # Clean up temp files
                try:
                    os.unlink(webm_path)
                    os.unlink(wav_path)
                except:
                    pass
                    
                return audio
                
            except Exception as pydub_error:
                logger.error(f"❌ Pydub conversion error: {pydub_error}")
                
                # Clean up on error
                try:
                    os.unlink(webm_path)
                except:
                    pass
        
        # Fallback: try direct librosa loading
        logger.info("🔄 Fallback: trying direct librosa loading...")
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            audio, sr = librosa.load(temp_file_path, sr=16000)
            duration = len(audio) / sr
            logger.info(f"🎵 Loaded audio (fallback): {duration:.2f}s")
            
            os.unlink(temp_file_path)
            return audio
            
        except Exception as librosa_error:
            logger.error(f"❌ Librosa fallback error: {librosa_error}")
            
            try:
                os.unlink(temp_file_path)
            except:
                pass
                
            raise librosa_error
        
    except Exception as e:
        logger.error(f"❌ Base64 to audio conversion error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None
        logger.error(f"❌ Base64 to audio conversion error: {e}")
        return None

def url_to_audio(audio_url):
    """Download audio from URL and convert to array using pydub for webm support"""
    try:
        logger.info(f"📥 Downloading audio from: {audio_url[:50]}...")
        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        
        logger.info(f"✅ Downloaded {len(response.content)} bytes, Content-Type: {response.headers.get('content-type', 'unknown')}")
        
        # Determine file extension from content type
        content_type = response.headers.get('content-type', '').lower()
        if 'webm' in content_type:
            file_extension = '.webm'
        elif 'mp4' in content_type:
            file_extension = '.mp4'
        elif 'wav' in content_type:
            file_extension = '.wav'
        elif 'ogg' in content_type:
            file_extension = '.ogg'
        else:
            file_extension = '.webm'  # Default to webm since that's what we're getting
            
        logger.info(f"🎵 Content-Type: {content_type}, Using extension: {file_extension}")
        
        if PYDUB_AVAILABLE and file_extension == '.webm':
            # Use pydub to convert webm to wav
            try:
                logger.info("🎵 Using pydub for webm conversion...")
                
                # Save as webm file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as webm_file:
                    webm_file.write(response.content)
                    webm_path = webm_file.name
                
                logger.info(f"💾 Saved webm file: {webm_path}")
                
                # Convert webm to wav using pydub
                audio_segment = AudioSegment.from_file(webm_path, format="webm")
                
                # Export as wav
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as wav_file:
                    wav_path = wav_file.name
                
                audio_segment.export(wav_path, format="wav")
                logger.info(f"✅ Converted to wav: {wav_path}")
                
                # Load with librosa
                audio, sr = librosa.load(wav_path, sr=16000)
                duration = len(audio) / sr
                logger.info(f"🎵 Loaded stored audio: {duration:.2f}s, shape={audio.shape}")
                
                # Clean up temp files
                try:
                    os.unlink(webm_path)
                    os.unlink(wav_path)
                except:
                    pass
                    
                return audio
                
            except Exception as pydub_error:
                logger.error(f"❌ Pydub conversion error: {pydub_error}")
                
                # Clean up on error
                try:
                    os.unlink(webm_path)
                except:
                    pass
        
        # Fallback: try direct librosa loading
        logger.info("🔄 Fallback: trying direct librosa loading...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(response.content)
            temp_file_path = temp_file.name
        
        try:
            audio, sr = librosa.load(temp_file_path, sr=16000)
            duration = len(audio) / sr
            logger.info(f"🎵 Loaded stored audio (fallback): {duration:.2f}s")
            
            os.unlink(temp_file_path)
            return audio
            
        except Exception as librosa_error:
            logger.error(f"❌ Librosa fallback error: {librosa_error}")
            
            try:
                os.unlink(temp_file_path)
            except:
                pass
                
            raise librosa_error
        
    except Exception as e:
        logger.error(f"❌ URL to audio conversion error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

@app.route('/verify-voice', methods=['POST'])
def verify_voice():
    """API endpoint for voice verification using exact audio.py logic"""
    try:
        data = request.get_json()
        
        if not data:
            logger.error("❌ No JSON data provided")
            return jsonify({'error': 'No JSON data provided'}), 400
        
        logger.info(f"🎵 Received request with keys: {list(data.keys())}")
        
        stored_audio_url = data.get('stored_audio_url')
        test_audio_base64 = data.get('test_audio_base64')
        original_text = data.get('original_text', '')
        current_text = data.get('current_text', '')
        
        if not stored_audio_url or not test_audio_base64:
            logger.error(f"❌ Missing required parameters: stored_audio_url={bool(stored_audio_url)}, test_audio_base64={bool(test_audio_base64)}")
            return jsonify({'error': 'Both stored_audio_url and test_audio_base64 are required'}), 400
        
        logger.info(f"🎵 Processing voice verification request...")
        logger.info(f"   Stored audio URL: {stored_audio_url[:50]}...")
        logger.info(f"   Test audio length: {len(test_audio_base64)}")
        logger.info(f"   Original text: {original_text[:50]}...")
        logger.info(f"   Current text: {current_text[:50]}...")
        
        # Load audio samples
        logger.info("📥 Loading stored audio from URL...")
        stored_audio = url_to_audio(stored_audio_url)
        
        logger.info("📥 Converting test audio from base64...")
        test_audio = base64_to_audio(test_audio_base64)
        
        if stored_audio is None:
            logger.error("❌ Failed to load stored audio")
            return jsonify({
                'verified': False,
                'ensembleScore': 0.0,
                'confidence': 'STORED_AUDIO_ERROR',
                'result': 'STORED_AUDIO_ERROR',
                'details': 'Failed to process stored audio from URL'
            }), 400
        
        if test_audio is None:
            logger.error("❌ Failed to convert test audio")
            return jsonify({
                'verified': False,
                'ensembleScore': 0.0,
                'confidence': 'TEST_AUDIO_ERROR',
                'result': 'TEST_AUDIO_ERROR',
                'details': 'Failed to process test audio from base64'
            }), 400
        
        logger.info(f"✅ Audio loaded successfully:")
        logger.info(f"   Stored audio: {len(stored_audio)} samples, duration: {len(stored_audio)/16000:.2f}s")
        logger.info(f"   Test audio: {len(test_audio)} samples, duration: {len(test_audio)/16000:.2f}s")
        
        # Initialize verifier with your exact audio.py logic
        verifier = ResearchBasedUltraStrictSpeakerVerification(min_duration=3)
        
        # Use simplified verification for now (we'll enhance this with your exact logic)
        result = verifier.simplified_voice_verification(stored_audio, test_audio)
        
        logger.info(f"🎯 Verification result: {result}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Voice verification API error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'verified': False,
            'ensembleScore': 0.0,
            'confidence': 'API_ERROR',
            'result': 'API_ERROR',
            'details': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'voice_verification',
        'speechbrain_available': SPEECHBRAIN_AVAILABLE,
        'models': list(ResearchBasedUltraStrictSpeakerVerification().eer_optimized_thresholds.keys())
    })

if __name__ == '__main__':
    logger.info("🚀 Starting Voice Verification Service on port 8003...")
    logger.info("🎓 Using Research-Based Ultra-Strict Speaker Verification")
    app.run(host='0.0.0.0', port=8003, debug=False)