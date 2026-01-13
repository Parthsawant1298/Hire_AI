# python-services/face_service_fixed.py
# FIXED Face Verification Service - Fast detection with proper face matching

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import requests
from io import BytesIO
from PIL import Image
import logging
import tempfile
import os

# Try to import InsightFace for better face detection
try:
    import insightface
    INSIGHTFACE_AVAILABLE = True
    logging.getLogger().info("✅ InsightFace successfully imported!")
except ImportError as e:
    INSIGHTFACE_AVAILABLE = False
    logging.getLogger().warning(f"⚠️ InsightFace not available: {e}")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class FastFaceVerification:
    def __init__(self):
        # FIXED: Optimized thresholds for better accuracy and speed
        self.face_threshold = 0.6  # Reasonable threshold
        self.high_confidence_threshold = 0.7
        self.min_face_size = 50  # Minimum face size in pixels
        self.max_image_size = 1024  # Resize large images for speed
        
        # Initialize face detection models
        self.insight_model = None
        self.cv2_cascade = None
        
        self._initialize_models()
        
        logger.info("👤 FastFaceVerification initialized")
        logger.info(f"📊 Face threshold: {self.face_threshold}")

    def _initialize_models(self):
        """Initialize face detection models"""
        try:
            # Initialize InsightFace (faster and more accurate)
            if INSIGHTFACE_AVAILABLE:
                logger.info("🔄 Initializing InsightFace model...")
                self.insight_model = insightface.app.FaceAnalysis(
                    providers=['CPUExecutionProvider']  # Use CPU for compatibility
                )
                self.insight_model.prepare(ctx_id=0, det_size=(640, 640))
                logger.info("✅ InsightFace model initialized successfully")
            
            # Initialize OpenCV cascade as fallback
            logger.info("🔄 Initializing OpenCV cascade...")
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(cascade_path):
                self.cv2_cascade = cv2.CascadeClassifier(cascade_path)
                logger.info("✅ OpenCV cascade initialized successfully")
            else:
                logger.error("❌ OpenCV cascade file not found")
                
        except Exception as e:
            logger.error(f"❌ Model initialization failed: {e}")

    def download_image_from_url(self, image_url):
        """Download image from Cloudinary URL"""
        try:
            logger.info(f"📥 Downloading image from: {image_url}")
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            image_data = BytesIO(response.content)
            logger.info(f"✅ Downloaded {len(response.content)} bytes")
            return image_data
        except Exception as e:
            logger.error(f"❌ Failed to download image: {e}")
            raise

    def preprocess_image(self, image_data):
        """Preprocess image for faster detection"""
        try:
            # Load image
            if isinstance(image_data, (BytesIO, str)):
                if isinstance(image_data, str):
                    # Base64 string
                    image_bytes = base64.b64decode(image_data.split(',')[1])
                    image_data = BytesIO(image_bytes)
                
                pil_image = Image.open(image_data)
            else:
                pil_image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if needed
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # FIXED: Resize large images for speed
            if max(pil_image.size) > self.max_image_size:
                ratio = self.max_image_size / max(pil_image.size)
                new_size = (int(pil_image.size[0] * ratio), int(pil_image.size[1] * ratio))
                pil_image = pil_image.resize(new_size, Image.Resampling.LANCZOS)
                logger.info(f"📐 Resized image to: {new_size}")
            
            # Convert to numpy array
            image_array = np.array(pil_image)
            
            logger.info(f"🖼️ Processed image shape: {image_array.shape}")
            return image_array, pil_image
            
        except Exception as e:
            logger.error(f"❌ Image preprocessing failed: {e}")
            raise

    def detect_best_face_insightface(self, image_array):
        """Detect best face using InsightFace (primary method)"""
        try:
            if not self.insight_model:
                return None
                
            logger.info("🔍 Detecting face with InsightFace...")
            
            # Detect faces
            faces = self.insight_model.get(image_array)
            
            if not faces:
                logger.warning("⚠️ No faces detected by InsightFace")
                return None
            
            # FIXED: Select best face based on detection score and size
            best_face = max(faces, key=lambda x: x.det_score * np.prod(x.bbox[2:] - x.bbox[:2]))
            
            # Quality checks
            bbox = best_face.bbox.astype(int)
            face_width = bbox[2] - bbox[0]
            face_height = bbox[3] - bbox[1]
            
            if face_width < self.min_face_size or face_height < self.min_face_size:
                logger.warning(f"⚠️ Face too small: {face_width}x{face_height}")
                return None
            
            if best_face.det_score < 0.5:
                logger.warning(f"⚠️ Low detection confidence: {best_face.det_score}")
                return None
            
            logger.info(f"✅ InsightFace detected face: score={best_face.det_score:.3f}, size={face_width}x{face_height}")
            
            return {
                'bbox': bbox.tolist(),
                'embedding': best_face.embedding,
                'confidence': float(best_face.det_score),
                'method': 'InsightFace'
            }
            
        except Exception as e:
            logger.error(f"❌ InsightFace detection failed: {e}")
            return None

    def detect_best_face_opencv(self, image_array):
        """Detect best face using OpenCV (fallback method)"""
        try:
            if not self.cv2_cascade:
                return None
                
            logger.info("🔍 Detecting face with OpenCV...")
            
            # Convert to grayscale
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            
            # Detect faces
            faces = self.cv2_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(self.min_face_size, self.min_face_size)
            )
            
            if len(faces) == 0:
                logger.warning("⚠️ No faces detected by OpenCV")
                return None
            
            # Select largest face
            areas = [w * h for (x, y, w, h) in faces]
            best_idx = np.argmax(areas)
            x, y, w, h = faces[best_idx]
            
            # Extract face region for embedding simulation
            face_region = image_array[y:y+h, x:x+w]
            
            # Simple embedding: resize to fixed size and flatten
            face_resized = cv2.resize(face_region, (128, 128))
            embedding = face_resized.flatten().astype(np.float32)
            embedding = embedding / (np.linalg.norm(embedding) + 1e-8)  # Normalize
            
            logger.info(f"✅ OpenCV detected face: size={w}x{h}")
            
            return {
                'bbox': [x, y, x+w, y+h],
                'embedding': embedding,
                'confidence': 0.8,  # Fixed confidence for OpenCV
                'method': 'OpenCV'
            }
            
        except Exception as e:
            logger.error(f"❌ OpenCV detection failed: {e}")
            return None

    def detect_best_face(self, image_array):
        """Detect best face using available methods"""
        # Try InsightFace first (faster and more accurate)
        if INSIGHTFACE_AVAILABLE:
            face_data = self.detect_best_face_insightface(image_array)
            if face_data:
                return face_data
        
        # Fallback to OpenCV
        face_data = self.detect_best_face_opencv(image_array)
        if face_data:
            return face_data
        
        logger.warning("⚠️ No face detected by any method")
        return None

    def calculate_similarity(self, embedding1, embedding2):
        """Calculate normalized cosine similarity between face embeddings"""
        try:
            # Ensure embeddings are numpy arrays
            emb1 = np.array(embedding1, dtype=np.float32)
            emb2 = np.array(embedding2, dtype=np.float32)
            
            # Normalize embeddings
            emb1_norm = emb1 / (np.linalg.norm(emb1) + 1e-8)
            emb2_norm = emb2 / (np.linalg.norm(emb2) + 1e-8)
            
            # Calculate cosine similarity
            similarity = np.dot(emb1_norm, emb2_norm)
            
            # Ensure similarity is between 0 and 1
            similarity = max(0.0, min(1.0, (similarity + 1) / 2))
            
            logger.info(f"📊 Calculated similarity: {similarity:.4f}")
            return float(similarity)
            
        except Exception as e:
            logger.error(f"❌ Similarity calculation failed: {e}")
            return 0.0

    def verify_faces(self, stored_image_url, test_image_base64):
        """Main face verification method with improved speed and accuracy"""
        try:
            logger.info("👤 Starting face verification...")
            
            # Download and preprocess stored image
            stored_image_data = self.download_image_from_url(stored_image_url)
            stored_image_array, _ = self.preprocess_image(stored_image_data)
            
            # Preprocess test image
            test_image_array, _ = self.preprocess_image(test_image_base64)
            
            # Detect faces
            logger.info("🔍 Detecting face in stored image...")
            stored_face = self.detect_best_face(stored_image_array)
            
            if not stored_face:
                raise ValueError("No face detected in stored image")
            
            logger.info("🔍 Detecting face in test image...")
            test_face = self.detect_best_face(test_image_array)
            
            if not test_face:
                raise ValueError("No face detected in test image")
            
            # Calculate similarity
            similarity = self.calculate_similarity(
                stored_face['embedding'], 
                test_face['embedding']
            )
            
            # FIXED: Use proper threshold for verification
            verified = similarity >= self.face_threshold
            
            # Determine confidence level
            if similarity >= self.high_confidence_threshold:
                confidence = 'HIGH'
            elif verified:
                confidence = 'MODERATE' 
            else:
                confidence = 'LOW'
            
            result = {
                'verified': verified,
                'similarity': float(similarity),
                'confidence': confidence,
                'threshold_used': self.face_threshold,
                'stored_face': {
                    'bbox': stored_face['bbox'],
                    'confidence': stored_face['confidence'],
                    'method': stored_face['method']
                },
                'test_face': {
                    'bbox': test_face['bbox'], 
                    'confidence': test_face['confidence'],
                    'method': test_face['method']
                },
                'bbox': test_face['bbox'],  # For UI overlay
                'model_used': f"FastFaceVerification_{test_face['method']}"
            }
            
            logger.info(f"🎯 VERIFICATION RESULT: {verified}")
            logger.info(f"📊 Similarity: {similarity:.4f} (threshold: {self.face_threshold})")
            logger.info(f"🎖️ Confidence: {confidence}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Face verification failed: {e}")
            return {
                'verified': False,
                'similarity': 0.0,
                'confidence': 'ERROR',
                'error': str(e),
                'model_used': 'FastFaceVerification_Error'
            }

