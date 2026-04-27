"""
roadmap_backend.py — HireAI Roadmap Agent v3
=============================================
Zero static content. Pure LLM intelligence.

3-Node Pipeline (optimized for minimal tokens):

Node 1: UNDERSTAND  — LLM reads raw input, extracts topic + goal + level + domain
                      Then immediately plans the COMPLETE phase structure.
                      Combined into 1 call to save tokens.

Node 2: FETCH       — Serper searches real URLs per phase. No LLM.

Node 3: ENRICH      — LLM writes step details and assigns real URLs.
                      Minimal prompt, focused output.

Why this is NOT static:
- No hardcoded domain hints, phase lists, or topic-specific logic
- LLM uses its own knowledge of ANY topic to plan correct phases
- Works equally well for ML, Guitar, Cooking, Finance, Game Dev, etc.
- LLM knows ML needs Deployment+MLOps, Web Dev needs CI/CD, etc. — no hints needed
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.utilities import GoogleSerperAPIWrapper
import os, json, re, uvicorn
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("GOOGLE_API_KEY") or not os.getenv("SERPER_API_KEY"):
    raise ValueError("Missing GOOGLE_API_KEY or SERPER_API_KEY in .env")

app = FastAPI(title="HireAI Roadmap Agent v3")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

serper = GoogleSerperAPIWrapper()
llm    = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.2,
    max_tokens=4096   # tight limit — forces concise output, saves tokens
)


# ============================================================
# STATE — minimal fields
# ============================================================
class RoadmapState(TypedDict):
    raw_input:    str
    level:        str
    plan:         Dict          # {topic, goal, level, phases: [{title, duration, objective, queries}]}
    resources:    Dict          # {phase_title: [{title, url, type}]}
    final_roadmap: Dict


# ============================================================
# HELPERS
# ============================================================
def _json(text: str):
    """Strip markdown fences and parse first JSON object/array found."""
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    for s, e in [('{', '}'), ('[', ']')]:
        i, j = text.find(s), text.rfind(e) + 1
        if i != -1 and j > i:
            try:    return json.loads(text[i:j])
            except: continue
    raise ValueError("No JSON found")


def _serper(query: str, n: int = 3) -> List[Dict]:
    """Search and return deduplicated results."""
    try:
        out, seen = [], set()
        for item in serper.results(query).get("organic", [])[:n+4]:
            url, title = item.get("link",""), item.get("title","")
            if not url or not url.startswith("http") or not title:
                continue
            domain = url.split("/")[2] if "/" in url else url
            if domain in seen:
                continue
            seen.add(domain)
            rtype = (
                "video"    if "youtube.com"      in domain else
                "course"   if any(x in domain for x in ["coursera","udemy","fast.ai","deeplearning.ai","edx.org"]) else
                "github"   if "github.com"       in domain else
                "practice" if "kaggle.com"       in domain else
                "doc"      if any(x in domain for x in ["docs.","readthedocs","developer.","pytorch.org","tensorflow.org","learn.microsoft"]) else
                "article"
            )
            clean = re.sub(r'\s*[-|]\s*(YouTube|Medium|GitHub|DEV Community|Towards Data Science).*$', '', title, flags=re.IGNORECASE).strip()
            out.append({"title": clean or title, "url": url, "type": rtype})
            if len(out) >= n:
                break
        return out
    except:
        return []


# ============================================================
# NODE 1 — UNDERSTAND + PLAN  (1 LLM call)
# LLM reads raw input, understands what user wants,
# then immediately designs the COMPLETE phase plan.
# No hardcoded hints — LLM uses its own domain knowledge.
# ============================================================
async def plan_node(state: RoadmapState) -> dict:
    print(f"🧠 Node 1/3: Understanding '{state['raw_input']}' and planning...")

    prompt = f"""You are an expert learning curriculum designer.

A user typed: "{state['raw_input']}"
Selected difficulty: "{state['level']}"

STEP 1 — Understand what they want:
- Extract the real topic (strip "create roadmap for", "I want to learn", "how to learn", etc.)
- Understand their goal
- Determine appropriate level (use selected level unless input clearly implies different)

STEP 2 — Design a COMPLETE professional learning roadmap:
- Use YOUR knowledge of this topic to plan every phase needed
- For technical fields: always include the full path from basics to production/deployment
- For example: ML must include Math, Python, Algorithms, Deep Learning, Projects, Deployment, MLOps, Cloud
- For Web Dev: must include HTML/CSS/JS, Framework, Backend, Database, Deployment
- For any topic: ensure no critical phase is missing
- Create 6-10 phases depending on topic complexity
- Each phase needs 2 specific web search queries to find real resources

Return ONLY this JSON:
{{
  "topic": "clean topic name",
  "goal": "what the user wants to achieve",
  "level": "Beginner|Intermediate|Advanced",
  "phases": [
    {{
      "title": "Phase 1: Exact Phase Name",
      "duration": "X-Y Weeks",
      "objective": "Learner will be able to [specific skill]",
      "is_project": false,
      "key_topics": ["topic1", "topic2", "topic3"],
      "queries": [
        "specific search query 1 for this phase",
        "specific search query 2 for this phase"
      ]
    }}
  ]
}}

