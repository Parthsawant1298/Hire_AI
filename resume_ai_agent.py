"""
resume_main.py — HireAI Resume Optimizer API
============================================
Endpoints:
  POST /process-resume          → Full pipeline PDF → optimized PDF
  GET  /download/{filename}     → Download generated PDF
  GET  /health                  → Health check
"""

import io
import os
import sys
import tempfile
from datetime import datetime

import pdfplumber
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa

sys.path.append(os.path.dirname(__file__))
from resume_ai_agent import process_resume

# ============================================================
# APP
# ============================================================
app = FastAPI(title="HireAI Resume Optimizer", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR   = tempfile.mkdtemp()
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "lib", "templates")
if not os.path.exists(TEMPLATE_DIR):
    TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")

jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


# ============================================================
# HELPERS
# ============================================================
def extract_text(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return "\n".join(
            p.extract_text() or "" for p in pdf.pages
        ).strip()


def html_to_pdf(html: str, path: str) -> bool:
    try:
        with open(path, "wb") as f:
            status = pisa.CreatePDF(html, dest=f)
        return not status.err
    except Exception as e:
        print(f"PDF generation error: {e}")
        return False


def sanitize_resume_json(data: dict) -> dict:
    """
    Deep sanitizer — runs BEFORE template rendering.
    Fixes all issues the LLM sometimes still returns:
      1. "None"/"null" string values  → empty string
      2. Education B.E. → Bachelor of Engineering in Computer Science
      3. Certifications → pipe format (Name | Issuer | Year)
      4. Experience/project location "None" → empty string
    """
    NULL_STRINGS = {"none", "null", "n/a", "na", "undefined", ""}

    def clean(val):
        if val is None:
            return ""
        if isinstance(val, str) and val.strip().lower() in NULL_STRINGS:
            return ""
        return val

    # 1. Experience location
    for exp in data.get("experience_list", []):
        exp["location"] = clean(exp.get("location", ""))

    # 2. Project date
    for proj in data.get("projects_list", []):
        proj["date"] = clean(proj.get("date", ""))

    # 3. Education — expand short degree + combine with field
    DEGREE_MAP = {
        "b.e":    "Bachelor of Engineering",
        "be":     "Bachelor of Engineering",
        "b.tech": "Bachelor of Technology",
        "btech":  "Bachelor of Technology",
        "m.e":    "Master of Engineering",
        "m.tech": "Master of Technology",
        "m.s":    "Master of Science",
        "ms":     "Master of Science",
        "mba":    "Master of Business Administration",
        "b.sc":   "Bachelor of Science",
        "bsc":    "Bachelor of Science",
        "m.sc":   "Master of Science",
        "phd":    "Doctor of Philosophy",
    }
    for edu in data.get("education", []):
        degree = (edu.get("degree") or "").strip()
        field  = (edu.get("field")  or "").strip()
        deg_key = degree.lower().rstrip(".")
        if deg_key in DEGREE_MAP:
            degree = DEGREE_MAP[deg_key]
        # Combine: "Bachelor of Engineering in Computer Science"
        if field and field.lower() not in degree.lower():
            edu["degree"] = f"{degree} in {field}"
        else:
            edu["degree"] = degree
        edu["location"] = clean(edu.get("location", ""))
        edu["gpa"]      = clean(edu.get("gpa", "")) or None

    # 4. Certifications → pipe format
    cleaned_certs = []
    for cert in data.get("certifications", []):
        if not isinstance(cert, str) or not cert.strip():
            continue
        cert = cert.strip()
        if "|" in cert:
            cleaned_certs.append(cert)
        else:
            # Comma format: "Name, Issuer, Year" → "Name | Issuer | Year"
            parts = [p.strip() for p in cert.split(",")]
            cleaned_certs.append(" | ".join(parts) if len(parts) >= 2 else cert)
    data["certifications"] = cleaned_certs

    # 5. Null contact fields
    for field in ("linkedin_url", "github_url", "portfolio_url"):
        val = clean(data.get(field, ""))
        data[field] = val if val else None

    return data


# ============================================================
# ROUTES
# ============================================================
@app.get("/")
async def root():
    return {
        "service":  "HireAI Resume Optimizer",
        "version":  "2.0",
        "pipeline": "extract → enhance → jd_match → grammar → audit",
        "status":   "online",
    }


@app.get("/health")
async def health():
    return {
        "status":   "healthy",
        "model":    "Groq Llama 3.3 70B",
        "nodes":    ["extract", "enhance", "jd_match", "grammar", "audit"],
    }


@app.post("/process-resume")
async def process_resume_endpoint(
    file:            UploadFile = File(...),
    job_description: str        = Form(""),   # Optional JD for targeted optimization
):
    """
    Full pipeline:
    1. Extract text from PDF
    2. Run 5-node LangGraph pipeline
    3. Render HTML template
    4. Generate PDF
    Returns: download URL + resume data + detailed feedback
    """

    # ---- Validate ----
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    try:
        print(f"\n{'='*50}")
        print(f"📄 File: {file.filename}")
        if job_description:
            print(f"📋 JD provided ({len(job_description)} chars) — JD matching enabled")
        print(f"{'='*50}")

        # ---- Step 1: Extract text ----
        text = extract_text(file_bytes)
        if len(text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract readable text. Please ensure the PDF is not a scanned image."
            )
        print(f"  ✓ Extracted {len(text)} characters")

        # ---- Step 2: Run 5-node pipeline ----
        result = process_resume(
            raw_text=text,
            job_description=job_description.strip()
        )

        fixed_json = result["fixed_json"]
        feedback   = result["feedback"]

        if not fixed_json:
            raise HTTPException(status_code=500, detail="AI processing returned empty result.")

        # ---- Step 3: Sanitize + Render template ----
        try:
            # Remove internal fields before sanitizing
            template_data = {k: v for k, v in fixed_json.items() if not k.startswith("_")}
            # Deep sanitize: fix "None" strings, expand degrees, pipe-format certs
            template_data = sanitize_resume_json(template_data)
            print(f"  ✓ Sanitized. Keys: {list(template_data.keys())}")
            template  = jinja_env.get_template("resume_template.html")
            html_out  = template.render(**template_data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Template rendering error: {str(e)}")

        # ---- Step 4: Generate PDF ----
        ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Optimized_Resume_{ts}.pdf"
        pdf_path = os.path.join(OUTPUT_DIR, filename)

        if not html_to_pdf(html_out, pdf_path):
            raise HTTPException(status_code=500, detail="PDF generation failed.")

        print(f"  ✓ Done: {filename}")
        print(f"  ✓ ATS: {feedback.get('ats_score_before')} → {feedback.get('ats_score_after')}")

        return {
            "success":      True,
            "download_url": f"/download/{filename}",
            "resume_data":  template_data,
            "feedback":     feedback,
            "audit_report": result.get("audit_report", ""),
            "message":      "Resume optimized successfully!",
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")


@app.get("/download/{filename}")
async def download(filename: str):
    # Prevent path traversal
    if any(c in filename for c in ["/", "\\", ".."]):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found or expired.")

    return FileResponse(path, media_type="application/pdf", filename=filename)


if __name__ == "__main__":
    import uvicorn
    print("\n=== HireAI Resume Optimizer v2.0 ===")
    print("Pipeline: extract → enhance → jd_match → grammar → audit")
    print("Running on http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)