from fastapi import FastAPI, HTTPException, Request, Cookie
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Annotated, TypedDict, Optional
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_core.tools import Tool
import os
import json
import uvicorn
from dotenv import load_dotenv
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Load env variables (both .env and .env.local)
load_dotenv()
load_dotenv('.env.local', override=True)

# --- CONFIGURATION ---
if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found in environment variables")
if not os.getenv("SERPER_API_KEY"):
    raise ValueError("SERPER_API_KEY not found in environment variables")

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.hireai # Assuming db name is hireai
courses_collection = db.courses

app = FastAPI(title="HireAI Course Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication helper
async def get_user_from_request(request: Request) -> Optional[Dict]:
    """Extract user ID from cookie and verify user exists."""
    try:
        user_id = request.cookies.get("userId")
        if not user_id:
            return None

        # Convert to ObjectId for MongoDB query
        from bson import ObjectId
        try:
            user_obj_id = ObjectId(user_id)
        except:
            return None

        # Verify user exists in database
        users_collection = db.users
        user = await users_collection.find_one({"_id": user_obj_id, "isActive": True})
        if not user:
            return None

        return {
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", "")
        }
    except Exception as e:
        print(f"Auth error: {e}")
        return None


# --- TOOLS ---
serper = GoogleSerperAPIWrapper()

def extract_youtube_thumbnail(video_url: str) -> str:
    """Extract thumbnail URL from YouTube video URL."""
    try:
        # Extract video ID from URL
        import re
        video_id_match = re.search(r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]+)', video_url)
        if video_id_match:
            video_id = video_id_match.group(1)
            return f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
    except:
        pass
    return ""

def search_youtube_tool(query: str) -> str:
    """Searches specifically for YouTube videos using Google Serper."""
    print(f"🎥 Searching YouTube for: {query}")
    results = serper.results(f"{query} site:youtube.com")

    video_data = []

    if "videos" in results:
        for v in results["videos"][:2]:
            video_url = v.get("link", "")
            thumbnail = v.get("imageUrl") or extract_youtube_thumbnail(video_url)
            video_data.append({
                "title": v.get("title"),
                "link": video_url,
                "snippet": v.get("snippet"),
                "thumbnail": thumbnail
            })
    elif "organic" in results:
        for v in results["organic"]:
            video_url = v.get("link", "")
            if "youtube.com/watch" in video_url:
                thumbnail = extract_youtube_thumbnail(video_url)
                video_data.append({
                    "title": v.get("title"),
                    "link": video_url,
                    "snippet": v.get("snippet"),
                    "thumbnail": thumbnail
                })
                if len(video_data) >= 2:
                    break

    return json.dumps(video_data)

youtube_tool = Tool(
    name="youtube_search",
    func=search_youtube_tool,
    description="Search for YouTube video tutorials. Returns JSON list of videos with title and link."
)

# --- LLM ---
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.2
)

# --- STATE ---
class CourseState(TypedDict):
    topic: str
    difficulty: str
    duration: str
    syllabus: List[Dict]
    final_course: Dict


# ============================================================
# --- NODES ---
# ============================================================

async def syllabus_designer_node(state: CourseState) -> Dict:
    """
    Step 1: Design a proper, detailed curriculum/syllabus based on the topic.
    Uses a rich prompt so the LLM produces 6-10 well-structured lessons
    with specific, targeted YouTube search queries per lesson.
    """
    print(f"📘 Designing Syllabus for: {state['topic']}")

    prompt = f"""
    You are an expert Course Curriculum Designer.
    Create a detailed syllabus for a course on: "{state['topic']}".
    Difficulty Level: {state['difficulty']}
    Target Duration: {state['duration']}

    Break the course into 6-10 logical lessons/chapters that progress from foundational to advanced.
    For each lesson, provide:
    1. 'title': A catchy, clear title.
    2. 'search_query': The best search query to find a specific YouTube tutorial for this exact lesson topic (e.g. "{state['topic']} data preprocessing tutorial 2024").
    3. 'description': A brief summary of what will be learned in this lesson.

    Return ONLY valid JSON, no extra text, no markdown:
    {{
        "course_title": "Mastering {state['topic']}",
        "description": "A comprehensive 2-sentence description of the full course.",
        "lessons": [
            {{ "title": "...", "search_query": "...", "description": "..." }}
        ]
    }}
    """

    response = await llm.ainvoke([HumanMessage(content=prompt)])

    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return {
            "syllabus": data["lessons"],
            "final_course": {
                "title": data["course_title"],
                "description": data["description"]
            }
        }
    except Exception as e:
        print(f"Syllabus Generation Error: {e}")
        topic = state['topic']
        return {
            "syllabus": [
                {"title": f"Introduction to {topic}", "search_query": f"{topic} introduction tutorial", "description": f"Get started with {topic} fundamentals."},
                {"title": f"{topic} Core Concepts", "search_query": f"{topic} core concepts tutorial", "description": f"Deep dive into the core concepts of {topic}."},
                {"title": f"Hands-on {topic} Project", "search_query": f"{topic} beginner project tutorial", "description": f"Build your first real project using {topic}."},
                {"title": f"Intermediate {topic}", "search_query": f"{topic} intermediate tutorial", "description": f"Level up with intermediate {topic} techniques."},
                {"title": f"Advanced {topic}", "search_query": f"{topic} advanced tutorial", "description": f"Master advanced {topic} strategies and patterns."},
            ],
            "final_course": {
                "title": f"Complete {topic} Course",
                "description": f"A comprehensive course covering {topic} from basics to advanced with hands-on projects."
            }
        }