# Initialize the face verification system
face_verifier = FastFaceVerification()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'face_verification_fixed',
        'version': '2.0',
        'insightface_available': INSIGHTFACE_AVAILABLE,
        'opencv_available': face_verifier.cv2_cascade is not None,
        'thresholds': {
            'face_threshold': face_verifier.face_threshold,
            'min_face_size': face_verifier.min_face_size
        }
    })

@app.route('/verify', methods=['POST'])
def verify_face():
    """Face verification endpoint"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        stored_image_url = data.get('stored_image_url')
        test_image_base64 = data.get('test_image_base64')
        
        if not stored_image_url or not test_image_base64:
            return jsonify({'error': 'Missing stored_image_url or test_image_base64'}), 400
        
        logger.info(f"👤 Face verification request received")
        logger.info(f"📥 Stored URL: {stored_image_url[:50]}...")
        logger.info(f"📥 Test image: {len(test_image_base64)} chars")
        
        # Perform verification
        result = face_verifier.verify_faces(stored_image_url, test_image_base64)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ API error: {e}")
        return jsonify({
            'verified': False,
            'similarity': 0.0,
            'confidence': 'ERROR',
            'error': str(e),
            'model_used': 'FastFaceVerification_Error'
        }), 500

if __name__ == '__main__':
    logger.info("🚀 Starting Fixed Face Verification Service...")
    logger.info(f"👤 Face threshold: {face_verifier.face_threshold}")
    logger.info(f"🔍 InsightFace available: {INSIGHTFACE_AVAILABLE}")
    logger.info(f"👁️ OpenCV cascade available: {face_verifier.cv2_cascade is not None}")
    app.run(host='0.0.0.0', port=8001, debug=True)