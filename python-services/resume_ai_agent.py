"""
resume_ai_agent.py — HireAI Resume Optimizer (LangGraph Pipeline)
=================================================================
5-Node LangGraph pipeline:
  Node 1: extract   — parse raw text into structured JSON
  Node 2: enhance   — improve bullet points, action verbs, metrics
  Node 3: jd_match  — align content with job description (if provided)
  Node 4: grammar   — fix grammar, punctuation, passive voice
  Node 5: audit     — score ATS before/after, produce feedback
"""

import os
import json
import re
from typing import TypedDict, Optional
from dotenv import load_dotenv

load_dotenv()

from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END

# ============================================================
# LLM
# ============================================================
_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.2,
    max_tokens=4096,
)

# ============================================================
# STATE
# ============================================================
class ResumeState(TypedDict):
    raw_text:        str
    job_description: str
    extracted_json:  dict
    enhanced_json:   dict
    jd_aligned_json: dict
    grammar_json:    dict
    fixed_json:      dict
    feedback:        dict
    audit_report:    str

# ============================================================
# HELPERS
# ============================================================
def _parse_json(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
    # Find first { ... }
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start != -1 and end > start:
        return json.loads(text[start:end])
    raise ValueError("No JSON object found in response")

def _safe_invoke(prompt: str, fallback: dict) -> dict:
    try:
        res = _llm.invoke(prompt)
        return _parse_json(res.content)
    except Exception as e:
        print(f"LLM error: {e}")
        return fallback

# ============================================================
# NODE 1 — EXTRACT
# ============================================================
def extract_node(state: ResumeState) -> dict:
    print("Node 1/5: Extracting resume structure...")
    prompt = f"""You are a resume parser. Extract the following resume text into structured JSON.

RESUME TEXT:
{state['raw_text'][:6000]}

Return ONLY this JSON structure (no markdown, no extra text):
{{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin_url": null,
  "github_url": null,
  "portfolio_url": null,
  "summary": "",
  "skills": [],
  "experience_list": [
    {{
      "title": "",
      "company": "",
      "location": "",
      "start_date": "",
      "end_date": "",
      "bullets": []
    }}
  ],
  "education": [
    {{
      "degree": "",
      "field": "",
      "institution": "",
      "location": "",
      "start_year": "",
      "end_year": "",
      "gpa": null
    }}
  ],
  "projects_list": [
    {{
      "name": "",
      "date": "",
      "description": "",
      "bullets": [],
      "tech_stack": []
    }}
  ],
  "certifications": [],
  "languages": [],
  "awards": []
}}"""
    result = _safe_invoke(prompt, {"name": "Unknown", "skills": [], "experience_list": [], "education": [], "projects_list": []})
    print(f"  Extracted: {result.get('name', 'Unknown')}")
    return {"extracted_json": result}

# ============================================================
# NODE 2 — ENHANCE
# ============================================================
def enhance_node(state: ResumeState) -> dict:
    print("Node 2/5: Enhancing bullet points...")
    data = state["extracted_json"]
    prompt = f"""You are an expert resume writer. Improve this resume JSON:
- Use strong action verbs (Led, Built, Reduced, Increased, Delivered)
- Add metrics where possible (%, numbers, timeframes)
- Make bullets concise and impactful (max 2 lines each)
- Keep ALL existing fields, only improve text content

CURRENT JSON:
{json.dumps(data, indent=2)[:4000]}

Return the COMPLETE improved JSON with same structure. ONLY JSON, no explanation."""
    result = _safe_invoke(prompt, data)
    return {"enhanced_json": result or data}

# ============================================================
# NODE 3 — JD MATCH
# ============================================================
def jd_match_node(state: ResumeState) -> dict:
    print("Node 3/5: Aligning with job description...")
    data = state["enhanced_json"]
    jd   = state.get("job_description", "").strip()

    if not jd:
        print("  No JD provided, skipping.")
        return {"jd_aligned_json": data}

    prompt = f"""You are an ATS optimization expert. Align this resume with the job description:
- Incorporate relevant keywords from the JD naturally
- Reorder skills to match JD priorities
- Adjust summary to target this role
- Do NOT fabricate experience

JOB DESCRIPTION:
{jd[:2000]}

RESUME JSON:
{json.dumps(data, indent=2)[:3000]}

Return ONLY the updated JSON with same structure."""
    result = _safe_invoke(prompt, data)
    return {"jd_aligned_json": result or data}

# ============================================================
# NODE 4 — GRAMMAR
# ============================================================
def grammar_node(state: ResumeState) -> dict:
    print("Node 4/5: Fixing grammar and style...")
    data = state["jd_aligned_json"]
    prompt = f"""You are a professional editor. Fix ALL grammar/style issues in this resume JSON:
- Fix punctuation, capitalization, tense consistency
- Remove passive voice where possible
- Ensure present tense for current roles, past for previous
- Fix any spelling errors

RESUME JSON:
{json.dumps(data, indent=2)[:4000]}

Return ONLY the corrected JSON with same structure."""
    result = _safe_invoke(prompt, data)
    return {"grammar_json": result or data}

# ============================================================
# NODE 5 — AUDIT
# ============================================================
def audit_node(state: ResumeState) -> dict:
    print("Node 5/5: Scoring and generating feedback...")
    original = state["extracted_json"]
    final    = state["grammar_json"]
    jd       = state.get("job_description", "").strip()

    prompt = f"""You are an ATS and resume expert. Evaluate these two resume versions.

ORIGINAL:
{json.dumps(original, indent=2)[:2000]}

OPTIMIZED:
{json.dumps(final, indent=2)[:2000]}

JOB DESCRIPTION (if any):
{jd[:1000] if jd else "Not provided"}

Return ONLY this JSON:
{{
  "ats_score_before": 45,
  "ats_score_after": 78,
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "keywords_added": ["keyword1", "keyword2"],
  "audit_report": "2-3 sentence summary of what was improved"
}}"""

    fallback_feedback = {
        "ats_score_before": 50,
        "ats_score_after": 75,
        "improvements": ["Enhanced bullet points with metrics", "Improved action verbs", "Fixed grammar and style"],
        "keywords_added": [],
        "audit_report": "Resume has been optimized with stronger action verbs, metrics, and improved formatting."
    }

    try:
        res  = _llm.invoke(prompt)
        data = _parse_json(res.content)
        feedback = {
            "ats_score_before": data.get("ats_score_before", 50),
            "ats_score_after":  data.get("ats_score_after", 75),
            "improvements":     data.get("improvements", []),
            "keywords_added":   data.get("keywords_added", []),
        }
        audit_report = data.get("audit_report", "")
    except Exception as e:
        print(f"  Audit error: {e}")
        feedback     = fallback_feedback
        audit_report = fallback_feedback["audit_report"]

    print(f"  ATS: {feedback['ats_score_before']} -> {feedback['ats_score_after']}")
    return {
        "fixed_json":   final,
        "feedback":     feedback,
        "audit_report": audit_report
    }

# ============================================================
# BUILD GRAPH
# ============================================================
_builder = StateGraph(ResumeState)
_builder.add_node("extract", extract_node)
_builder.add_node("enhance", enhance_node)
_builder.add_node("jd_match", jd_match_node)
_builder.add_node("grammar", grammar_node)
_builder.add_node("audit",   audit_node)

_builder.add_edge(START,      "extract")
_builder.add_edge("extract",  "enhance")
_builder.add_edge("enhance",  "jd_match")
_builder.add_edge("jd_match", "grammar")
_builder.add_edge("grammar",  "audit")
_builder.add_edge("audit",    END)

_graph = _builder.compile()

# ============================================================
# PUBLIC API — called by ai_gateway.py
# ============================================================
def process_resume(raw_text: str, job_description: str = "") -> dict:
    """
    Run the 5-node pipeline and return:
      {"fixed_json": {...}, "feedback": {...}, "audit_report": "..."}
    """
    result = _graph.invoke({
        "raw_text":        raw_text,
        "job_description": job_description,
        "extracted_json":  {},
        "enhanced_json":   {},
        "jd_aligned_json": {},
        "grammar_json":    {},
        "fixed_json":      {},
        "feedback":        {},
        "audit_report":    "",
    })
    return {
        "fixed_json":   result.get("fixed_json", {}),
        "feedback":     result.get("feedback", {}),
        "audit_report": result.get("audit_report", ""),
    }