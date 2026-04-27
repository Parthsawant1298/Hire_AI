# 🚀 HireAI - Complete Platform Architecture

**Enterprise AI-Powered Hiring Ecosystem with Growth Engine**
A comprehensive, microservices-based platform that provides end-to-end automated recruitment with candidate development features.

---

## 🏗️ Complete System Architecture

```mermaid
graph TD
    %% Styling for professional presentation
    classDef userInterface fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#0d47a1
    classDef apiGateway fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c
    classDef microservice fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#1b5e20
    classDef database fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100
    classDef external fill:#fafafa,stroke:#616161,stroke-width:1.5px,stroke-dasharray:5 5,color:#424242
    classDef middleware fill:#f8bbd9,stroke:#c2185b,stroke-width:2px,color:#880e4f

    %% === USER INTERFACE LAYER ===
    subgraph UI_LAYER ["🖥️ PRESENTATION & USER INTERFACE LAYER"]
        direction TB

        subgraph CANDIDATE_UI ["👤 CANDIDATE DASHBOARD"]
            MAIN_PAGE[Landing Page<br/>app/page.js]:::userInterface
            AUTH_PAGES[Auth Pages<br/>app/login • app/register]:::userInterface
            PROFILE_PAGE[Profile Management<br/>app/profile/page.js]:::userInterface
            JOBS_PAGE[Job Search & Browse<br/>app/jobs/page.js]:::userInterface
            JOB_DETAIL[Job Details & Apply<br/>app/jobs/[jobId]/page.js]:::userInterface
            VERIFICATION_UI[Biometric Verification<br/>app/verification/setup]:::userInterface
            INTERVIEW_UI[Voice Interview<br/>app/interview/[jobId]]:::userInterface
            RESUME_OPT[Resume Optimizer<br/>app/resume-optimizer]:::userInterface
            COURSE_UI[Learning Courses<br/>app/courses/page.js]:::userInterface
            HACK_UI[Hackathon Finder<br/>app/hackathons/page.js]:::userInterface
        end

        subgraph HOST_UI ["🏢 EMPLOYER DASHBOARD"]
            HOST_AUTH[Host Authentication<br/>app/host/login • register]:::userInterface
            HOST_DASH[Host Dashboard<br/>app/host/dashboard]:::userInterface
            CREATE_JOB[Job Creation<br/>app/host/create-job]:::userInterface
            MANAGE_JOBS[Job Management<br/>app/host/jobs]:::userInterface
            CANDIDATES_VIEW[Candidate Review<br/>app/host/candidates]:::userInterface
            ANALYTICS_VIEW[Analytics Dashboard<br/>app/host/analytics]:::userInterface
            HOST_PROFILE[Host Profile<br/>app/host/profile]:::userInterface
        end
    end

    %% === API GATEWAY LAYER ===
    subgraph API_LAYER ["🌐 API GATEWAY & SECURITY LAYER (Next.js :3000)"]
        direction TB

        subgraph AUTH_MIDDLEWARE ["🔐 Authentication Middleware"]
            USER_AUTH_MW[User Auth Guard<br/>middleware/auth.js]:::middleware
            HOST_AUTH_MW[Host Auth Guard<br/>middleware/host-auth.js]:::middleware
        end

        subgraph API_ROUTES ["📡 REST API Endpoints"]
            CANDIDATE_APIS[👤 Candidate APIs<br/>• /api/auth/*<br/>• /api/user/*<br/>• /api/jobs/[jobId]/*<br/>• /api/verification/*<br/>• /api/interview/*]:::apiGateway
            HOST_APIS[🏢 Host APIs<br/>• /api/host/auth/*<br/>• /api/host/jobs/*<br/>• /api/host/jobs/[jobId]/*<br/>• /api/candidates/*]:::apiGateway
        end
    end

    %% === MICROSERVICES LAYER ===
    subgraph SERVICES_LAYER ["⚙️ DISTRIBUTED AI MICROSERVICES ECOSYSTEM"]
        direction TB

        subgraph CORE_SERVICES ["🎯 Core Recruitment Services"]
            RESUME_SERVICE[Resume AI Processor<br/>:8000 FastAPI<br/>• /process-resume<br/>• PDF/DOCX parsing<br/>• AI optimization]:::microservice
            JOB_MATCHER[Intelligent Job Matcher<br/>:8002 FastAPI<br/>• /upload-resume<br/>• Smart matching<br/>• Ranking algorithm]:::microservice
        end

        subgraph SECURITY_SERVICES ["🔒 Biometric Security Services"]
            FACE_SERVICE[Face Verification<br/>:8001 Flask<br/>• /verify<br/>• MediaPipe detection<br/>• Cloudinary storage]:::microservice
            VOICE_SERVICE[Voice Verification<br/>:8003 Flask<br/>• /verify<br/>• Audio processing<br/>• Speaker recognition]:::microservice
        end

        subgraph GROWTH_SERVICES ["📈 Growth & Development Engine"]
            COURSE_SERVICE[AI Course Generator<br/>:8005 FastAPI<br/>• /chat • /generate-course<br/>• Personalized learning<br/>• YouTube integration]:::microservice
            HACKATHON_SERVICE[Hackathon Discovery Agent<br/>:8006 FastAPI<br/>• /search-hackathons<br/>• GitHub integration<br/>• Smart recommendations]:::microservice
        end
    end

    %% === DATA PERSISTENCE LAYER ===
    subgraph DATA_LAYER ["💾 DATA PERSISTENCE & MODELS"]
        direction LR

        USER_MODEL[👤 User Model<br/>models/user.js<br/>• Profile data<br/>• Verification status<br/>• Applications]:::database
        HOST_MODEL[🏢 Host Model<br/>models/host.js<br/>• Company info<br/>• Subscription<br/>• Jobs created]:::database
        JOB_MODEL[💼 Job Model<br/>models/job.js<br/>• Job details<br/>• Applications<br/>• Analytics]:::database

        MONGO_DB[(🍃 MongoDB Atlas<br/>Document Database<br/>• Session management<br/>• File metadata<br/>• Analytics data)]:::database
    end

    %% === SHARED LIBRARIES ===
    subgraph SHARED_LIBS ["📚 SHARED LIBRARIES & UTILITIES"]
        direction TB

        AI_SERVICES[🧠 AI Services<br/>lib/ai-services.js<br/>• Groq integration<br/>• Content generation]:::apiGateway
        VAPI_SERVICE[🎙️ VAPI Service<br/>lib/vapi-service.js<br/>• Voice interviews<br/>• Assistant management]:::apiGateway
        VERIFICATION_LIB[✅ Verification Utils<br/>lib/verification.js<br/>• Face/voice validation<br/>• Fraud detection]:::apiGateway
        EMAIL_SERVICE[📧 Email Service<br/>lib/email-service.js<br/>• Notifications<br/>• SMTP handling]:::apiGateway
        CLOUD_SERVICE[☁️ Cloudinary Service<br/>lib/cloudinary.js<br/>• Media upload<br/>• CDN management]:::apiGateway
        DB_SERVICE[🗄️ Database Service<br/>lib/mongodb.js<br/>• Connection pool<br/>• Query optimization]:::apiGateway
    end

    %% === EXTERNAL INFRASTRUCTURE ===
    subgraph EXTERNAL_LAYER ["🌍 EXTERNAL CLOUD & AI INFRASTRUCTURE"]
        direction TB

        subgraph AI_PROVIDERS ["🤖 AI & LLM Providers"]
            GROQ_AI[Groq Lightning<br/>• Resume analysis<br/>• Job matching<br/>• Verification AI]:::external
            GEMINI_AI[Google Gemini<br/>• Course generation<br/>• Content creation<br/>• Multimodal AI]:::external
        end

        subgraph SEARCH_DATA ["🔍 Search & Data APIs"]
            SERPER_API[Google Serper<br/>• Web search<br/>• Real-time data<br/>• Market research]:::external
            GITHUB_API[GitHub API<br/>• Repository analysis<br/>• Skill extraction<br/>• Profile validation]:::external
        end

        subgraph VOICE_INFRA ["🎤 Voice Infrastructure"]
            VAPI_AI[VAPI.ai Platform<br/>• Real-time interviews<br/>• Voice assistants<br/>• WebRTC streaming]:::external
        end

        subgraph MEDIA_STORAGE ["📁 Media & Storage"]
            CLOUDINARY[Cloudinary CDN<br/>• Image processing<br/>• Video storage<br/>• Media optimization]:::external
            SMTP_SERVICE[SMTP Service<br/>• Email delivery<br/>• Notifications<br/>• Transactional emails]:::external
        end
    end

    %% === CONNECTION FLOWS ===

    %% User Interface to API Gateway
    CANDIDATE_UI --> API_ROUTES
    HOST_UI --> API_ROUTES

    %% API Gateway through Middleware
    API_ROUTES --> AUTH_MIDDLEWARE

    %% Middleware to Database
    USER_AUTH_MW --> USER_MODEL
    HOST_AUTH_MW --> HOST_MODEL
    API_ROUTES --> JOB_MODEL

    %% API Gateway to Shared Libraries
    API_ROUTES --> AI_SERVICES
    API_ROUTES --> VAPI_SERVICE
    API_ROUTES --> VERIFICATION_LIB
    API_ROUTES --> EMAIL_SERVICE
    API_ROUTES --> CLOUD_SERVICE
    API_ROUTES --> DB_SERVICE

    %% Direct Frontend to Microservices (Current Implementation)
    RESUME_OPT -.->|Direct Call| RESUME_SERVICE
    JOBS_PAGE -.->|Direct Call| JOB_MATCHER
    COURSE_UI -.->|Direct Call| COURSE_SERVICE
    HACK_UI -.->|Direct Call| HACKATHON_SERVICE

    %% API Gateway to Security Services
    API_ROUTES --> FACE_SERVICE
    API_ROUTES --> VOICE_SERVICE

    %% Shared Libraries to External Services
    AI_SERVICES --> GROQ_AI
    VAPI_SERVICE --> VAPI_AI
    VERIFICATION_LIB --> GROQ_AI
    EMAIL_SERVICE --> SMTP_SERVICE
    CLOUD_SERVICE --> CLOUDINARY
    DB_SERVICE --> MONGO_DB

    %% Microservices to External Infrastructure
    RESUME_SERVICE --> GROQ_AI
    JOB_MATCHER --> GROQ_AI
    JOB_MATCHER --> SERPER_API
    FACE_SERVICE --> CLOUDINARY
    VOICE_SERVICE --> CLOUDINARY
    COURSE_SERVICE --> GEMINI_AI
    COURSE_SERVICE --> SERPER_API
    HACKATHON_SERVICE --> GEMINI_AI
    HACKATHON_SERVICE --> SERPER_API
    HACKATHON_SERVICE --> GITHUB_API
```

