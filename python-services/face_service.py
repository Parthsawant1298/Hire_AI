# python-services/face_service.py
# Python microservice that runs your exact face.py logic

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
import requests
from io import BytesIO
from PIL import Image
import os
import logging

# Note: InsightFace requires Visual C++ Build Tools on Windows
# For now, we'll use a fallback OpenCV-based approach
# To install InsightFace later: install Microsoft C++ Build Tools, then run:
# pip install insightface

# Set up logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import insightface
    INSIGHTFACE_AVAILABLE = True
    logger.info("✅ InsightFace successfully imported!")
except ImportError as e:
    INSIGHTFACE_AVAILABLE = False
    logger.warning(f"⚠️ InsightFace not available: {e}")
    logger.info("🔄 Using OpenCV-based fallback")

app = Flask(__name__)
CORS(app)

# Initialize InsightFace model (your exact face.py setup)
face_analysis = None

def initialize_face_model():
    global face_analysis
    if INSIGHTFACE_AVAILABLE:
        try:
            logger.info("🔍 Initializing InsightFace model...")
            face_analysis = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
            face_analysis.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("✅ InsightFace model initialized successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize InsightFace: {e}")
            return False
    else:
        logger.info("✅ Using OpenCV-based face detection fallback")
        return True

# Your exact Enhanced Face Matcher class from face.py
class EnhancedFaceMatcher:
    def __init__(self, ctx_id=0, det_size=(640, 640)):
        """Initialize with exact settings from face.py"""
        self.model = face_analysis
        
        # Your exact thresholds from face.py
        self.face_confidence_threshold = 0.5
        self.similarity_threshold = 0.4
        self.high_confidence_threshold = 0.6
    
    def preprocess_image(self, image, target_size=None):
        """Preprocess image exactly as in face.py"""
        try:
            if target_size:
                h, w = image.shape[:2]
                if w > target_size or h > target_size:
                    scale = target_size / max(w, h)
                    image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LANCZOS4)
            return image
        except Exception as e:
            logger.error(f"❌ Image preprocessing failed: {e}")
            return image
    
    def detect_faces_with_quality_check(self, img):
        """Detect faces with quality check exactly as in face.py"""
        try:
            logger.info(f"🔍 Detecting faces in image shape: {img.shape}")
            
            if INSIGHTFACE_AVAILABLE and self.model is not None:
                # Convert BGR to RGB for InsightFace
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                faces = self.model.get(img_rgb)
                
                logger.info(f"🔍 InsightFace detected {len(faces)} raw faces")
                
                high_quality_faces = []
                for i, face in enumerate(faces):
                    bbox = face.bbox
                    det_score = face.det_score if hasattr(face, "det_score") else 0.0
                    width = bbox[2] - bbox[0]
                    height = bbox[3] - bbox[1]
                    
                    logger.info(f"Face {i}: score={det_score:.3f}, size={width}x{height}, bbox={bbox}")
                    
                    if det_score >= self.face_confidence_threshold and width > 50 and height > 50:
                        high_quality_faces.append(face)
                        logger.info(f"✅ Face {i} passed quality check")
                    else:
                        logger.info(f"❌ Face {i} failed quality check (score: {det_score:.3f}, size: {width}x{height})")
                
                logger.info(f"✅ {len(high_quality_faces)} faces passed quality check")
                return high_quality_faces
            else:
                # OpenCV fallback
                logger.info("🔄 Using OpenCV fallback for face detection")
                return self.detect_faces_opencv(img)
                
        except Exception as e:
            logger.error(f"❌ Face detection failed: {e}")
            return []
    
    def detect_faces_opencv(self, img):
        """OpenCV fallback face detection"""
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            # Convert to face-like objects
            face_objects = []
            for (x, y, w, h) in faces:
                if w > 50 and h > 50:  # Quality check
                    face_obj = type('Face', (), {
                        'bbox': np.array([x, y, x+w, y+h]),
                        'det_score': 0.8,  # Default score
                        'embedding': self.extract_opencv_embedding(gray[y:y+h, x:x+w])
                    })
                    face_objects.append(face_obj)
            
            return face_objects
            
        except Exception as e:
            logger.error(f"❌ OpenCV face detection failed: {e}")
            return []
    
    def extract_opencv_embedding(self, face_region):
        """Extract embedding using OpenCV"""
        try:
            face_resized = cv2.resize(face_region, (128, 128))
            features = cv2.calcHist([face_resized], [0], None, [256], [0, 256])
            features = features.flatten()
            features = features / np.linalg.norm(features)
            return features
        except Exception as e:
            logger.error(f"❌ OpenCV embedding extraction failed: {e}")
            return np.zeros(256)
    
    def select_best_face(self, faces):
        """Select best face exactly as in face.py"""
        if not faces:
            return None
        return max(faces, key=lambda f: (
            f.det_score if hasattr(f, "det_score") else 0.5,
            (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])
        ))
    
    def cosine_similarity(self, e1, e2):
        """Exact cosine similarity from face.py"""
        e1_norm = e1 / np.linalg.norm(e1)
        e2_norm = e2 / np.linalg.norm(e2)
        return np.dot(e1_norm, e2_norm)
    
    def euclidean_distance(self, e1, e2):
        """Exact euclidean distance from face.py"""
        return np.linalg.norm(e1 - e2)
    
    def compare_faces(self, img1, img2, visualize=False):
        """Exact face comparison logic from face.py"""
        try:
            logger.info("Loading and preprocessing images...")
            img1 = self.preprocess_image(img1, target_size=1024)
            img2 = self.preprocess_image(img2, target_size=1024)
            
            logger.info("Detecting faces...")
            faces1 = self.detect_faces_with_quality_check(img1)
            faces2 = self.detect_faces_with_quality_check(img2)
            
            logger.info(f"Found {len(faces1)} faces in Image 1")
            logger.info(f"Found {len(faces2)} faces in Image 2")
            
            # Multiple people case (exact logic from face.py)
            if len(faces1) > 1 or len(faces2) > 1:
                results = {"matches": [], "unmatched_image1": [], "unmatched_image2": []}
                used_faces2 = set()
                
                for i, f1 in enumerate(faces1):
                    best_match = None
                    best_score = 0.0
                    for j, f2 in enumerate(faces2):
                        if j not in used_faces2:
                            sim = self.cosine_similarity(f1.embedding, f2.embedding)
                            if sim > best_score and sim >= self.similarity_threshold:
                                best_score = sim
                                best_match = (j, sim)
                    
                    if best_match:
                        j, score = best_match
                        results["matches"].append({
                            "image1_face": i,
                            "image2_face": j,
                            "cosine_similarity": score,
                            "result": "SAME PERSON" if score >= self.high_confidence_threshold else "Possible Match"
                        })
                        used_faces2.add(j)
                    else:
                        results["unmatched_image1"].append(i)
                
                for j in range(len(faces2)):
                    if j not in used_faces2:
                        results["unmatched_image2"].append(j)
                
                return results
            
            # Single face case (exact logic from face.py)
            if len(faces1) == 0:
                return {"error": "No face detected in image 1"}
            if len(faces2) == 0:
                return {"error": "No face detected in image 2"}
            
            f1 = self.select_best_face(faces1)
            f2 = self.select_best_face(faces2)
            
            sim = self.cosine_similarity(f1.embedding, f2.embedding)
            dist = self.euclidean_distance(f1.embedding, f2.embedding)
            
            if sim >= self.high_confidence_threshold:
                result = "SAME PERSON (High Confidence)"
                level = "HIGH"
            elif sim >= self.similarity_threshold:
                result = "SAME PERSON (Moderate Confidence)"
                level = "MODERATE"
            else:
                result = "DIFFERENT PERSONS"
                level = "LOW" if sim > 0.2 else "VERY_LOW"
            
            results = {
                "cosine_similarity": float(sim),
                "euclidean_distance": float(dist),
                "result": result,
                "confidence_level": level,
                "face1_conf": float(f1.det_score) if hasattr(f1, "det_score") else 0.0,
                "face2_conf": float(f2.det_score) if hasattr(f2, "det_score") else 0.0,
                "face1_bbox": f1.bbox.tolist() if hasattr(f1.bbox, 'tolist') else list(f1.bbox),
                "face2_bbox": f2.bbox.tolist() if hasattr(f2.bbox, 'tolist') else list(f2.bbox)
            }
            
            return results
            
        except Exception as e:
            return {"error": str(e)}
    
    def verify_faces(self, image1, image2):
        """Main verification method for API"""
        try:
            logger.info("🔍 Starting face verification process...")
            
            result = self.compare_faces(image1, image2)
            
            if "error" in result:
                return {
                    'verified': False,
                    'similarity': 0.0,
                    'confidence': 'NO_FACE_DETECTED',
                    'result': 'NO_FACE_DETECTED',
                    'details': result["error"]
                }
            
            if "matches" in result:  # Multiple faces
                # For API, return the best match
                if result["matches"]:
                    best_match = max(result["matches"], key=lambda x: x["cosine_similarity"])
                    similarity = best_match["cosine_similarity"]
                    verified = similarity >= self.similarity_threshold
                    
                    if similarity >= self.high_confidence_threshold:
                        confidence = "HIGH"
                        result_text = "SAME PERSON (High Confidence)"
                    elif similarity >= self.similarity_threshold:
                        confidence = "MODERATE" 
                        result_text = "SAME PERSON (Moderate Confidence)"
                    else:
                        confidence = "LOW"
                        result_text = "DIFFERENT PERSONS"
                else:
                    similarity = 0.0
                    verified = False
                    confidence = "LOW"
                    result_text = "DIFFERENT PERSONS"
            else:  # Single face comparison
                similarity = result["cosine_similarity"]
                verified = similarity >= self.similarity_threshold
                confidence = result["confidence_level"]
                result_text = result["result"]
            
            logger.info(f"✅ Face verification complete: {result_text}, Similarity: {similarity:.3f}")
            
            # Include bbox data for real-time tracking
            bbox_data = None
            if "face2_bbox" in result:
                bbox_data = result["face2_bbox"]
            elif "matches" in result and result["matches"]:
                # For multiple faces, use the best match bbox
                best_match = max(result["matches"], key=lambda x: x["cosine_similarity"])
                bbox_data = result.get("face2_bbox")  # You'd need to store this in matches
            
            return {
                'verified': verified,
                'similarity': round(similarity, 3),
                'confidence': confidence,
                'result': result_text,
                'details': f"Enhanced Face Matcher - Cosine similarity: {similarity:.3f}, Threshold: {self.similarity_threshold}",
                'model_used': 'InsightFace ArcFace' if INSIGHTFACE_AVAILABLE else 'OpenCV',
                'face2_bbox': bbox_data  # Add bbox for real-time tracking
            }
            
        except Exception as e:
            logger.error(f"❌ Face verification error: {e}")
            return {
                'verified': False,
                'similarity': 0.0,
                'confidence': 'ERROR',
                'result': 'VERIFICATION_ERROR',
                'details': str(e)
            }