async def video_curator_node(state: CourseState) -> Dict:
    """
    Step 2: Find real YouTube videos for each lesson in the syllabus.
    """
    print("🎬 Curating Videos...")

    syllabus = state["syllabus"]
    completed_lessons = []

    for i, lesson in enumerate(syllabus):
        query = lesson["search_query"]

        try:
            video_json = search_youtube_tool(query)
            videos = json.loads(video_json)

            if videos and len(videos) > 0:
                selected_video = videos[0]
            else:
                # Retry with a simpler query
                simple_query = f"{lesson['title']} tutorial"
                video_json = search_youtube_tool(simple_query)
                videos = json.loads(video_json)
                selected_video = videos[0] if videos else None

        except Exception as e:
            print(f"Video search error for '{query}': {e}")
            selected_video = None

        if selected_video:
            video_url = selected_video["link"]
            thumbnail = selected_video.get("thumbnail", "")
            # If no thumbnail from API, extract from video URL
            if not thumbnail:
                thumbnail = extract_youtube_thumbnail(video_url)
            print(f"🖼️ Video: {lesson['title'][:30]}... | Thumbnail: {thumbnail[:50]}...")
        else:
            # Fallback: YouTube search results page
            search_term = lesson["title"].replace(" ", "+")
            video_url = f"https://www.youtube.com/results?search_query={search_term}+tutorial"
            thumbnail = ""

        completed_lessons.append({
            "title": lesson["title"],
            "description": lesson["description"],
            "videoUrl": video_url,
            "thumbnail": thumbnail,
            "duration": f"{10 + (i * 3)} min"
        })

    final_course = state["final_course"]
    final_course["lessons"] = completed_lessons
    final_course["total_lessons"] = len(completed_lessons)
    final_course["difficulty"] = state["difficulty"]

    return {"final_course": final_course}


# ============================================================
# --- GRAPH ---
# ============================================================

builder = StateGraph(CourseState)
builder.add_node("designer", syllabus_designer_node)
builder.add_node("curator", video_curator_node)
builder.add_edge(START, "designer")
builder.add_edge("designer", "curator")
builder.add_edge("curator", END)
course_graph = builder.compile()


# ============================================================
# --- INTENT CLASSIFICATION PROMPT FOR /chat ---
# ============================================================

