from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Annotated, Optional
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_community.utilities import GoogleSerperAPIWrapper
import json
import os
import io
import nest_asyncio
from dotenv import load_dotenv
import uvicorn
import pdfplumber
import re

nest_asyncio.apply()
load_dotenv()

# ============================================================
# --- VALIDATION ---
# ============================================================
if not os.getenv("SERPER_API_KEY"):
    raise ValueError("❌ SERPER_API_KEY missing in .env")
if not os.getenv("GROQ_API_KEY"):
    raise ValueError("❌ GROQ_API_KEY missing in .env")

app = FastAPI(title="HireAI - Job Matcher")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# --- STATE ---
# No MemorySaver needed — this is a single-shot pipeline per resume upload.
# ============================================================
class JobMatcherState(BaseModel):
    # Inputs
    resume_text: str = ""
    preferred_location: str = "Remote"
    job_type: str = "Any"           # "Any" | "Remote" | "On-site" | "Hybrid"
    salary_expectation: str = ""
    industry_preference: str = ""

    # Extracted by analyzer
    core_skills: List[str] = []
    all_skills: List[str] = []
    experience_level: str = "Mid-Level"
    preferred_roles: List[str] = []
    extracted_industry: str = ""

    # Raw search data (list of result blobs from each query)
    raw_search_data: List[str] = []

    # Final output
    matched_jobs: List[dict] = []


# ============================================================
# --- LLM & SEARCH ---
# ============================================================
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
    max_tokens=4096
)

serper = GoogleSerperAPIWrapper()


# ============================================================
# --- HELPERS ---
# ============================================================
def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF using pdfplumber."""
    try:
        text = ""
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"❌ PDF Error: {e}")
        return ""


def run_search(query: str) -> str:
    """Execute a single Google Serper search and return formatted results string."""
    print(f"  🔍 Query: {query}")
    try:
        raw = serper.results(query)
        output = ""
        if "organic" in raw:
            for item in raw["organic"][:10]:
                title   = item.get("title", "")
                link    = item.get("link", "")
                snippet = item.get("snippet", "")
                source  = item.get("displayLink", "")
                if link:
                    output += f"TITLE: {title}\nLINK: {link}\nSNIPPET: {snippet}\nSOURCE: {source}\n---\n"
        return output if output else "No results."
    except Exception as e:
        print(f"  ❌ Search failed: {e}")
        return ""


def build_search_queries(state: JobMatcherState) -> List[str]:
    """
    Build 5 targeted, non-overlapping search queries based on all user filters.
    Each query enforces location, job type, and domain platforms.
    """
    loc        = state.preferred_location.strip()
    job_type   = state.job_type
    industry   = state.industry_preference or state.extracted_industry
    core       = state.core_skills[:3]
    roles      = state.preferred_roles[:2]
    exp        = state.experience_level
    salary     = state.salary_expectation.strip()

    # --- Location/mode string baked into every query ---
    if job_type == "Remote":
        loc_str = "remote"
    elif job_type == "On-site" and loc:
        loc_str = loc
    elif job_type == "Hybrid" and loc:
        loc_str = f"hybrid {loc}"
    else:
        # "Any" — use location if given, else remote
        loc_str = loc if loc else "remote"

    # --- Salary hint (optional, only if provided) ---
    salary_str = f'"{salary}"' if salary else ""

    # --- Platform sites best for the region ---
    is_india = any(city in loc.lower() for city in [
        "india", "mumbai", "bangalore", "delhi", "hyderabad",
        "pune", "chennai", "kolkata", "bengaluru", "noida", "gurugram"
    ])
    if is_india:
        sites = "site:naukri.com OR site:linkedin.com OR site:instahyre.com OR site:foundit.in"
    else:
        sites = "site:linkedin.com OR site:greenhouse.io OR site:lever.co OR site:workable.com OR site:jobs.ashbyhq.com"

    core_str  = " ".join(core)
    roles_str = roles[0] if roles else core_str

    queries = []

    # Q1: Primary role + core skills + location + platforms
    q1 = f'"{roles_str}" {core_str} {loc_str} jobs {salary_str} ({sites})'
    queries.append(q1.strip())

    # Q2: Experience level + skills + location + platforms
    q2 = f'{exp} {core_str} developer engineer {loc_str} jobs hiring 2025 ({sites})'
    queries.append(q2.strip())

    # Q3: Industry-specific + location
    if industry:
        q3 = f'{industry} {core_str} jobs {loc_str} 2025 ({sites})'
    else:
        q3 = f'{core_str} software jobs {loc_str} 2025 ({sites})'
    queries.append(q3.strip())

    # Q4: Alternate role title + location (broader net)
    alt_role = roles[1] if len(roles) > 1 else f"{core_str} engineer"
    q4 = f'"{alt_role}" {loc_str} {job_type.lower() if job_type != "Any" else ""} jobs hiring ({sites})'
    queries.append(q4.strip())

    # Q5: Skills OR search — casts the widest net across platforms
    or_skills = " OR ".join([f'"{s}"' for s in state.all_skills[:5]])
    q5 = f'({or_skills}) {loc_str} jobs 2025 ({sites})'
    queries.append(q5.strip())

    return queries


# ============================================================
# --- NODE 1: RESUME ANALYZER ---
# ============================================================
async def resume_analyzer_node(state: JobMatcherState) -> Dict:
    print("🧠 Analyzing resume...")

    prompt = f"""You are an expert resume analyzer. Analyze this resume precisely.