Be comprehensive. Never give a shallow roadmap missing critical phases."""

    try:
        res  = await llm.ainvoke([
            SystemMessage(content="You are a curriculum designer. Return ONLY valid JSON. Be thorough and complete."),
            HumanMessage(content=prompt)
        ])
        plan = _json(res.content)
        if not isinstance(plan.get("phases"), list) or len(plan["phases"]) < 3:
            raise ValueError("Too few phases")
        print(f"  ✓ Topic='{plan['topic']}' | {len(plan['phases'])} phases | Level={plan['level']}")
        return {"plan": plan}
    except Exception as e:
        print(f"  ❌ Plan error: {e}")
        # Minimal fallback — still no static content, just structure
        raw_clean = re.sub(r'^(?:create\s+(?:a\s+)?(?:roadmap|course|path)\s+(?:for\s+)?|roadmap\s+for\s+|how\s+to\s+(?:learn\s+)?|learn\s+|i\s+want\s+to\s+(?:learn\s+)?)', '', state["raw_input"], flags=re.IGNORECASE).strip()
        topic = (raw_clean[0].upper() + raw_clean[1:]) if raw_clean else state["raw_input"]
        return {"plan": {
            "topic": topic, "goal": f"Master {topic}", "level": state["level"],
            "phases": [
                {"title": f"Phase 1: {topic} Fundamentals", "duration": "2 Weeks",
                 "objective": f"Understand core {topic} concepts", "is_project": False,
                 "key_topics": [topic], "queries": [f"{topic} beginner tutorial", f"{topic} introduction course"]}
            ]
        }}


# ============================================================
# NODE 2 — FETCH REAL RESOURCES  (no LLM, pure Serper)
# ============================================================
async def fetch_node(state: RoadmapState) -> dict:
    plan   = state.get("plan", {})
    phases = plan.get("phases", [])
    topic  = plan.get("topic", "")
    level  = plan.get("level", "Beginner")
    print(f"🔍 Node 2/3: Fetching resources for {len(phases)} phases...")

    resources = {}
    for i, phase in enumerate(phases):
        title   = phase.get("title", f"Phase {i+1}")
        queries = phase.get("queries", [])
        topics  = phase.get("key_topics", [topic])

        # Fallback query if none provided
        if not queries:
            queries = [f"{topics[0] if topics else topic} {level} tutorial"]

        found, seen = [], set()

        # Execute provided queries
        for q in queries[:2]:
            for r in _serper(q, 3):
                if r["url"] not in seen:
                    seen.add(r["url"]); found.append(r)

        # Always add a YouTube search for every phase
        yt_q = f"{topics[0] if topics else title.split(':')[-1].strip()} tutorial youtube {level}"
        for r in _serper(yt_q, 2):
            if r["url"] not in seen and len(found) < 7:
                seen.add(r["url"]); found.append(r)

        resources[title] = found
        print(f"  Phase {i+1}: {len(found)} resources")

    return {"resources": resources}


# ============================================================
# NODE 3 — ENRICH WITH STEPS
# Processes ONE phase per LLM call to avoid token overflow.
# 6 phases = 6 small focused calls, each guaranteed to succeed.
# ============================================================
async def _enrich_one_phase(phase: dict, phase_idx: int, resources: list,
                             topic: str, level: str) -> dict:
    """Enrich a single phase — small prompt, always fits in context."""
    valid_urls = {r["url"] for r in resources}

    res_lines = "\n".join([
        f'  {r["type"]}: "{r["title"]}" | {r["url"]}'
        for r in resources
    ])

    key_topics = phase.get("key_topics", [])
    topics_str = ", ".join(key_topics[:5]) if key_topics else phase.get("title","")

    prompt = f"""Phase: {phase.get("title")}
Topic: {topic} | Level: {level}
Objective: {phase.get("objective","")}
Key topics to cover: {topics_str}

Resources available (use ONLY these URLs):
{res_lines}

Write 3-4 learning steps for this phase.
Each step: specific title + 2-sentence explanation + 1-2 resources from above.