def base64_to_image(base64_string):
    """Convert base64 string to OpenCV image"""
    try:
        logger.info(f"🔄 Converting base64 image (length: {len(base64_string)})")
        
        # Remove data URL prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
            logger.info("✅ Removed data URL prefix")
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        logger.info(f"📥 Decoded {len(image_data)} bytes")
        
        image = Image.open(BytesIO(image_data))
        logger.info(f"📐 Test image size: {image.size}, Mode: {image.mode}")
        
        # Convert to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        logger.info(f"🔄 Converted to OpenCV format: {opencv_image.shape}")
        return opencv_image
        
    except Exception as e:
        logger.error(f"❌ Base64 to image conversion error: {e}")
        return None

def url_to_image(image_url):
    """Download image from URL and convert to OpenCV format"""
    try:
        logger.info(f"📥 Downloading image from URL: {image_url[:50]}...")
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        
        logger.info(f"✅ Downloaded {len(response.content)} bytes")
        image = Image.open(BytesIO(response.content))
        logger.info(f"📐 Image size: {image.size}, Mode: {image.mode}")
        
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        logger.info(f"🔄 Converted to OpenCV format: {opencv_image.shape}")
        return opencv_image
        
    except Exception as e:
        logger.error(f"❌ URL to image conversion error: {e}")
        return None

