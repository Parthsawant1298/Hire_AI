from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Annotated
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import Tool
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_community.utilities import GoogleSerperAPIWrapper
import json
import os
import io
import nest_asyncio
from dotenv import load_dotenv
import uvicorn
from pypdf import PdfReader
import re

nest_asyncio.apply()
load_dotenv()

# --- VALIDATION ---
if not os.getenv("SERPER_API_KEY"):
    raise ValueError("❌ CRITICAL: SERPER_API_KEY is missing in .env")
if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("❌ CRITICAL: GOOGLE_API_KEY is missing in .env")

app = FastAPI(title="Perfect Real Job Matcher with LangGraph")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENHANCED STATE ---
class JobMatcherState(BaseModel):
    messages: Annotated[List, add_messages]
    resume_text: str = ""
    extracted_skills: List[str] = []
    core_skills: List[str] = []  # Top 3-5 most important skills
    experience_level: str = ""
    preferred_location: str = ""
    job_type: str = "Any"
    salary_expectation: str = ""
    industry_preference: str = ""
    job_titles: List[str] = []  # Extracted job titles from resume
    matched_jobs: List[dict] = []
    search_iterations: int = 0

# --- ADVANCED TOOLS ---
serper = GoogleSerperAPIWrapper()

def advanced_job_search_tool(query: str) -> str:
    """
    ENHANCED: Multi-site job search with better result formatting
    """
    print(f"🔍 Advanced Job Search Query: {query}")
    
    # Enhanced search targeting multiple job platforms
    search_query = f'{query} (site:linkedin.com/jobs OR site:indeed.com OR site:glassdoor.com OR site:naukri.com OR site:monster.co.in OR site:greenhouse.io OR site:lever.co OR site:workable.com OR site:smartrecruiters.com OR site:breezy.hr OR "apply now" OR "job opening") -"expired" -"closed"'
    
    try:
        raw_results = serper.results(search_query)
        
        output_string = "=== REAL JOB SEARCH RESULTS ===\n\n"
        
        if "organic" in raw_results and raw_results["organic"]:
            for idx, item in enumerate(raw_results["organic"][:12]):  # Get more results
                title = item.get("title", "No Title")
                link = item.get("link", "")
                snippet = item.get("snippet", "No description")
                
                # Clean and enhance the data
                cleaned_title = re.sub(r'\s*-\s*(Indeed|LinkedIn|Glassdoor|Naukri|Monster).*', '', title)
                
                output_string += f"JOB_RESULT_{idx+1}\n"
                output_string += f"TITLE: {cleaned_title}\n"
                output_string += f"DIRECT_LINK: {link}\n"
                output_string += f"DESCRIPTION: {snippet}\n"
                output_string += f"SOURCE_PLATFORM: {link.split('/')[2] if '/' in link else 'Unknown'}\n"
                output_string += "---END_JOB---\n\n"
        else:
            output_string += "No job results found for this query.\n"
            
        return output_string
        
    except Exception as e:
        print(f"❌ Search Error: {e}")
        return f"Search failed: {str(e)}"

def targeted_company_search_tool(query: str) -> str:
    """
    Search for jobs at specific companies or in specific industries
    """
    print(f"🎯 Company/Industry Search: {query}")
    
    try:
        raw_results = serper.results(query)
        output_string = "=== COMPANY/INDUSTRY SEARCH RESULTS ===\n\n"
        
        if "organic" in raw_results:
            for idx, item in enumerate(raw_results["organic"][:8]):
                title = item.get("title", "")
                link = item.get("link", "")
                snippet = item.get("snippet", "")
                
                output_string += f"COMPANY_JOB_{idx+1}\n"
                output_string += f"TITLE: {title}\n"
                output_string += f"LINK: {link}\n"
                output_string += f"DETAILS: {snippet}\n"
                output_string += "---END_COMPANY_JOB---\n\n"
                
        return output_string
    except Exception as e:
        return f"Company search failed: {str(e)}"