RESUME:
{state.resume_text[:15000]}

Return ONLY valid JSON (no markdown, no extra text):
{{
    "core_skills": ["top 5 most important technical skills from this resume"],
    "all_skills": ["all technical and professional skills found, max 20"],
    "experience_level": "Fresher | Entry-Level | Mid-Level | Senior | Lead | Executive",
    "preferred_roles": ["3-5 realistic next job titles for this person"],
    "industry": "the primary industry this person works in"
}}

Rules:
- core_skills: only skills that appear prominently or multiple times
- experience_level: based on years + responsibility depth, not just years
- preferred_roles: realistic next steps (not past titles, future ones)
- Return ONLY JSON, nothing else
"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a precise resume analyzer. Return only valid JSON."),
            HumanMessage(content=prompt)
        ])
        content = response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return {
            "core_skills":       data.get("core_skills", [])[:5],
            "all_skills":        data.get("all_skills", [])[:20],
            "experience_level":  data.get("experience_level", "Mid-Level"),
            "preferred_roles":   data.get("preferred_roles", [])[:5],
            "extracted_industry": data.get("industry", "Technology"),
        }
    except Exception as e:
        print(f"❌ Resume analysis error: {e}")
        return {
            "core_skills":       ["Software Development"],
            "all_skills":        ["Programming", "Problem Solving"],
            "experience_level":  "Mid-Level",
            "preferred_roles":   ["Software Engineer"],
            "extracted_industry": "Technology",
        }


# ============================================================
# --- NODE 2: JOB SEARCHER ---
# Runs ALL 5 queries and collects every result.
# ============================================================
async def job_searcher_node(state: JobMatcherState) -> Dict:
    print("🔍 Running job searches...")

    queries = build_search_queries(state)
    all_raw: List[str] = []

    for i, q in enumerate(queries, 1):
        print(f"  Query {i}/5:")
        result = run_search(q)
        if result and result != "No results.":
            all_raw.append(f"=== SEARCH {i}: {q} ===\n{result}")

    print(f"✅ Collected results from {len(all_raw)}/5 queries")
    return {"raw_search_data": all_raw}


