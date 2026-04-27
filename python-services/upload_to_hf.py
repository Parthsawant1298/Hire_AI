"""
Upload ALL python-services files to HuggingFace Space in one commit.
Run: python upload_to_hf.py
"""
import os
import sys
from pathlib import Path
from huggingface_hub import HfApi

# ── Config ────────────────────────────────────────────────────
HF_TOKEN   = os.environ.get("HF_TOKEN") or input("Paste your HF write token: ").strip()
REPO_ID    = "parthsawant1298/HireAI-Backend"
REPO_TYPE  = "space"
BASE_DIR   = Path(__file__).parent  # python-services/

# Files to upload (relative to BASE_DIR => path in the repo)
FILES = [
    "Dockerfile",
    "requirements.txt",
    "ai_gateway.py",
    "voice_service.py",
    "face_service.py",
    "job_matcher_service.py",
    "resume_ai_agent.py",
    "resume_fastapi.py",
    "roadmap_agent.py",
    "course.py",
    "templates/resume_template.html",
]

api = HfApi(token=HF_TOKEN)

print(f"\nUploading {len(FILES)} files to {REPO_ID} ...\n")
for rel_path in FILES:
    local = BASE_DIR / rel_path
    if not local.exists():
        print(f"  MISSING locally: {rel_path}")
        continue
    try:
        api.upload_file(
            path_or_fileobj=str(local),
            path_in_repo=rel_path,
            repo_id=REPO_ID,
            repo_type=REPO_TYPE,
            commit_message=f"Deploy {rel_path}",
        )
        print(f"  OK: {rel_path}")
    except Exception as e:
        print(f"  ERROR {rel_path}: {e}")

print("\nAll done! Check build logs at:")
print(f"   https://huggingface.co/spaces/{REPO_ID}?logs=container\n")