tools = [
    Tool(
        name="advanced_job_search", 
        func=advanced_job_search_tool, 
        description="Search for jobs across multiple platforms with enhanced filtering and formatting"
    ),
    Tool(
        name="targeted_company_search",
        func=targeted_company_search_tool,
        description="Search for jobs at specific companies or in specific industries"
    )
]

# --- ENHANCED LLM ---
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.1
)
llm_with_tools = llm.bind_tools(tools)

# --- HELPER ---
def extract_text_from_pdf(file_content: bytes) -> str:
    try:
        pdf_file = io.BytesIO(file_content)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"❌ PDF Error: {e}")
        return ""

# --- ENHANCED NODES ---

async def advanced_resume_analyzer_node(state: JobMatcherState) -> Dict:
    print(f"🧠 Deep Resume Analysis ({len(state.resume_text)} chars)...")
    
    # Enhanced analysis prompt
    analysis_prompt = f"""
    You are an expert resume analyzer and career consultant. Analyze this resume with extreme precision:

    RESUME TEXT:
    {state.resume_text[:20000]}

    Extract the following in VALID JSON format:
    {{
        "core_skills": ["top 5 most important technical/professional skills"],
        "all_skills": ["comprehensive list of all mentioned skills"],
        "experience_level": "Entry-Level" | "Mid-Level" | "Senior" | "Executive",
        "job_titles": ["list of job titles that match this person's background"],
        "industry_preference": "primary industry this person works in",
        "years_of_experience": "estimated years",
        "education_level": "degree level if mentioned",
        "certifications": ["any certifications mentioned"],
        "key_achievements": ["notable accomplishments"],
        "preferred_roles": ["3-5 ideal next career moves"]
    }}

    CRITICAL RULES:
    1. Be extremely precise with skill extraction
    2. Focus on skills that appear multiple times or in important contexts
    3. Experience level should reflect actual responsibility and complexity
    4. Job titles should be realistic next steps, not just past titles
    5. Return ONLY valid JSON, no markdown or extra text
    """
    
    response = await llm.ainvoke([
        SystemMessage(content="You are a precision resume analyzer. Return only valid JSON."),
        HumanMessage(content=analysis_prompt)
    ])
    
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        # LOGIC FIX: Prioritize User Input for Industry if provided
        user_industry = state.industry_preference
        extracted_industry = data.get("industry_preference", "")
        final_industry = user_industry if user_industry else extracted_industry

        return {
            "extracted_skills": data.get("all_skills", [])[:15],  # Limit to top 15
            "core_skills": data.get("core_skills", [])[:5],  # Top 5 core skills
            "experience_level": data.get("experience_level", "Mid-Level"),
            "job_titles": data.get("preferred_roles", [])[:5],
            "industry_preference": final_industry,
        }
    except Exception as e:
        print(f"❌ Resume Analysis Error: {e}")
        # Fallback extraction
        return {
            "extracted_skills": ["Software Development", "Project Management"],
            "core_skills": ["Programming", "Problem Solving"],
            "experience_level": "Mid-Level",
            "job_titles": ["Software Engineer"],
            "industry_preference": state.industry_preference or "Technology"
        }

