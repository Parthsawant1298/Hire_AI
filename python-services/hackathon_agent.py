# File: backend/hackathon_agent.py
# ================================
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_core.messages import SystemMessage, HumanMessage
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# --- VALIDATION ---
if not os.getenv("SERPER_API_KEY") or not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("❌ CRITICAL: Missing API Keys in .env")

app = FastAPI(title="Hire AI - Hackathon Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class AgenticInputs(BaseModel):
    location: str       # "Online", "Mumbai", etc.
    goal: str           # "Get Hired", "Prize Money", "Learning"
    github_username: Optional[str] = None
    tech_stack: List[str] = []
    min_prize: int = 0

class SearchRequest(BaseModel):
    inputs: AgenticInputs
    query: str

# --- AGENT STATE ---
class AgentState(TypedDict):
    inputs: dict
    query: str
    github_skills: str      # Real skills extracted from GitHub
    raw_results: str        # Raw text from Google Search
    structured_events: List[dict] # Final JSON

# --- NODE 1: REAL GITHUB ANALYZER ---
def github_scanner_node(state: AgentState):
    username = state['inputs'].get('github_username')
    
    # If no username, return empty
    if not username or username.strip() == "":
        print("⚠️ No GitHub username provided. Skipping scan.")
        return {"github_skills": ""}

    print(f"🕵️‍♂️ Connecting to GitHub API for: {username}...")
    
    try:
        # REAL CALL to GitHub API (Public Data)
        url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=10"
        response = requests.get(url)
        
        if response.status_code == 200:
            repos = response.json()
            if not repos:
                return {"github_skills": "User exists but has no public repos."}

            # Count languages
            langs = {}
            for repo in repos:
                l = repo.get('language')
                if l:
                    langs[l] = langs.get(l, 0) + 1
            
            # Sort by frequency
            top_langs = sorted(langs, key=langs.get, reverse=True)[:5]
            summary = f"Valid GitHub Profile. Top Languages: {', '.join(top_langs)}."
            print(f"✅ Real GitHub Data Found: {summary}")
            return {"github_skills": summary}
            
        elif response.status_code == 404:
            return {"github_skills": "GitHub Profile NOT FOUND."}
        else:
            return {"github_skills": "GitHub API Limit Reached or Error."}
            
    except Exception as e:
        print(f"❌ GitHub Error: {e}")
        return {"github_skills": "Error scanning GitHub."}

# --- NODE 2: STRATEGIC SEARCH ---
def search_node(state: AgentState):
    inputs = state['inputs']
    user_query = state['query']
    github_context = state['github_skills']
    
    print(f"📡 Searching Google for: {user_query}")
    
    # Build a smart query
    search_term = f"{user_query} hackathon registration open"
    
    if inputs['location'] != "Online":
        search_term += f" in {inputs['location']}"
    
    # Add intent
    if inputs['goal'] == "Get Hired":
        search_term += " hiring jobs career fair"
    elif inputs['goal'] == "Prize Money":
        search_term += " prize pool cash"
        
    # Force high-quality platforms
    search_term += " site:devpost.com OR site:unstop.com OR site:dorahacks.io OR site:lu.ma"
    
    serper = GoogleSerperAPIWrapper()
    try:
        # Get raw results
        raw = serper.results(search_term)
        
        # Convert to string for LLM
        output = f"CONTEXT FROM GITHUB: {github_context}\n\nSEARCH RESULTS:\n"
        if "organic" in raw:
            for item in raw["organic"]:
                output += f"EVENT: {item.get('title')}\nLINK: {item.get('link')}\nSNIPPET: {item.get('snippet')}\n\n"
        
        return {"raw_results": output}
    except Exception as e:
        print(f"❌ Search Error: {e}")
        return {"raw_results": ""}

# --- NODE 3: MATCHING ENGINE ---
def matching_node(state: AgentState):
    print("🧠 Scoring Events...")
    raw_text = state['raw_results']
    inputs = state['inputs']
    
    if not raw_text:
        return {"structured_events": []}

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0
    )

    prompt = f"""
    You are the "Hire AI" Hackathon Agent.
    
    USER PROFILE:
    - Goal: {inputs['goal']}
    - GitHub Skills: {state['github_skills']} (Boost events matching these)
    - Manual Skills: {', '.join(inputs['tech_stack'])}
    
    RAW EVENTS:
    {raw_text}
    
    TASK:
    1. Extract REAL upcoming hackathons.
    2. Score them (0-100).
    3. Logic:
       - If Goal="Get Hired" and event mentions "hiring"/"jobs", Score = 90+.
       - If Goal="Prize Money" and prize > ${inputs['min_prize']}, Score = 90+.
       - If GitHub Skills match the event tech stack, Boost Score.
    
    RETURN JSON LIST:
    [
      {{
        "title": "...",
        "date": "...",
        "location": "...",
        "link": "...", 
        "match_score": 95,
        "match_reason": "Matches your Python skills from GitHub and offers hiring opportunities.",
        "tags": ["AI", "Hiring"]
      }}
    ]
    """
    
    try:
        res = llm.invoke([HumanMessage(content=prompt)])
        content = res.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        # Filter and Sort
        valid = [x for x in data if x.get('link') and x['link'].startswith("http")]
        valid.sort(key=lambda x: x.get('match_score', 0), reverse=True)
        
        return {"structured_events": valid}
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return {"structured_events": []}

# --- GRAPH ---
workflow = StateGraph(AgentState)
workflow.add_node("github", github_scanner_node)
workflow.add_node("search", search_node)
workflow.add_node("match", matching_node)

workflow.set_entry_point("github")
workflow.add_edge("github", "search")
workflow.add_edge("search", "match")
workflow.add_edge("match", END)

app_graph = workflow.compile()

@app.post("/search-hackathons")
async def search_endpoint(req: SearchRequest):
    try:
        initial_state = {
            "inputs": req.inputs.dict(),
            "query": req.query,
            "github_skills": "",
            "raw_results": "",
            "structured_events": []
        }
        result = app_graph.invoke(initial_state)
        return result['structured_events']
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Hire AI Hackathon Agent running on Port 8006")
    uvicorn.run(app, host="0.0.0.0", port=8006)