# ============================================================
# --- NODE 3: JOB MATCHER ---
# LLM parses all raw search data, scores and validates jobs.
# ============================================================
async def job_matcher_node(state: JobMatcherState) -> Dict:
    print("🎯 Matching & scoring jobs...")

    if not state.raw_search_data:
        print("⚠️ No search data to match.")
        return {"matched_jobs": []}

    combined = "\n\n".join(state.raw_search_data)

    # Determine currency hint
    is_india = any(c in state.preferred_location.lower() for c in [
        "india", "mumbai", "bangalore", "delhi", "hyderabad",
        "pune", "chennai", "bengaluru", "noida", "gurugram"
    ])
    currency_hint = "Indian Rupees (₹, LPA format e.g. ₹8L - ₹15L PA)" if is_india else "USD (e.g. $80k - $120k/yr)"

    prompt = f"""You are a senior job matching specialist at HireAI.

CANDIDATE PROFILE:
- Core Skills: {', '.join(state.core_skills)}
- All Skills: {', '.join(state.all_skills)}
- Experience Level: {state.experience_level}
- Preferred Roles: {', '.join(state.preferred_roles)}
- Location Preference: {state.preferred_location}
- Job Type: {state.job_type}
- Salary Expectation: {state.salary_expectation or 'Not specified'}
- Industry: {state.industry_preference or state.extracted_industry}

RAW JOB SEARCH DATA:
{combined[:12000]}

YOUR TASK:
1. Extract ONLY real job postings that have actual application links (http/https).
2. Skip: blog posts, news articles, career advice pages, expired listings.
3. Score each job 0-100 based on fit with candidate profile.

SCORING RULES:
- Skills match (35 pts): how many core/all skills match the job requirements
- Role match (25 pts): how well the job title matches preferred_roles
- Location/type match (20 pts): does location + job_type match the candidate preference
- Experience match (10 pts): does the job level match experience_level
- Salary match (10 pts): if salary_expectation given, how close is the job salary

SALARY RULES:
- Use {currency_hint} for salary
- If salary not in the snippet, estimate realistically based on role + seniority
- Append "(Est.)" if estimated
- NEVER return null or "Not disclosed"

STRICT RULES:
- apply_link MUST start with http and be the direct job/company page URL from the data
- NEVER invent or fabricate URLs
- company: extract from URL domain if not in title (e.g. greenhouse.io/company_name → that company)
- location: use candidate's preferred location if not in snippet
- Return ONLY the JSON array, no other text

Return TOP 15 matches as JSON array:
[
  {{
    "title": "exact job title",
    "company": "company name",
    "location": "job location",
    "job_type": "Remote | On-site | Hybrid",
    "salary": "salary range with currency",
    "description": "2-3 sentence description of the role",
    "apply_link": "direct URL from the search data",
    "match_score": 87,
    "key_requirements": ["req1", "req2", "req3"],
    "matching_skills": ["skill1", "skill2"]
  }}
]
"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a job data extractor. Return only a valid JSON array."),
            HumanMessage(content=prompt)
        ])

        content = response.content.strip()
        content = re.sub(r'```json\s*', '', content)
        content = re.sub(r'```\s*', '', content)

        # Extract JSON array safely
        start = content.find("[")
        end   = content.rfind("]") + 1
        if start == -1 or end <= start:
            print("❌ No JSON array found in LLM response")
            return {"matched_jobs": []}

        jobs_data = json.loads(content[start:end])

        if not isinstance(jobs_data, list):
            return {"matched_jobs": []}

        # --- Validate and clean each job ---
        validated = []
        seen_links = set()

        for job in jobs_data:
            # Must have these
            if not isinstance(job, dict):
                continue
            link = job.get("apply_link", "")
            if not link or not link.startswith("http"):
                continue
            if link in seen_links:
                continue
            seen_links.add(link)

            title = job.get("title", "").strip()
            if not title:
                continue

            # Clean company name
            company = job.get("company", "").strip()
            if not company or company.lower() in ("none", "null", "unknown", ""):
                try:
                    domain = link.split("/")[2].replace("www.", "").split(".")[0]
                    company = domain.replace("-", " ").title()
                except Exception:
                    company = "Hiring Company"
            job["company"] = company

            # Clean location
            loc = job.get("location", "").strip()
            if not loc or loc.lower() in ("none", "null", "unknown", ""):
                job["location"] = state.preferred_location or "Remote"

            # Clean salary
            salary = job.get("salary", "").strip()
            if not salary or salary.lower() in ("none", "null", "not disclosed", "competitive", ""):
                title_l = title.lower()
                exp_l   = state.experience_level.lower()
                if any(w in title_l for w in ["senior", "lead", "principal", "staff", "architect"]):
                    est = "₹15L - ₹30L PA (Est.)" if is_india else "$100k - $160k/yr (Est.)"
                elif any(w in title_l for w in ["intern", "trainee", "graduate", "fresher"]):
                    est = "₹2L - ₹6L PA (Est.)" if is_india else "$40k - $70k/yr (Est.)"
                elif any(w in title_l for w in ["manager", "director", "vp", "head", "cto", "ceo"]):
                    est = "₹20L - ₹50L PA (Est.)" if is_india else "$130k - $220k/yr (Est.)"
                elif "senior" in exp_l or "lead" in exp_l:
                    est = "₹12L - ₹25L PA (Est.)" if is_india else "$90k - $140k/yr (Est.)"
                elif "entry" in exp_l or "fresher" in exp_l:
                    est = "₹3L - ₹8L PA (Est.)" if is_india else "$50k - $80k/yr (Est.)"
                else:
                    est = "₹6L - ₹15L PA (Est.)" if is_india else "$70k - $110k/yr (Est.)"
                job["salary"] = est

            # Clean description
            desc = job.get("description", "").strip()
            if not desc or len(desc) < 20:
                job["description"] = (
                    f"Exciting {title} opportunity at {job['company']}. "
                    f"This role requires strong skills in {', '.join(state.core_skills[:3])}. "
                    f"Apply directly to learn more about responsibilities and benefits."
                )

            # Ensure lists
            if not isinstance(job.get("key_requirements"), list) or not job["key_requirements"]:
                job["key_requirements"] = state.core_skills[:3] or ["Relevant experience", "Communication", "Teamwork"]

            if not isinstance(job.get("matching_skills"), list) or not job["matching_skills"]:
                job["matching_skills"] = state.core_skills[:3]

            # Ensure match_score is int
            try:
                job["match_score"] = int(job.get("match_score", 50))
            except (ValueError, TypeError):
                job["match_score"] = 50

            # Ensure job_type field
            if not job.get("job_type"):
                job["job_type"] = state.job_type if state.job_type != "Any" else "Full-time"

            validated.append(job)

        # Sort by match_score descending
        validated.sort(key=lambda x: x["match_score"], reverse=True)

        print(f"✅ Returning {len(validated)} validated jobs")
        return {"matched_jobs": validated[:15]}

    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        return {"matched_jobs": []}
    except Exception as e:
        print(f"❌ Matching error: {e}")
        return {"matched_jobs": []}


# ============================================================
# --- GRAPH ---
# Simple linear pipeline: analyze → search (all 5 queries) → match
# No MemorySaver needed for a single-shot resume upload flow.
# ============================================================
builder = StateGraph(JobMatcherState)
builder.add_node("analyzer", resume_analyzer_node)
builder.add_node("searcher", job_searcher_node)
builder.add_node("matcher",  job_matcher_node)

builder.add_edge(START,      "analyzer")
builder.add_edge("analyzer", "searcher")
builder.add_edge("searcher", "matcher")
builder.add_edge("matcher",  END)

job_graph = builder.compile()


# ============================================================
# --- API ---
# ============================================================
@app.post("/upload-resume")
async def upload_resume(
    file:               UploadFile = File(...),
    location:           str = Form("Remote"),
    job_type:           str = Form("Any"),
    salary_expectation: str = Form(""),
    industry:           str = Form("")
):
    try:
        print(f"\n{'='*50}")
        print(f"📄 File: {file.filename}")
        print(f"📍 Location: {location} | 💼 Type: {job_type} | 💰 Salary: {salary_expectation} | 🏢 Industry: {industry}")
        print(f"{'='*50}")

        content = await file.read()

        if file.filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(content)
        else:
            text = content.decode("utf-8", errors="ignore")

        if len(text.strip()) < 50:
            return {"success": False, "error": "Resume text too short or could not be extracted. Please upload a readable PDF or TXT file."}

        initial_state = JobMatcherState(
            resume_text         = text,
            preferred_location  = location.strip() or "Remote",
            job_type            = job_type,
            salary_expectation  = salary_expectation.strip(),
            industry_preference = industry.strip(),
        )

        print("🚀 Starting job matching pipeline...")
        result = await job_graph.ainvoke(initial_state)

        return {
            "success": True,
            "analysis": {
                "core_skills":     result.get("core_skills", []),
                "all_skills":      result.get("all_skills", []),
                "experience":      result.get("experience_level", "Mid-Level"),
                "preferred_roles": result.get("preferred_roles", []),
                "industry":        result.get("industry_preference") or result.get("extracted_industry", ""),
                "location":        result.get("preferred_location", location),
                "job_type":        result.get("job_type", job_type),
            },
            "jobs": result.get("matched_jobs", []),
            "search_stats": {
                "queries_run": 5,
                "jobs_found":  len(result.get("matched_jobs", []))
            }
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"Processing failed: {str(e)}"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "HireAI Job Matcher"}


if __name__ == "__main__":
    print("🚀 HireAI Job Matcher running on port 8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)