---

## 🔄 Complete User Journey Flows

### 👤 Candidate Experience Flow
```
1. Registration → 2. Profile Setup → 3. Biometric Verification → 4. Job Discovery
    ↓
8. Skill Development ← 7. Interview Completion ← 6. Voice Interview ← 5. Job Application
    ↓
9. Course Learning → 10. Hackathon Participation → 11. Continuous Growth
```

### 🏢 Employer Experience Flow
```
1. Host Registration → 2. Company Setup → 3. Job Creation → 4. AI Question Generation
    ↓
8. Analytics Dashboard ← 7. Candidate Selection ← 6. Automated Ranking ← 5. Application Processing
```

---

## 📊 Service Architecture Details

| **Layer** | **Component** | **Technology** | **Port** | **Primary Function** |
|-----------|---------------|----------------|----------|---------------------|
| **Frontend** | Next.js App | React 19 + Tailwind | :3000 | User Interface & SSR |
| **Gateway** | API Routes | Next.js API | :3000 | Request routing & Auth |
| **Auth** | Middleware | JWT + Cookies | - | Authentication & Guards |
| **Resume** | FastAPI | Python + LangGraph | :8000 | Resume optimization |
| **Matching** | FastAPI | Python + Groq | :8002 | Intelligent job matching |
| **Security** | Flask | Python + MediaPipe | :8001 | Face verification |
| **Voice** | Flask | Python + Audio | :8003 | Voice verification |
| **Learning** | FastAPI | Python + Gemini | :8005 | Course generation |
| **Growth** | FastAPI | Python + GitHub | :8006 | Hackathon discovery |
| **Database** | MongoDB | Mongoose ODM | - | Data persistence |
| **Storage** | Cloudinary | CDN + Media | - | File & media storage |

