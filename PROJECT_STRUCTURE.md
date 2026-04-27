# Hire_AI Project Structure

## Recent Updates (Question Generation Integration)

### ✅ Implemented Features:
1. **AI-Powered Question Generation** - After creating a job, hosts are redirected to `/host/jobs/[jobId]/questions` where AI automatically generates interview questions
2. **Question Management UI** - Full CRUD operations for interview questions (edit, delete, add custom)
3. **Question Regeneration** - Hosts can regenerate all questions using AI
4. **Job Finalization** - Publish job and create interview link after reviewing questions

### 📁 Key Files Updated:
- `app/host/jobs/[jobId]/questions/page.js` - Questions management UI
- `app/api/host/jobs/[jobId]/questions/generate/route.js` - AI question generation endpoint
- `app/api/host/jobs/[jobId]/questions/update/route.js` - Save/update questions
- `app/api/host/jobs/[jobId]/finalize/route.js` - Publish job
- `components/Host/Createjob.jsx` - Redirects to questions page after job creation
- `lib/ai-services.js` - Contains `generateInterviewQuestions()` function

### 🔄 Workflow:
1. Host fills out job creation form
2. Form submits → Creates draft job in database
3. Redirects to `/host/jobs/[jobId]/questions`
4. AI automatically generates 5+ questions based on job details
5. Host can edit/delete/add questions
6. Host clicks "Publish Job" → Job becomes active with interview link

```
Hire_AI/
├── app/
│   ├── globals.css
│   ├── layout.js
│   ├── page.js
│   ├── about/
│   │   └── page.js
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.js
│   │   │   ├── logout/
│   │   │   │   └── route.js
│   │   │   ├── register/
│   │   │   │   └── route.js
│   │   │   └── user/
│   │   │       └── route.js
│   │   ├── candidates/
│   │   │   └── [candidateId]/
│   │   │       └── export-pdf/
│   │   ├── host/
│   │   │   ├── auth/
│   │   │   ├── jobs/
│   │   │   └── update-profile-picture/
│   │   ├── interview/
│   │   │   ├── [jobId]/
│   │   │   ├── create-assistant/
│   │   │   ├── get-feedback/
│   │   │   ├── process-local/
│   │   │   └── verify-face/
│   │   ├── jobs/
│   │   │   ├── [jobId]/
│   │   │   └── list/
│   │   ├── resume/
│   │   │   ├── download-pdf/
│   │   │   └── optimize/
│   │   ├── user/
│   │   │   ├── applications/
│   │   │   ├── stats/
│   │   │   └── update-profile-picture/
│   │   └── verification/
│   │       ├── generate-text/
│   │       ├── upload-profile/
│   │       ├── verify-face/
│   │       └── verify-voice/
│   ├── contact/
│   │   └── page.js
│   ├── faq/
│   │   └── page.js
│   ├── host/
│   │   ├── analytics/
│   │   │   └── page.js
│   │   ├── candidates/
│   │   │   └── page.js
│   │   ├── create-job/
│   │   │   └── page.js
│   │   ├── dashboard/
│   │   │   └── page.js
│   │   ├── jobs/
│   │   │   ├── page.js
│   │   │   └── [jobId]/
│   │   ├── login/
│   │   │   └── page.js
│   │   ├── profile/
│   │   │   └── page.js
│   │   └── register/
│   │       └── page.js
│   ├── interview/
│   │   └── [jobId]/
│   │       ├── page.js
│   │       └── completed/
│   ├── job-search/
│   │   └── page.js
│   ├── jobs/
│   │   ├── page.js
│   │   └── [jobId]/
│   │       └── page.js
│   ├── login/
│   │   └── page.js
│   ├── main/
│   │   └── page.js
│   ├── profile/
│   │   └── page.js
│   ├── register/
│   │   └── page.js
│   ├── resume-optimizer/
│   │   └── page.js
│   └── verification/
│       ├── pre-interview/
│       │   └── page.js
│       └── setup/
│           └── page.js
├── components/
│   ├── About.jsx
│   ├── Aboutus.jsx
│   ├── Contact.jsx
│   ├── Faq.jsx
│   ├── Footer.jsx
│   ├── Header.jsx
│   ├── Hero.jsx
│   ├── JobCard.jsx
│   ├── Login.jsx
│   ├── Lowerfooter.jsx
│   ├── Navbar.jsx
│   ├── Pricing.jsx
│   ├── Profile.jsx
│   ├── Register.jsx
│   ├── ResumeBuilder.jsx
│   ├── Revenue.jsx
│   ├── Services.jsx
│   ├── Testimonials.jsx
│   ├── VerificationReport.jsx
│   ├── Why.jsx
│   └── Host/
│       ├── Createjob.jsx
│       ├── jobquestions.jsx
│       ├── Login.jsx
│       ├── Navbar.jsx
│       ├── Profile.jsx
│       └── Register.jsx
├── lib/
│   ├── ai-services.js
│   ├── cloudinary.js
│   ├── email-service.js
│   ├── mongodb.js
│   ├── pdf-utils.js
│   ├── resume-extraction.js
│   ├── vapi-service.js
│   ├── verification.js
│   ├── webhook-config.js
│   └── templates/
│       └── resume_template.html
├── middleware/
│   ├── auth.js
│   └── host-auth.js
├── models/
│   ├── host.js
│   ├── job.js
│   └── user.js
├── public/
├── .env
├── .env.example
├── .env.local
├── .gitignore
├── face_service.py
├── job_matcher_service.py
├── jsconfig.json
├── next.config.mjs
├── package.json
├── package-lock.json
├── postcss.config.cjs
├── requirements.txt
├── resume_ai_agent.py
├── resume_fastapi.py
├── start_all_services.ps1
├── test_resume.txt
├── test_verification_connection.py
└── voice_service.py
```