INTENT_SYSTEM_PROMPT = """You are an intent classifier for an AI-powered course generation platform called HireAI.

Your job is to understand what the user wants and respond with a JSON object. Nothing else — only valid JSON, no markdown, no backticks.

Classify the user message into one of these intents:
- "greeting"       → user is saying hi, hello, hey, good morning, etc.
- "thanks"         → user is saying thank you, thanks, awesome, great, etc.
- "help"           → user asking what you can do, or asking for help
- "course_request" → user wants to learn something (a skill, topic, subject, technology, concept, language, hobby, etc.)
- "unclear"        → message is too vague or unrelated

For "course_request", also extract:
- "topic": the specific subject/skill they want to learn — clean and concise (e.g. "Python", "Machine Learning", "Biryani Cooking")
- "difficulty": one of "Beginner", "Intermediate", "Advanced" — infer from context, default to "Beginner"

Respond ONLY with this JSON:
{
  "intent": "<intent>",
  "topic": "<topic or null>",
  "difficulty": "<difficulty or null>",
  "reply": "<a warm, helpful reply — null ONLY for course_request>"
}

Rules:
- For course_request → reply must be null.
- For all other intents → write a friendly, natural reply in the "reply" field.
- Understand all languages and Hinglish — "mujhe python sikhni hai" → course_request, topic = "Python"
- If the user wants to learn ANYTHING at all → course_request

Examples:
User: "hi" → {"intent": "greeting", "topic": null, "difficulty": null, "reply": "Hey there! 👋 I'm your AI Course Architect! What would you like to learn today? I can build a personalized course on anything — coding, design, finance, music, cooking, you name it!"}
User: "teach me machine learning" → {"intent": "course_request", "topic": "Machine Learning", "difficulty": "Beginner", "reply": null}
User: "i want to learn advanced react hooks" → {"intent": "course_request", "topic": "React Hooks", "difficulty": "Advanced", "reply": null}
User: "mujhe python sikhni hai" → {"intent": "course_request", "topic": "Python", "difficulty": "Beginner", "reply": null}
User: "how to cook biryani" → {"intent": "course_request", "topic": "Biryani Cooking", "difficulty": "Beginner", "reply": null}
User: "guitar sikhna hai yaar" → {"intent": "course_request", "topic": "Guitar", "difficulty": "Beginner", "reply": null}
User: "what can you do?" → {"intent": "help", "topic": null, "difficulty": null, "reply": "I'm your personal AI Course Creator! 🎓\\n\\n🎯 Create custom courses on ANY topic\\n📚 Find the best YouTube tutorials for each lesson\\n🎥 Organize lessons in the perfect learning order\\n💡 Adapt courses to your skill level\\n\\nTry:\\n• 'Teach me Python from scratch'\\n• 'Advanced React development'\\n• 'Mujhe data science sikhni hai'\\n• 'How to cook Italian food'"}
User: "thanks!" → {"intent": "thanks", "topic": null, "difficulty": null, "reply": "You're welcome! 😊 Ask me anytime you want to learn something new!"}
"""


# ============================================================
# --- PYDANTIC MODELS ---
# ============================================================

class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "Beginner"
    duration: str = "2 Hours"

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[Dict] = []

class CourseResponse(BaseModel):
    id: str
    title: str
    description: str
    topic: str
    difficulty: str
    duration: str
    thumbnail: str
    totalLessons: int
    lessons: List[Dict]
    createdAt: str
    userId: str


# ============================================================
# --- ENDPOINTS ---
# ============================================================

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """LLM-powered chat — understands any language, Hinglish, any topic."""
    try:
        messages = [SystemMessage(content=INTENT_SYSTEM_PROMPT)]

        # Include last 4 turns for context
        for turn in req.conversation_history[-4:]:
            if turn.get("role") == "user":
                messages.append(HumanMessage(content=turn.get("content", "")))

        messages.append(HumanMessage(content=req.message))

        response = await llm.ainvoke(messages)

        content = response.content.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(content)

        intent    = parsed.get("intent", "unclear")
        topic     = parsed.get("topic")
        difficulty = parsed.get("difficulty", "Beginner")
        reply     = parsed.get("reply")

        if intent == "course_request" and topic:
            return {
                "success": True,
                "response": f"🚀 Perfect! Creating a complete **{topic}** course for you right now. Finding the best lessons and video tutorials...",
                "type": "course_generation",
                "should_generate": True,
                "topic": topic,
                "difficulty": difficulty or "Beginner"
            }

        return {
            "success": True,
            "response": reply or "Tell me any topic or skill you'd like to master and I'll build a full course for you! 🎓",
            "type": intent
        }

    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error in /chat: {e}")
        try:
            fallback = await llm.ainvoke([
                SystemMessage(content="You are a friendly AI course assistant. Reply helpfully and briefly."),
                HumanMessage(content=req.message)
            ])
            return {"success": True, "response": fallback.content, "type": "fallback"}
        except Exception:
            return {
                "success": True,
                "response": "Hey! Tell me what you'd like to learn and I'll create a full course for you! 🎓",
                "type": "fallback"
            }

    except Exception as e:
        print(f"❌ Chat Error: {e}")
        return {"success": False, "error": str(e)}