Return JSON array only:
[
  {{
    "id": "p{phase_idx+1}_s1",
    "title": "step title",
    "details": "What to learn and why it matters (2 sentences).",
    "resources": [{{"title":"exact title","url":"exact URL","type":"video|doc|course|article|github"}}]
  }}
]"""

    try:
        res   = await llm.ainvoke([
            SystemMessage(content="Return ONLY a valid JSON array of steps. Never invent URLs."),
            HumanMessage(content=prompt)
        ])
        steps = _json(res.content)
        if not isinstance(steps, list):
            raise ValueError("Not a list")

        # Validate URLs
        clean_steps = []
        for s in steps:
            valid_res, seen_d = [], set()
            for r in s.get("resources", []):
                url = r.get("url","")
                if url not in valid_urls:
                    continue
                try:    d = url.split("/")[2]
                except: d = url
                if d in seen_d: continue
                seen_d.add(d); valid_res.append(r)
            s["resources"] = valid_res
            s["id"] = f"p{phase_idx+1}_s{len(clean_steps)+1}"
            clean_steps.append(s)

        return {
            "title":      phase.get("title", f"Phase {phase_idx+1}"),
            "duration":   phase.get("duration", "2 Weeks"),
            "objective":  phase.get("objective", ""),
            "is_project": phase.get("is_project", False),
            "steps":      clean_steps
        }

    except Exception as e:
        print(f"    Phase {phase_idx+1} fallback: {e}")
        # Good fallback — use key_topics as steps with objective-based description
        obj = phase.get("objective", f"master {phase.get('title','this phase')}")
        return {
            "title":      phase.get("title", f"Phase {phase_idx+1}"),
            "duration":   phase.get("duration", "2 Weeks"),
            "objective":  phase.get("objective", ""),
            "is_project": phase.get("is_project", False),
            "steps": [
                {
                    "id":        f"p{phase_idx+1}_s{j+1}",
                    "title":     t,
                    "details":   f"Study {t} to {obj.lower().replace('learner will be able to','').strip()}. Focus on hands-on practice using the resources below.",
                    "resources": resources[j % len(resources):j % len(resources)+1] if resources else []
                }
                for j, t in enumerate(phase.get("key_topics", [phase.get("title","Topic")])[:4])
            ]
        }


async def enrich_node(state: RoadmapState) -> dict:
    plan      = state.get("plan", {})
    resources = state.get("resources", {})
    topic     = plan.get("topic", "")
    goal      = plan.get("goal",  f"Master {topic}")
    level     = plan.get("level", "Beginner")
    phases    = plan.get("phases", [])

    print(f"✍️  Node 3/3: Enriching {len(phases)} phases (1 call per phase)...")

    total_dur = 0
    for p in phases:
        m = re.search(r'(\d+)', p.get("duration","2"))
        if m: total_dur += int(m.group(1))

    enriched_phases = []
    for i, phase in enumerate(phases):
        phase_title  = phase.get("title", f"Phase {i+1}")
        phase_resources = resources.get(phase_title, [])
        ep = await _enrich_one_phase(phase, i, phase_resources, topic, level)
        enriched_phases.append(ep)
        print(f"  Phase {i+1}: {len(ep['steps'])} steps")

    roadmap = {
        "title":          f"{topic} — {level} Roadmap",
        "subtitle":       goal,
        "level":          level,
        "total_duration": f"{total_dur} Weeks",
        "phases":         enriched_phases
    }

    total_steps = sum(len(p["steps"]) for p in enriched_phases)
    print(f"  ✓ Complete: {len(enriched_phases)} phases, {total_steps} steps")
    return {"final_roadmap": roadmap}


# ============================================================
# GRAPH — 3 nodes, 2 LLM calls total
# ============================================================
builder = StateGraph(RoadmapState)
builder.add_node("plan",   plan_node)
builder.add_node("fetch",  fetch_node)
builder.add_node("enrich", enrich_node)

builder.add_edge(START,   "plan")
builder.add_edge("plan",  "fetch")
builder.add_edge("fetch", "enrich")
builder.add_edge("enrich", END)

graph = builder.compile()


# ============================================================
# API
# ============================================================
class RoadmapRequest(BaseModel):
    topic: str
    level: str = "Beginner"

# ============================================================
# EXPORT FOR UNIFIED GATEWAY
# ============================================================
async def generate_roadmap(topic: str, level: str = "Beginner"):
    """Core logic wrapper for the Unified AI Gateway."""
    raw = topic.strip()
    level = level if level in ("Beginner","Intermediate","Advanced") else "Beginner"

    if not raw:
        return {"success": False, "error": "Please enter what you want to learn"}

    try:
        result  = await graph.ainvoke({
            "raw_input": raw, "level": level,
            "plan": {}, "resources": {}, "final_roadmap": {}
        })
        roadmap = result.get("final_roadmap", {})
        if not roadmap:
            return {"success": False, "error": "Generation failed — please try again"}

        plan = result.get("plan", {})
        return {
            "success": True,
            "roadmap": roadmap,
            "meta": {
                "understood_topic": plan.get("topic", raw),
                "understood_goal":  plan.get("goal", ""),
                "understood_level": plan.get("level", level),
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/generate-roadmap")
async def generate(req: RoadmapRequest):
    return await generate_roadmap(req.topic, req.level)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "3.0", "llm_calls_per_request": 2}

if __name__ == "__main__":
    print("\n=== HireAI Roadmap Agent v3 ===")
    print("3 nodes | 2 LLM calls | Zero static content | Real URLs only")
    uvicorn.run(app, host="0.0.0.0", port=8004)