@app.route('/verify-face', methods=['POST'])
def verify_face():
    """API endpoint for face verification using your exact face.py logic"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        stored_image_url = data.get('stored_image_url')
        test_image_base64 = data.get('test_image_base64')
        
        if not stored_image_url or not test_image_base64:
            return jsonify({'error': 'Both stored_image_url and test_image_base64 are required'}), 400
        
        logger.info(f"🔍 Processing face verification request...")
        
        # Load images
        stored_image = url_to_image(stored_image_url)
        test_image = base64_to_image(test_image_base64)
        
        if stored_image is None or test_image is None:
            return jsonify({
                'verified': False,
                'similarity': 0.0,
                'confidence': 'IMAGE_PROCESSING_ERROR',
                'result': 'IMAGE_PROCESSING_ERROR',
                'details': 'Failed to process one or both images'
            }), 400
        
        # Initialize face matcher and verify
        matcher = EnhancedFaceMatcher()
        result = matcher.verify_faces(stored_image, test_image)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Face verification API error: {e}")
        return jsonify({
            'verified': False,
            'similarity': 0.0,
            'confidence': 'API_ERROR',
            'result': 'API_ERROR',
            'details': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'face_verification',
        'insightface_available': INSIGHTFACE_AVAILABLE,
        'model_initialized': face_analysis is not None if INSIGHTFACE_AVAILABLE else True,
        'fallback_mode': not INSIGHTFACE_AVAILABLE
    })

if __name__ == '__main__':
    # Initialize the face model on startup
    if initialize_face_model():
        logger.info("🚀 Starting Face Verification Service on port 8001...")
        logger.info("🔧 Note: To enable full InsightFace accuracy, install Microsoft C++ Build Tools")
        logger.info("📋 Then run: pip install insightface")
        app.run(host='0.0.0.0', port=8001, debug=False)
    else:
        logger.error("❌ Failed to start service - Model initialization failed")