@app.post("/generate-course")
async def generate_course_endpoint(req: GenerateRequest, request: Request):
    """Runs the full LangGraph pipeline: syllabus design → video curation → storage."""
    try:
        # Get authenticated user
        user = await get_user_from_request(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required. Please log in.")

        initial_state = {
            "topic": req.topic,
            "difficulty": req.difficulty,
            "duration": req.duration,
            "syllabus": [],
            "final_course": {}
        }

        result = await course_graph.ainvoke(initial_state)
        course_data = result["final_course"]

        # Generate unique course ID
        import uuid
        course_id = str(uuid.uuid4())

        # Extract thumbnail from first lesson
        first_lesson_thumbnail = ""
        if course_data.get("lessons") and len(course_data["lessons"]) > 0:
            first_lesson_thumbnail = course_data["lessons"][0].get("thumbnail", "")

        print(f"🎓 Course: {course_data.get('title', 'Unknown')}")
        print(f"📚 Lessons: {len(course_data.get('lessons', []))}")
        print(f"🖼️ Course Thumbnail: {first_lesson_thumbnail}")

        # Prepare course document for storage
        from bson import ObjectId

        course_doc = {
            "title": course_data.get("title", f"Complete {req.topic} Course"),
            "description": course_data.get("description", f"A comprehensive course on {req.topic}"),
            "topic": req.topic,
            "difficulty": req.difficulty,
            "duration": req.duration,
            "thumbnail": first_lesson_thumbnail,
            "totalLessons": course_data.get("total_lessons", len(course_data.get("lessons", []))),
            "lessons": course_data.get("lessons", []),
            "userId": ObjectId(user["id"]),
            "createdAt": datetime.now(timezone.utc),
        }

        # Store in Database
        result = await courses_collection.insert_one(course_doc)

        # Prepare response with string IDs
        response_course = {
            "id": str(result.inserted_id),
            "title": course_doc["title"],
            "description": course_doc["description"],
            "topic": course_doc["topic"],
            "difficulty": course_doc["difficulty"],
            "duration": course_doc["duration"],
            "thumbnail": course_doc["thumbnail"],
            "totalLessons": course_doc["totalLessons"],
            "lessons": course_doc["lessons"],
            "userId": user["id"],
            "createdAt": course_doc["createdAt"].isoformat(),
        }

        course_data["thumbnail"] = first_lesson_thumbnail

        return {"success": True, "course": course_data, "saved_course": response_course}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"success": False, "error": str(e)}


@app.get("/courses")
async def get_user_courses(request: Request):
    """Get all courses for the authenticated user."""
    try:
        # Get authenticated user
        user = await get_user_from_request(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required. Please log in.")

        # Get user's courses from database
        from bson import ObjectId
        cursor = courses_collection.find({"userId": ObjectId(user["id"])}).sort("createdAt", -1)
        user_courses = await cursor.to_list(length=100)

        # Format courses for JSON response
        formatted_courses = []
        for course in user_courses:
            formatted_course = {
                "id": str(course["_id"]),
                "title": course.get("title", ""),
                "description": course.get("description", ""),
                "topic": course.get("topic", ""),
                "difficulty": course.get("difficulty", "Beginner"),
                "duration": course.get("duration", "2 Hours"),
                "thumbnail": course.get("thumbnail", ""),
                "totalLessons": course.get("totalLessons", len(course.get("lessons", []))),
                "lessons": course.get("lessons", []),
                "createdAt": course.get("createdAt", datetime.now()).isoformat() if isinstance(course.get("createdAt"), datetime) else course.get("createdAt", datetime.now().isoformat()),
                "userId": str(course.get("userId", ""))
            }
            formatted_courses.append(formatted_course)

        return {"success": True, "courses": formatted_courses}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching courses: {e}")
        return {"success": False, "error": str(e)}


@app.delete("/courses/{course_id}")
async def delete_course(course_id: str, request: Request):
    """Delete a specific course for the authenticated user."""
    try:
        # Get authenticated user
        user = await get_user_from_request(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required. Please log in.")

        # Find and remove the course
        from bson import ObjectId

        # Validate course_id format
        try:
            course_obj_id = ObjectId(course_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid course ID format.")

        result = await courses_collection.delete_one({"_id": course_obj_id, "userId": ObjectId(user["id"])})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Course not found or you don't have permission to delete it.")

        return {"success": True, "message": "Course deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting course: {e}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    print("🚀 HireAI Course Generator running on port 8005")
    uvicorn.run(app, host="0.0.0.0", port=8005)