from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_core.tools import Tool
import os
import json
import uvicorn
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# --- CONFIGURATION ---
if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found in environment variables")
if not os.getenv("SERPER_API_KEY"):
    raise ValueError("SERPER_API_KEY not found in environment variables")

app = FastAPI(title="HireAI Course Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- TOOLS ---
serper = GoogleSerperAPIWrapper()

def search_youtube_tool(query: str) -> str:
    """Searches specifically for YouTube videos using Google Serper."""
    print(f"🎥 Searching YouTube for: {query}")
    # We force site:youtube.com to ensure we get video links
    # and use 'videos' type if supported, or standard search with filtering
    results = serper.results(f"{query} site:youtube.com")
    
    video_data = []
    
    # Try to extract from 'videos' key if present, otherwise organic
    if "videos" in results:
        for v in results["videos"][:2]: # Get top 2 to choose from
            video_data.append({
                "title": v.get("title"),
                "link": v.get("link"),
                "snippet": v.get("snippet"),
                "thumbnail": v.get("imageUrl")
            })
    elif "organic" in results:
        for v in results["organic"]:
            if "youtube.com/watch" in v.get("link", ""):
                video_data.append({
                    "title": v.get("title"),
                    "link": v.get("link"),
                    "snippet": v.get("snippet")
                })
                if len(video_data) >= 2: break
                
    return json.dumps(video_data)

youtube_tool = Tool(
    name="youtube_search",
    func=search_youtube_tool,
    description="Search for YouTube video tutorials. Returns JSON list of videos with title and link."
)

# --- LLM ---
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", # Using the requested model
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.2
)

# --- STATE ---
class CourseState(TypedDict):
    topic: str
    difficulty: str
    duration: str
    syllabus: List[Dict] # The planned chapters
    final_course: Dict   # The complete course with links

# --- NODES ---

async def syllabus_designer_node(state: CourseState) -> Dict:
    """
    Step 1: Design the curriculum/syllabus based on the topic.
    """
    print(f"📘 Designing Syllabus for: {state['topic']}")
    
    prompt = f"""
    You are an expert Course Curriculum Designer.
    Create a detailed syllabus for a course on: "{state['topic']}".
    Difficulty Level: {state['difficulty']}
    Target Duration: {state['duration']}
    
    Break the course into 6-10 logical lessons/chapters.
    For each lesson, provide:
    1. 'title': A catchy, clear title.
    2. 'search_query': The best search query to find a specific YouTube tutorial for this exact topic (e.g. "{state['topic']} data preprocessing tutorial").
    3. 'description': A brief summary of what will be learned.
    
    Return ONLY valid JSON:
    {{
        "course_title": "Mastering {state['topic']}",
        "description": "...",
        "lessons": [
            {{ "title": "...", "search_query": "...", "description": "..." }}
        ]
    }}
    """
    
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return {"syllabus": data["lessons"], "final_course": {"title": data["course_title"], "description": data["description"]}}
    except Exception as e:
        print(f"Syllabus Generation Error: {e}")
        # Fallback syllabus
        return {
            "syllabus": [
                {"title": f"Intro to {state['topic']}", "search_query": f"{state['topic']} introduction tutorial", "description": "Basics"}
            ],
            "final_course": {"title": f"{state['topic']} Course", "description": "Generated Course"}
        }

async def video_curator_node(state: CourseState) -> Dict:
    """
    Step 2: Iterate through the syllabus and find real videos for each lesson.
    """
    print("🎬 Curating Videos...")
    
    syllabus = state["syllabus"]
    completed_lessons = []
    
    # We process sequentially to avoid rate limits, or we could parallelize
    for lesson in syllabus:
        query = lesson["search_query"]
        
        # Call the tool directly (or let LLM decide, but direct is faster here)
        video_json = search_youtube_tool(query)
        videos = json.loads(video_json)
        
        selected_video = None
        if videos:
            selected_video = videos[0] # Take top result
        else:
            # Fallback if search fails
            selected_video = {
                "title": lesson["title"], 
                "link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", # Fallback
                "thumbnail": ""
            }
            
        completed_lessons.append({
            "title": lesson["title"],
            "description": lesson["description"],
            "videoUrl": selected_video["link"],
            "thumbnail": selected_video.get("thumbnail", ""),
            "duration": "15 min" # Placeholder, hard to get exact without YouTube Data API
        })
        
    # Update the final course object
    final_course = state["final_course"]
    final_course["lessons"] = completed_lessons
    final_course["total_lessons"] = len(completed_lessons)
    final_course["difficulty"] = state["difficulty"]
    
    return {"final_course": final_course}

# --- GRAPH ---
builder = StateGraph(CourseState)

builder.add_node("designer", syllabus_designer_node)
builder.add_node("curator", video_curator_node)

builder.add_edge(START, "designer")
builder.add_edge("designer", "curator")
builder.add_edge("curator", END)

course_graph = builder.compile()

# --- API ENDPOINT ---

class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "Beginner"
    duration: str = "2 Hours"

@app.post("/generate-course")
async def generate_course_endpoint(req: GenerateRequest):
    try:
        initial_state = {
            "topic": req.topic,
            "difficulty": req.difficulty,
            "duration": req.duration,
            "syllabus": [],
            "final_course": {}
        }
        
        result = await course_graph.ainvoke(initial_state)
        return {"success": True, "course": result["final_course"]}
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    print("🚀 Course Generator running on port 8003")
    uvicorn.run(app, host="0.0.0.0", port=8003)