async def intelligent_job_searcher_node(state: JobMatcherState) -> Dict:
    """
    Enhanced job search with multiple strategies and iterations
    """
    print(f"🔍 Intelligent Job Search - Iteration {state.search_iterations + 1}")
    
    # Create multiple search strategies
    strategies = []
    
    # Strategy 1: Core skills + experience level + location
    if state.core_skills:
        core_skills_str = " ".join(state.core_skills[:3])
        strategies.append(f"{state.experience_level} {core_skills_str} jobs {state.preferred_location}")
    
    # Strategy 2: Job titles + location
    if state.job_titles:
        job_title = state.job_titles[0] if state.job_titles else "Software Engineer"
        strategies.append(f"{job_title} positions {state.preferred_location} {state.job_type.lower()}")
    
    # Strategy 3: Industry-specific search
    if state.industry_preference:
        strategies.append(f"{state.industry_preference} careers {state.preferred_location} hiring")
    
    # Strategy 4: Skills-based search with alternative keywords
    if state.extracted_skills:
        alt_skills = " OR ".join(state.extracted_skills[:4])
        strategies.append(f"({alt_skills}) jobs {state.preferred_location}")
    
    # Choose strategy based on iteration
    strategy_index = min(state.search_iterations, len(strategies) - 1)
    search_query = strategies[strategy_index] if strategies else f"jobs {state.preferred_location}"
    
    print(f"📊 Using Strategy {strategy_index + 1}: {search_query}")
    
    # Execute search
    search_message = HumanMessage(content=f"""
    Execute advanced job search with this query: {search_query}
    
    SEARCH REQUIREMENTS:
    1. Find 8-12 real job postings
    2. Focus on recent postings (avoid expired/closed positions)
    3. Prioritize jobs that match the user's experience level: {state.experience_level}
    4. Look for positions that utilize these core skills: {', '.join(state.core_skills)}
    5. Target location preference: {state.preferred_location}
    6. Job type preference: {state.job_type}
    
    Use the advanced_job_search tool for broad search results.
    """)
    
    response = await llm_with_tools.ainvoke([
        SystemMessage(content="You are an expert recruiter finding real job opportunities. Use the search tools effectively."),
        search_message
    ])
    
    # Also try company-specific search if we have industry preference
    if state.industry_preference and state.search_iterations == 0:
        company_message = HumanMessage(content=f"""
        Find jobs at top companies in {state.industry_preference} industry.
        Search for: "careers {state.industry_preference} companies {state.preferred_location} {' '.join(state.core_skills[:2])}"
        """)
        
        company_response = await llm_with_tools.ainvoke([
            SystemMessage(content="Find jobs at specific companies in the target industry."),
            company_message
        ])
        
        return {
            "messages": [search_message, response, company_message, company_response],
            "search_iterations": state.search_iterations + 1
        }
    
    return {
        "messages": [search_message, response],
        "search_iterations": state.search_iterations + 1
    }

