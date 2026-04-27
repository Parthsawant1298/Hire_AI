
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
import os
import tempfile
import io
import pdfplumber
import asyncio
from datetime import datetime

# Import the existing verifiers
try:
    from voice_service import voice_verifier
    VOICE_READY = True
except Exception as e:
    print(f"Error loading voice verifier: {e}")
    VOICE_READY = False

try:
    from face_service import face_verifier
    FACE_READY = True
except Exception as e:
    print(f"Error loading face verifier: {e}")
    FACE_READY = False

# Import Resume Optimizer logic
try:
    from resume_ai_agent import process_resume
    from resume_fastapi import sanitize_resume_json, html_to_pdf, jinja_env
    RESUME_READY = True
except Exception as e:
    print(f"Error loading resume optimizer: {e}")
    RESUME_READY = False

# Import Roadmap & Course logic
try:
    from roadmap_agent import generate_roadmap
    from course import handle_chat, generate_course_api, get_all_courses, delete_course_api
    AGENTS_READY = True
except Exception as e:
    print(f"Error loading career agents: {e}")
    AGENTS_READY = False

app = Flask(__name__)
CORS(app, supports_credentials=True)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Temporary directory for generated PDFs
OUTPUT_DIR = tempfile.mkdtemp()

# Helper to run async code in Flask
def run_async(coro):
    return asyncio.run(coro)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'services': {
            'voice': 'ready' if VOICE_READY else 'failed',
            'face': 'ready' if FACE_READY else 'failed',
            'resume': 'ready' if RESUME_READY else 'failed',
            'agents': 'ready' if AGENTS_READY else 'failed'
        },
        'version': '2.0-unified'
    })

# --- Verification Endpoints ---

@app.route('/verify/voice', methods=['POST'])
def verify_voice_route():
    if not VOICE_READY:
        return jsonify({'error': 'Voice service not initialized'}), 500
    data = request.json
    return jsonify(voice_verifier.verify_voices(data.get('stored_voice_url'), data.get('test_voice_base64')))

@app.route('/verify/face', methods=['POST'])
def verify_face_route():
    if not FACE_READY:
        return jsonify({'error': 'Face service not initialized'}), 500
    data = request.json
    return jsonify(face_verifier.verify_faces(data.get('stored_image_url'), data.get('test_image_base64')))

# --- Resume Optimizer Endpoints ---

@app.route('/process-resume', methods=['POST'])
def process_resume_route():
    if not RESUME_READY:
        return jsonify({'error': 'Resume service not initialized'}), 500
    
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        job_description = request.form.get('job_description', '')
        
        # 1. Extract text
        file_bytes = file.read()
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages).strip()
        
        # 2. Process with AI
        result = process_resume(raw_text=text, job_description=job_description)
        
        # 3. Generate PDF
        template_data = sanitize_resume_json(result["fixed_json"])
        template = jinja_env.get_template("resume_template.html")
        html_out = template.render(**template_data)
        
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Optimized_Resume_{ts}.pdf"
        pdf_path = os.path.join(OUTPUT_DIR, filename)
        
        if html_to_pdf(html_out, pdf_path):
            return jsonify({
                "success": True,
                "download_url": f"/download/{filename}",
                "resume_data": template_data,
                "feedback": result["feedback"]
            })
        else:
            return jsonify({'error': 'PDF generation failed'}), 500
            
    except Exception as e:
        logger.error(f"Resume error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>', methods=['GET'])
def download_resume(filename):
    return send_from_directory(OUTPUT_DIR, filename)

# --- Career & Roadmap Endpoints ---

@app.route('/generate-roadmap', methods=['POST'])
def roadmap_route():
    if not AGENTS_READY:
        return jsonify({'error': 'Roadmap service not initialized'}), 500
    data = request.json
    result = run_async(generate_roadmap(data.get('topic'), data.get('level')))
    return jsonify(result)

@app.route('/chat', methods=['POST'])
def chat_route():
    if not AGENTS_READY:
        return jsonify({'error': 'Course service not initialized'}), 500
    data = request.json
    result = run_async(handle_chat(data.get('message'), data.get('conversation_history', [])))
    return jsonify(result)

@app.route('/generate-course', methods=['POST'])
def generate_course_route():
    if not AGENTS_READY:
        return jsonify({'error': 'Course service not initialized'}), 500
    data = request.json
    user_id = request.cookies.get('userId')
    result = run_async(generate_course_api(data.get('topic'), data.get('difficulty', 'Beginner'), user_id))
    return jsonify(result)

@app.route('/courses', methods=['GET'])
def get_courses_list_route():
    if not AGENTS_READY:
        return jsonify({'error': 'Course service not initialized'}), 500
    user_id = request.cookies.get('userId')
    result = run_async(get_all_courses(user_id))
    return jsonify(result)

@app.route('/courses/<course_id>', methods=['DELETE'])
def delete_course_route(course_id):
    if not AGENTS_READY:
        return jsonify({'error': 'Course service not initialized'}), 500
    user_id = request.cookies.get('userId')
    result = run_async(delete_course_api(course_id, user_id))
    return jsonify({"success": result})

# --- Job Matching Endpoints ---

@app.route('/upload-resume', methods=['POST'])
def job_match_route():
    if not AGENTS_READY:
        return jsonify({'error': 'Job matching service not initialized'}), 500
    from job_matcher_service import process_resume_and_search
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    location = request.form.get('location', 'Remote')
    job_type = request.form.get('job_type', 'Any')
    salary_expectation = request.form.get('salary_expectation', '')
    industry = request.form.get('industry', '')
    
    # Save temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name
        
    try:
        result = process_resume_and_search(
            tmp_path, 
            location, 
            job_type, 
            salary_expectation, 
            industry
        )
        return jsonify(result)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"🚀 HireAI Unified Production Gateway starting on port {port}")
    app.run(host='0.0.0.0', port=port)
