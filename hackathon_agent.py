# File: backend/hackathon_agent.py
# ================================
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_core.messages import HumanMessage
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("SERPER_API_KEY") or not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("❌ Missing API Keys in .env")

app = FastAPI(title="Hire AI - Hackathon Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# --- MODELS ---
# ============================================================

class AgenticInputs(BaseModel):
    # Who the user is
    github_username: Optional[str] = None
    tech_stack: List[str] = []          # e.g. ["Python", "React", "ML"]

    # What they want
    goal: str = "Learning"              # "Get Hired" | "Prize Money" | "Learning" | "Networking"
    experience_level: str = "Beginner"  # "Beginner" | "Intermediate" | "Advanced"

    # Where / When
    location: str = "Online"            # "Online" | "Mumbai" | "Bangalore" | etc.
    region: str = "Global"              # "India" | "USA" | "Europe" | "Global"

    # Mode
    mode: str = "Online"                # "Online" | "In-Person" | "Hybrid"

class SearchRequest(BaseModel):
    inputs: AgenticInputs
    query: str = ""                     # Optional free-text query from user

# ============================================================
# --- AGENT STATE ---
# ============================================================

class AgentState(TypedDict):
    inputs: dict
    query: str
    github_skills: str
    raw_results: str
    structured_events: List[dict]

# ============================================================
# --- NODE 1: GITHUB SCANNER ---
# ============================================================

def github_scanner_node(state: AgentState):
    username = state["inputs"].get("github_username", "").strip()
    if not username:
        return {"github_skills": ""}

    print(f"🕵️ Scanning GitHub: {username}")
    try:
        headers = {}
        token = os.getenv("GITHUB_TOKEN")
        if token:
            headers["Authorization"] = f"token {token}"

        url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=20"
        r = requests.get(url, headers=headers, timeout=8)

        if r.status_code == 200:
            repos = r.json()
            if not repos:
                return {"github_skills": "GitHub profile exists but no public repos."}

            # Count languages + topics
            langs: dict = {}
            topics: list = []
            for repo in repos:
                if repo.get("language"):
                    l = repo["language"]
                    langs[l] = langs.get(l, 0) + 1
                topics.extend(repo.get("topics", []))

            top_langs = sorted(langs, key=langs.get, reverse=True)[:6]
            top_topics = list(dict.fromkeys(topics))[:8]  # unique, preserve order

            summary = f"Top Languages: {', '.join(top_langs)}."
            if top_topics:
                summary += f" Repo Topics: {', '.join(top_topics)}."
            print(f"✅ GitHub Skills: {summary}")
            return {"github_skills": summary}

        elif r.status_code == 404:
            return {"github_skills": "GitHub profile not found."}
        else:
            return {"github_skills": "GitHub API unavailable."}

    except Exception as e:
        print(f"❌ GitHub Error: {e}")
        return {"github_skills": ""}

# ============================================================
# --- NODE 2: MULTI-QUERY SEARCH ---
# ============================================================

def search_node(state: AgentState):
    inputs = state["inputs"]
    user_query = state["query"].strip()
    goal       = inputs.get("goal", "Learning")
    region     = inputs.get("region", "Global")
    mode       = inputs.get("mode", "Online")
    location   = inputs.get("location", "Online")
    tech_stack = inputs.get("tech_stack", [])
    experience = inputs.get("experience_level", "Beginner")

    serper = GoogleSerperAPIWrapper()

    # ---- Region / location context baked into EVERY query ----
    # This is the key fix: every single search query must include the region
    # so Google never returns results from other countries.
    if region == "India":
        REGION_SUFFIX  = "India"
        REGION_SITES   = "site:unstop.com OR site:devfolio.co OR site:hackerearth.com"
        CITY_SUFFIX    = location if mode in ("In-Person", "Hybrid") else ""
    elif region == "USA":
        REGION_SUFFIX  = "USA"
        REGION_SITES   = "site:devpost.com OR site:mlh.io OR site:lu.ma"
        CITY_SUFFIX    = location if mode in ("In-Person", "Hybrid") else ""
    elif region == "Europe":
        REGION_SUFFIX  = "Europe"
        REGION_SITES   = "site:devpost.com OR site:lu.ma OR site:eventbrite.com"
        CITY_SUFFIX    = location if mode in ("In-Person", "Hybrid") else ""
    elif region == "Asia Pacific":
        REGION_SUFFIX  = "Asia Pacific"
        REGION_SITES   = "site:devpost.com OR site:dorahacks.io OR site:lu.ma"
        CITY_SUFFIX    = location if mode in ("In-Person", "Hybrid") else ""
    else:  # Global
        REGION_SUFFIX  = ""
        REGION_SITES   = "site:devpost.com OR site:dorahacks.io OR site:unstop.com"
        CITY_SUFFIX    = ""

    # Mode suffix
    MODE_SUFFIX = "online" if mode == "Online" else (CITY_SUFFIX or REGION_SUFFIX or "")

    tech_str = " ".join(tech_stack[:3]) if tech_stack else ""

    # Helper: append region to every query
    def rq(base: str) -> str:
        """Append region suffix to ensure geo-filtered results."""
        parts = [base]
        if REGION_SUFFIX:
            parts.append(REGION_SUFFIX)
        return " ".join(parts)

    # ---- Build 5 focused, region-locked queries ----
    queries = []

    # 1. Free-text query from user (region-locked)
    if user_query:
        queries.append(rq(f"{user_query} hackathon 2025 {MODE_SUFFIX} registration open"))

    # 2. Goal-based query (region-locked)
    if goal == "Get Hired":
        queries.append(rq(f"hackathon hiring sponsors jobs {tech_str} 2025 {MODE_SUFFIX} {REGION_SITES}"))
        queries.append(rq(f"hackathon career fair tech hiring {MODE_SUFFIX} 2025"))
    elif goal == "Prize Money":
        queries.append(rq(f"hackathon cash prize pool {tech_str} 2025 {MODE_SUFFIX} {REGION_SITES}"))
        queries.append(rq(f"hackathon prize money {MODE_SUFFIX} 2025 registration open"))
    elif goal == "Networking":
        queries.append(rq(f"tech hackathon networking community {tech_str} 2025 {MODE_SUFFIX}"))
        queries.append(rq(f"hackathon meetup community 2025 {MODE_SUFFIX} {REGION_SITES}"))
    else:  # Learning
        queries.append(rq(f"beginner friendly hackathon {tech_str} 2025 {MODE_SUFFIX} {REGION_SITES}"))
        queries.append(rq(f"student hackathon learn {tech_str} 2025 {MODE_SUFFIX}"))

    # 3. Tech-stack query (region-locked)
    if tech_stack:
        queries.append(rq(f"{' '.join(tech_stack[:2])} hackathon 2025 {MODE_SUFFIX} registration open {REGION_SITES}"))

    # 4. Platform-specific query for the region
    queries.append(rq(f"hackathon 2025 {tech_str} {MODE_SUFFIX} {REGION_SITES}"))

    # 5. Experience-level query (region-locked)
    if experience == "Beginner":
        queries.append(rq(f"beginner hackathon {tech_str or 'general'} 2025 {MODE_SUFFIX} no experience required"))
    elif experience == "Advanced":
        queries.append(rq(f"competitive hackathon {tech_str} 2025 {MODE_SUFFIX} advanced"))

    # --- Execute up to 5 queries and collect unique results ---
    seen_links = set()
    all_results = []

    for q in queries[:5]:
        try:
            print(f"🔍 Searching: {q}")
            raw = serper.results(q)
            if "organic" in raw:
                for item in raw["organic"]:
                    link = item.get("link", "")
                    if link and link not in seen_links:
                        seen_links.add(link)
                        all_results.append({
                            "title": item.get("title", ""),
                            "link": link,
                            "snippet": item.get("snippet", ""),
                            "source": item.get("displayLink", "")
                        })
        except Exception as e:
            print(f"Search error: {e}")
            continue

    # Format for LLM
    output = f"GITHUB SKILLS: {state['github_skills']}\n\n"
    output += f"USER PROFILE: Goal={goal}, Experience={experience}, Region={region}, Mode={mode}\n"
    output += f"TECH STACK: {', '.join(tech_stack) or 'Not specified'}\n\n"
    output += "FOUND EVENTS:\n"
    for i, r in enumerate(all_results, 1):
        output += f"[{i}] TITLE: {r['title']}\n    LINK: {r['link']}\n    INFO: {r['snippet']}\n    SOURCE: {r['source']}\n\n"

    print(f"✅ Total unique results collected: {len(all_results)}")
    return {"raw_results": output}

# ============================================================
# --- NODE 3: SMART MATCHING ENGINE ---
# ============================================================

def matching_node(state: AgentState):
    print("🧠 Matching & Scoring Events...")
    raw_text = state["raw_results"]
    inputs = state["inputs"]

    if not raw_text.strip():
        return {"structured_events": []}

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0
    )

    prompt = f"""
You are HireAI's Hackathon Recommendation Engine.

USER PROFILE:
- Goal: {inputs['goal']}
- Experience Level: {inputs['experience_level']}
- GitHub Skills: {state['github_skills'] or 'Not provided'}
- Manual Tech Stack: {', '.join(inputs['tech_stack']) or 'Not specified'}
- Preferred Mode: {inputs['mode']}
- Region: {inputs['region']}
- Location: {inputs['location']}

RAW SEARCH DATA:
{raw_text}

YOUR TASK:
1. Extract ONLY real, upcoming hackathons from the data above. Skip job listings, blog posts, or irrelevant pages.

2. STRICT REGION FILTER — this is mandatory:
   - If Region = "India": ONLY include events hosted in India, on Indian platforms (Unstop, Devfolio, HackerEarth), or explicitly targeting Indian participants. EXCLUDE all US/Europe/global events.
   - If Region = "USA": ONLY include events hosted in or targeting USA participants. EXCLUDE Indian/European events.
   - If Region = "Europe": ONLY include European events. EXCLUDE others.
   - If Region = "Global": include any online/international event.
   - If Mode = "Online": skip all in-person events that are clearly physical-only.
   - If Mode = "In-Person" or "Hybrid": location must match the user's city/region.

3. Score each hackathon 0–100 based on how well it matches the user profile.

SCORING LOGIC:
- Goal match (30 pts):
  * "Get Hired" → events with sponsors, hiring, career fairs = high score
  * "Prize Money" → events with any cash prizes = high score
  * "Learning" → beginner-friendly, workshops, no-experience events = high score
  * "Networking" → community, meetup, conference-style = high score
- Tech stack match (25 pts): GitHub skills + manual stack vs event tech themes
- Experience match (20 pts): beginner events for beginners, competitive for advanced
- Location/Mode match (15 pts): correct region/mode gets full points; wrong region = 0 (already filtered above)
- Recency & Platform (10 pts): 2025 events on known platforms score higher

4. For each hackathon return:
   - "title": Clean event name
   - "date": Date string or "Upcoming"
   - "location": City/Country or "Online"
   - "mode": "Online" | "In-Person" | "Hybrid"
   - "link": Full URL from the data — NEVER invent links
   - "platform": Platform name (Devpost, Unstop, Devfolio, DoraHacks, etc.)
   - "prize": Prize info if mentioned, else null
   - "match_score": Integer 0-100
   - "match_reason": 1-2 sentences explaining why it fits THIS specific user
   - "tags": 2-4 relevant tech/theme tags

5. Return ONLY a valid JSON array — no markdown, no explanation, no extra text.
6. Sort by match_score descending.
7. Include ALL valid hackathons that pass the region filter.

[
  {{
    "title": "...",
    "date": "...",
    "location": "...",
    "mode": "...",
    "link": "...",
    "platform": "...",
    "prize": "...",
    "match_score": 92,
    "match_reason": "...",
    "tags": ["AI", "Python", "India"]
  }}
]
"""

    try:
        res = llm.invoke([HumanMessage(content=prompt)])
        content = res.content.replace("```json", "").replace("```", "").strip()

        # Handle case where LLM wraps in extra text
        start = content.find("[")
        end = content.rfind("]") + 1
        if start != -1 and end > start:
            content = content[start:end]

        data = json.loads(content)

        # Validate: only keep entries with real http links
        valid = [
            x for x in data
            if isinstance(x, dict)
            and x.get("link", "").startswith("http")
            and x.get("title")
        ]

        # Sort by score
        valid.sort(key=lambda x: x.get("match_score", 0), reverse=True)

        print(f"✅ Returning {len(valid)} matched events")
        return {"structured_events": valid}

    except Exception as e:
        print(f"❌ Matching Error: {e}")
        return {"structured_events": []}

# ============================================================
# --- GRAPH ---
# ============================================================

workflow = StateGraph(AgentState)
workflow.add_node("github", github_scanner_node)
workflow.add_node("search", search_node)
workflow.add_node("match", matching_node)

workflow.set_entry_point("github")
workflow.add_edge("github", "search")
workflow.add_edge("search", "match")
workflow.add_edge("match", END)

app_graph = workflow.compile()

# ============================================================
# --- ENDPOINT ---
# ============================================================

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
        return result["structured_events"]
    except Exception as e:
        print(f"❌ Agent Error: {e}")
        return []

if __name__ == "__main__":
    print("🚀 HireAI Hackathon Agent running on Port 8006")
    uvicorn.run(app, host="0.0.0.0", port=8006)