async def advanced_job_matcher_node(state: JobMatcherState) -> Dict:
    """
    Enhanced job matching with better parsing and validation
    """
    print("🎯 Advanced Job Matching & Validation...")
    
    # Get the search results from messages
    search_content = ""
    for msg in state.messages:
        if hasattr(msg, 'content') and isinstance(msg.content, str):
            search_content += msg.content + "\n"
    
    print(f"📊 Processing {len(search_content)} characters of search data...")
    
    # Enhanced matching prompt
    matching_prompt = f"""
    You are an expert job matching specialist. Analyze these search results and extract REAL job opportunities.

    USER PROFILE:
    - Core Skills: {', '.join(state.core_skills)}
    - All Skills: {', '.join(state.extracted_skills)}
    - Experience Level: {state.experience_level}
    - Target Location: {state.preferred_location}
    - Job Type: {state.job_type}
    - Preferred Roles: {', '.join(state.job_titles)}
    - Industry: {state.industry_preference}
    - Salary Expectation: {state.salary_expectation}

    SEARCH RESULTS TO ANALYZE:
    {search_content}

    EXTRACTION RULES:
    1. Extract ONLY jobs that have valid application links (starting with http)
    2. PRIORITIZE Indian Rupees (₹) for salary if location is India (e.g., "₹5L - ₹12L PA"). 
    3. If salary is missing, estimate a realistic range in INR based on the role - DO NOT return "Not disclosed".
    4. Match jobs that align with user's experience level and skills
    5. Prioritize jobs that mention the user's core skills
    6. Extract company names from job titles or snippets. If missing, estimate from URL.
    7. Create meaningful job descriptions from available snippets.
    8. Filter out expired, closed, or irrelevant positions.
    9. NEVER return "None", "null", "Unknown" for any field. Guess realistic values if needed.

    Return a JSON array of the TOP 10 BEST MATCHES:
    [
        {{
            "title": "Exact job title from posting",
            "company": "Company name",
            "location": "Job location",
            "salary": "Salary range (in ₹ INR preferably)",
            "description": "Meaningful description",
            "apply_link": "Direct application URL",
            "match_score": "High|Medium|Low",
            "key_requirements": ["list of requirements"],
            "matching_skills": ["list of matched skills"]
        }}
    ]

    CRITICAL: Return ONLY valid JSON.
    """
    
    response = await llm.ainvoke([
        SystemMessage(content="You are a precision job data extractor. Return only valid JSON arrays."),
        HumanMessage(content=matching_prompt)
    ])
    
    try:
        content = response.content.strip()
        
        # Clean any markdown formatting
        content = re.sub(r'```json\s*', '', content)
        content = re.sub(r'```\s*', '', content)
        content = content.strip()
        
        if not content or content in ["[]", "", "null"]:
            print("⚠️ No jobs extracted from search results")
            return {"matched_jobs": []}
        
        jobs_data = json.loads(content)
        
        if not isinstance(jobs_data, list):
            print(f"❌ Response is not a list: {type(jobs_data)}")
            return {"matched_jobs": []}
        
        # ENHANCED: Validate and enhance job data with strict quality checks
        validated_jobs = []
        for job in jobs_data:
            # Validate required fields
            if not all(key in job for key in ["title", "company", "apply_link"]):
                continue
                
            link = job.get("apply_link", "")
            if not link.startswith("http"):
                continue
            
            # PERFECT DATA CLEANUP - NO "NONE" VALUES ALLOWED
            # 1. Company
            if not job.get("company") or job.get("company") in ["None", "null", "Unknown", ""]:
                # Try to extract from URL if company is missing
                try:
                    domain = link.split("/")[2].replace("www.", "").split(".")[0]
                    job["company"] = domain.title()
                except:
                    job["company"] = "Hiring Company"

            # 2. Location
            if not job.get("location") or job.get("location") in ["None", "null", "Unknown", ""]:
                job["location"] = state.preferred_location if state.preferred_location else "India"

            # 3. ENHANCED SALARY ESTIMATION - More accurate
            salary = job.get("salary", "")
            if not salary or salary in ["None", "null", "Not disclosed", "Competitive", "Unknown", ""]:
                # Advanced fallback logic based on role and experience
                title_lower = job.get("title", "").lower()
                exp_level = state.experience_level.lower()
                
                if any(word in title_lower for word in ["senior", "lead", "principal", "architect", "staff"]):
                     job["salary"] = "₹15L - ₹30L PA (Est.)"
                elif any(word in title_lower for word in ["intern", "trainee", "graduate", "fresher"]):
                     job["salary"] = "₹2L - ₹6L PA (Est.)"
                elif any(word in title_lower for word in ["manager", "director", "vp", "head"]):
                     job["salary"] = "₹20L - ₹45L PA (Est.)"
                elif "entry" in exp_level or "junior" in title_lower:
                     job["salary"] = "₹3L - ₹8L PA (Est.)"
                elif "senior" in exp_level:
                     job["salary"] = "₹12L - ₹25L PA (Est.)"
                else:
                     job["salary"] = "₹5L - ₹15L PA (Est.)"
            
            # 4. Description enhancement
            if not job.get("description") or len(job.get("description")) < 20:
                job["description"] = f"Exciting opportunity for a {job.get('title')} role at {job.get('company')}. This position offers growth potential and competitive benefits. Apply to learn more about the role requirements and responsibilities."

            # 5. Ensure key_requirements and matching_skills are lists
            if not job.get("key_requirements") or not isinstance(job.get("key_requirements"), list):
                job["key_requirements"] = ["Relevant experience", "Strong communication skills", "Team collaboration"]
            
            if not job.get("matching_skills") or not isinstance(job.get("matching_skills"), list):
                # Try to match from user's core skills
                matching = [skill for skill in state.core_skills if skill.lower() in job.get("title", "").lower() or skill.lower() in job.get("description", "").lower()]
                job["matching_skills"] = matching[:3] if matching else ["Technical skills", "Problem solving"]

            validated_jobs.append(job)
        
        print(f"✅ Successfully matched {len(validated_jobs)} validated jobs")
        return {"matched_jobs": validated_jobs[:10]}  # Limit to top 10
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {e}")
        return {"matched_jobs": []}
    except Exception as e:
        print(f"❌ Matching Error: {e}")
        return {"matched_jobs": []}

