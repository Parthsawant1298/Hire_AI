# HireAI Unified AI Services 🚀

This directory contains the entire AI suite for HireAI, including verification, resume optimization, and career agents.

## 🌟 The Unified Architecture
We have consolidated all services into a single **Production Gateway**. This reduces hosting costs and simplifies local development.

- **Port:** 8080 (Configurable via `PORT` env)
- **Endpoints:**
  - `POST /verify/voice`
  - `POST /verify/face`
  - `POST /process-resume` (Resume Optimizer)
  - `POST /generate-roadmap` (Roadmap Agent)
  - `POST /chat` (Course Assistant)
  - `POST /generate-course` (Course Generator)
  - `GET  /courses` (User Course Library)

## 💻 Running Locally

1.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
2.  **Environment Variables:**
    Ensure your `.env` (in the root) has:
    - `GOOGLE_API_KEY`
    - `SERPER_API_KEY`
    - `GROQ_API_KEY`
    - `MONGODB_URI`
3.  **Start the Gateway:**
    ```bash
    python ai_gateway.py
    ```

## 🚢 Cloud Deployment (Docker)

This folder is designed to be deployed to **Railway.app** or **Render** using the provided `Dockerfile`.

1.  Push this folder to your repository.
2.  Connect to Railway.
3.  Set the environment variables in the Railway dashboard.
4.  Set `AI_GATEWAY_URL` in your Vercel Dashboard to point to your Railway URL.

## 🛠️ Included Agents
- `voice_service.py`: SpeechBrain-based speaker verification.
- `face_service.py`: InsightFace-based facial matching.
- `resume_ai_agent.py`: LangGraph pipeline for resume enhancement.
- `roadmap_agent.py`: Career path planner.
- `course.py`: Personalized learning course generator.
- `job_matcher_service.py`: Multi-source AI job finder.
