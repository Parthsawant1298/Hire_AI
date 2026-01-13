from fastapi import FastAPI, UploadFile, File, HTTPException
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

nest_asyncio.apply()
load_dotenv()

# --- VALIDATION ---
if not os.getenv("SERPER_API_KEY"):
    raise ValueError("❌ CRITICAL: SERPER_API_KEY is missing in .env")
if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("❌ CRITICAL: GOOGLE_API_KEY is missing in .env")

app = FastAPI(title="Real LangGraph Job Matcher")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STATE ---
class JobMatcherState(BaseModel):
    messages: Annotated[List, add_messages]
    resume_text: str = ""
    extracted_skills: List[str] = []
    experience_level: str = ""
    preferred_location: str = ""
    matched_jobs: List[dict] = []

# --- TOOLS (FIXED FOR LINKS) ---
serper = GoogleSerperAPIWrapper()

def job_search_tool(query: str) -> str:
    """
    FIX: Uses serper.results() to get the RAW JSON with the 'link' field.
    Formats it manually so the AI cannot miss the URL.
    """
    print(f"📡 Google Search Query: {query}")
    
    # 1. Get raw JSON results
    raw_results = serper.results(f"{query} site:linkedin.com/jobs OR site:indeed.com OR site:glassdoor.com OR site:greenhouse.io OR site:lever.co")
    
    # 2. Manually build a clean string with URLs
    output_string = "Here are the real search results:\n\n"
    
    if "organic" in raw_results:
        for item in raw_results["organic"]:
            title = item.get("title", "No Title")
            link = item.get("link", "NO_LINK_FOUND")
            snippet = item.get("snippet", "No description")
            
            # format clearly for the LLM
            output_string += f"JOB_START\nTitle: {title}\nLink: {link}\nSnippet: {snippet}\nJOB_END\n\n"
            
    return output_string

tools = [
    Tool(
        name="job_search", 
        func=job_search_tool, 
        description="Search Google for real job postings. Returns structured text with links."
    )
]

# --- LLM ---
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0
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

# --- NODES ---

async def resume_analyzer_node(state: JobMatcherState) -> Dict:
    print(f"🧐 Analyzing Resume ({len(state.resume_text)} chars)...")
    
    processed_text = state.resume_text
    if len(processed_text) > 20000:
        summary_res = await llm.ainvoke([
            HumanMessage(content=f"Summarize this resume profile:\n\n{processed_text[:30000]}")
        ])
        processed_text = summary_res.content

    prompt = f"""
    Extract from resume JSON:
    1. "skills": List[str]
    2. "experience": "Junior", "Mid-Level", "Senior"
    3. "location": City/Country (default "India" if unclear)

    Resume:
    {processed_text[:15000]}
    """
    
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return {
            "extracted_skills": data.get("skills", []),
            "experience_level": data.get("experience", "Mid-Level"),
            "preferred_location": data.get("location", "India")
        }
    except:
        return {"extracted_skills": ["Software Engineer"], "experience_level": "Mid-Level"}

async def job_searcher_node(state: JobMatcherState) -> Dict:
    skills = ", ".join(state.extracted_skills[:3])
    # Tweak query to ensure we get individual job pages, not lists
    query = f"{state.experience_level} {skills} jobs {state.preferred_location} apply"
    
    print(f"🔍 Search Query: {query}")

    user_msg = HumanMessage(content=f"Use job_search to find 10 real listings for: {query}")
    
    response = await llm_with_tools.ainvoke([
        SystemMessage(content="You are a recruiter."),
        user_msg
    ])
    
    return {"messages": [user_msg, response]}

async def job_matcher_node(state: JobMatcherState) -> Dict:
    print("🧠 Parsing & Validating Links...")
    
    parser_prompt = HumanMessage(content="""
    Analyze the search results in the history.
    Extract the top 10 REAL jobs.
    
    CRITICAL RULES:
    1. The "apply_link" MUST be a valid URL starting with http.
    2. If the "Link" field is "NO_LINK_FOUND", DO NOT include that job.
    3. Do not invent links.
    
    Return JSON List:
    [{
        "title": "...",
        "company": "...", 
        "location": "...", 
        "salary": "...",
        "description": "...",
        "apply_link": "..." 
    }]
    """)
    
    messages = state.messages + [parser_prompt]
    
    response = await llm.ainvoke(messages)
    
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        jobs_data = json.loads(content)
        
        # Double check links in python just in case
        valid_jobs = []
        for job in jobs_data:
            link = job.get("apply_link", "")
            if link and link.startswith("http") and "localhost" not in link:
                valid_jobs.append(job)
                
        print(f"✅ Found {len(valid_jobs)} jobs with VALID links.")
        return {"matched_jobs": valid_jobs}
        
    except Exception as e:
        print(f"❌ Parse Error: {e}")
        return {"matched_jobs": []}

# --- GRAPH ---
graph_builder = StateGraph(JobMatcherState)
graph_builder.add_node("analyzer", resume_analyzer_node)
graph_builder.add_node("searcher", job_searcher_node) 
graph_builder.add_node("tools", ToolNode(tools=tools))
graph_builder.add_node("matcher", job_matcher_node)

graph_builder.add_edge(START, "analyzer")
graph_builder.add_edge("analyzer", "searcher")
graph_builder.add_conditional_edges("searcher", tools_condition, {"tools": "tools", "__end__": "matcher"})
graph_builder.add_edge("tools", "matcher")
graph_builder.add_edge("matcher", END)

memory = MemorySaver()
job_graph = graph_builder.compile(checkpointer=memory)

# --- ROUTE ---
@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if file.filename.endswith(".pdf"):
            text = extract_text_from_pdf(content)
        else:
            text = content.decode('utf-8', errors='ignore')

        initial_state = {"resume_text": text, "messages": []}
        config = {"configurable": {"thread_id": f"job_{hash(text)}"}}
        
        result = await job_graph.ainvoke(initial_state, config=config)
        
        return {
            "success": True,
            "analysis": {
                "skills": result.get("extracted_skills"),
                "experience": result.get("experience_level"),
                "location": result.get("preferred_location")
            },
            "jobs": result.get("matched_jobs", [])
        }
    except Exception as e:
        print(f"SERVER ERROR: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    print("🚀 Real Job Matcher (Fixed Links) running on port 8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)