---

## 🚀 Key Platform Features

### **Core Recruitment Engine**
- ✅ **Automated Resume Processing** - AI-powered parsing and optimization
- ✅ **Intelligent Job Matching** - Advanced algorithms for perfect matches
- ✅ **Biometric Security** - Face and voice verification
- ✅ **Real-time Voice Interviews** - VAPI.ai powered conversations
- ✅ **Automated Ranking** - AI-driven candidate scoring

### **Growth & Development Ecosystem**
- ✅ **Personalized Learning** - AI-generated courses based on skill gaps
- ✅ **Hackathon Discovery** - Smart recommendations based on skills
- ✅ **Skill Development Tracking** - Progress monitoring and analytics
- ✅ **GitHub Integration** - Real skill validation from repositories

### **Enterprise Features**
- ✅ **Multi-tenant Architecture** - Separate candidate and employer portals
- ✅ **Advanced Analytics** - Comprehensive hiring insights
- ✅ **Email Automation** - Automated notifications and updates
- ✅ **Fraud Prevention** - AI-powered verification and validation
- ✅ **Scalable Infrastructure** - Microservices for high performance

---

## 🔧 Technical Implementation

### **Frontend Architecture (Next.js 14+)**
- **App Router** - Modern routing with layouts and nested routes
- **Server Components** - Optimized performance with RSC
- **Client Components** - Interactive UI with React 19
- **Middleware** - Authentication guards and request processing

### **Backend Microservices**
- **FastAPI Services** - High-performance Python APIs
- **Flask Services** - Specialized processing services
- **LangGraph Agents** - AI workflow orchestration
- **MongoDB** - Flexible document database

### **AI & ML Integration**
- **Groq Lightning** - Ultra-fast inference for resume analysis
- **Google Gemini** - Multimodal AI for content generation
- **VAPI.ai** - Real-time voice interview platform
- **Custom Agents** - Specialized AI workers for each domain

---

## 📈 Scalability & Performance

- **Microservices Architecture** - Independent scaling of components
- **CDN Integration** - Global content delivery via Cloudinary
- **Database Optimization** - MongoDB with proper indexing
- **Caching Strategy** - Redis-ready for session and query caching
- **Load Balancing** - Ready for horizontal scaling
- **API Rate Limiting** - Built-in protection mechanisms

---

*This architecture represents the complete HireAI platform - a sophisticated, AI-powered hiring ecosystem that not only matches candidates with jobs but actively helps them grow and develop their skills through personalized learning and opportunity discovery.*
