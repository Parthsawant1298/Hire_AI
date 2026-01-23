from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_community.utilities import GoogleSerperAPIWrapper
import os
import json
import uvicorn
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
if not os.getenv("GOOGLE_API_KEY") or not os.getenv("SERPER_API_KEY"):
    raise ValueError("Missing API Keys")

app = FastAPI(title="HireAI Roadmap Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

serper = GoogleSerperAPIWrapper()
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite", 
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.2
)

# --- STATE ---
class RoadmapState(TypedDict):
    topic: str
    level: str
    research_data: str
    structure_json: List[Dict]
    final_roadmap: Dict

# --- NODES ---

async def researcher_node(state: RoadmapState) -> Dict:
    print(f"🕵️‍♂️ Researching: {state['topic']}")
    query = f"Best structured curriculum roadmap for {state['topic']} {state['level']} with official documentation links"
    results = serper.run(query)
    return {"research_data": results}

async def architect_node(state: RoadmapState) -> Dict:
    print("🏗️ Designing Architecture...")
    prompt = f"""
    Design a professional learning path for "{state['topic']}".
    Use this research: {state['research_data'][:3000]}
    
    Create 4-6 distinct PHASES.
    Return ONLY valid JSON:
    [ {{ "phase_title": "Phase 1: ...", "topics": ["Topic A", "Topic B"] }} ]
    """
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        return {"structure_json": json.loads(content)}
    except:
        return {"structure_json": [{"phase_title": "Core Foundations", "topics": ["Introduction"]}]}

async def writer_node(state: RoadmapState) -> Dict:
    print("✍️ Writing Detailed Content with Links...")
    structure = json.dumps(state["structure_json"])
    
    prompt = f"""
    You are a Technical Lead. Expand this structure into a detailed roadmap.
    
    Structure: {structure}
    Topic: {state['topic']}
    
    CRITICAL INSTRUCTION FOR RESOURCES:
    Provide REAL, DIRECT URLs to official documentation, high-quality articles, or specific courses. 
    Do NOT provide generic strings like "Search Google". 
    If you know the official docs (e.g. React Docs, MDN, Python Docs), provide that specific URL.
    
    Return strict JSON:
    {{
        "title": "Professional Path: {state['topic']}",
        "description": "A structured, industry-standard roadmap to mastery.",
        "phases": [
            {{
                "title": "Phase 1: Foundations",
                "duration": "2 Weeks",
                "steps": [
                    {{
                        "id": "step_1", 
                        "title": "Concept Name",
                        "details": "Technical explanation...",
                        "resources": [
                            {{ "title": "Official Docs", "url": "https://...", "type": "doc" }},
                            {{ "title": "Video Guide", "url": "https://youtube.com/...", "type": "video" }}
                        ]
                    }}
                ]
            }}
        ]
    }}
    """
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        return {"final_roadmap": json.loads(content)}
    except Exception as e:
        print(f"Error: {e}")
        return {"final_roadmap": {}}

# --- GRAPH ---
builder = StateGraph(RoadmapState)
builder.add_node("researcher", researcher_node)
builder.add_node("architect", architect_node)
builder.add_node("writer", writer_node)

builder.add_edge(START, "researcher")
builder.add_edge("researcher", "architect")
builder.add_edge("architect", "writer")
builder.add_edge("writer", END)

roadmap_graph = builder.compile()

# --- API ---
class RoadmapRequest(BaseModel):
    topic: str

@app.post("/generate-roadmap")
async def generate_roadmap(req: RoadmapRequest):
    try:
        state = {
            "topic": req.topic,
            "level": "Professional",
            "research_data": "",
            "structure_json": [],
            "final_roadmap": {}
        }
        result = await roadmap_graph.ainvoke(state)
        return {"success": True, "roadmap": result["final_roadmap"]}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8004)