# --- ENHANCED GRAPH ---
graph_builder = StateGraph(JobMatcherState)
graph_builder.add_node("analyzer", advanced_resume_analyzer_node)
graph_builder.add_node("searcher", intelligent_job_searcher_node)
graph_builder.add_node("tools", ToolNode(tools=tools))
graph_builder.add_node("matcher", advanced_job_matcher_node)

graph_builder.add_edge(START, "analyzer")
graph_builder.add_edge("analyzer", "searcher")
graph_builder.add_conditional_edges("searcher", tools_condition, {"tools": "tools", "__end__": "matcher"})
graph_builder.add_edge("tools", "matcher")
graph_builder.add_edge("matcher", END)

memory = MemorySaver()
job_graph = graph_builder.compile(checkpointer=memory)

# --- ENHANCED API ROUTE ---
@app.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    location: str = Form("Remote"),
    job_type: str = Form("Any"),
    salary_expectation: str = Form(""),
    industry: str = Form("")
):
    try:
        print(f"📄 Processing file: {file.filename}")
        print(f"📍 Location: {location}")
        print(f"💼 Job Type: {job_type}")
        print(f"💰 Salary: {salary_expectation}")
        print(f"🏢 Industry: {industry}")
        
        content = await file.read()
        if file.filename.endswith(".pdf"):
            text = extract_text_from_pdf(content)
        else:
            text = content.decode('utf-8', errors='ignore')

        if len(text.strip()) < 50:
            return {"success": False, "error": "Resume text is too short or could not be extracted"}

        # Enhanced initial state
        initial_state = {
            "resume_text": text,
            "messages": [],
            "preferred_location": location or "Remote",
            "job_type": job_type,
            "salary_expectation": salary_expectation,
            "industry_preference": industry,
            "search_iterations": 0
        }

        config = {"configurable": {"thread_id": f"job_{hash(text[:1000])}"}}
        
        print("🚀 Starting perfect job matching process...")
        result = await job_graph.ainvoke(initial_state, config=config)
        
        return {
            "success": True,
            "analysis": {
                "core_skills": result.get("core_skills", [])[:5],
                "all_skills": result.get("extracted_skills", []),
                "experience": result.get("experience_level", "Mid-Level"),
                "location": result.get("preferred_location", location),
                "job_type": result.get("job_type", job_type),
                "preferred_roles": result.get("job_titles", []),
                "industry": result.get("industry_preference", industry)
            },
            "jobs": result.get("matched_jobs", []),
            "search_stats": {
                "total_searches": result.get("search_iterations", 0),
                "jobs_found": len(result.get("matched_jobs", []))
            }
        }
        
    except Exception as e:
        print(f"❌ SERVER ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"Processing failed: {str(e)}"}

@app.get("/")
async def root():
    return {"message": "Perfect Real Job Matcher API - Enhanced with LangGraph", "status": "running"}

if __name__ == "__main__":
    print("🚀 PERFECT Real Job Matcher running on port 8002")
    print("🔧 Features: Advanced prompts, multi-strategy search, perfect data handling")
    print("🇮🇳 Optimized for Indian job market with accurate salary estimation")
    uvicorn.run(app, host="0.0.0.0", port=8002)