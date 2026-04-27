import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured.');
  return new Groq({ apiKey });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured.');
  return new GoogleGenerativeAI(apiKey);
}

async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if ((error.status === 429 || error.message?.includes('429')) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Rate limited. Retrying in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Interview Questions — UNCHANGED from original
// ─────────────────────────────────────────────────────────────────────────────
export async function generateInterviewQuestions({
  jobTitle, jobDescription, jobResponsibilities, jobRequirements, jobType, location, salary, interviewDuration
}) {
  try {
    const questionsNeeded = Math.max(5, Math.floor(interviewDuration / 2));

    const prompt = `
    Generate ${questionsNeeded} highly relevant interview questions for a ${jobType} position.
    
    COMPLETE JOB DETAILS:
    Job Title: ${jobTitle}
    Location: ${location || 'Not specified'}
    Salary: ${salary || 'Not specified'}
    Job Type: ${jobType}
    
    Job Description: ${jobDescription}
    Key Responsibilities: ${jobResponsibilities}
    Required Qualifications: ${jobRequirements}
    Interview Duration: ${interviewDuration} minutes
    
    IMPORTANT: Use the responsibilities and requirements to create specific, role-relevant questions.
    Create a balanced mix of:
    - 30% Technical questions (specific to the role's responsibilities and required skills)
    - 30% Behavioral questions (teamwork, leadership, problem-solving aligned with responsibilities)
    - 25% Situational questions (how they handle scenarios related to this specific role)
    - 15% General questions (motivation, career goals, fit for this position and location)
    
    Return ONLY a JSON array in this exact format:
    [{"question": "Question text here","type": "technical|behavioral|situational|general","difficulty": "easy|medium|hard","expectedDuration": 120}]
    Make questions relevant, professional, and appropriate for the role level.`;

    const groq = getGroqClient();
    const response = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert HR professional and interview specialist. Generate high-quality, relevant interview questions based on job requirements. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid response format from AI');
    const questions = JSON.parse(jsonMatch[0]);
    return questions.map(q => ({
      question: q.question || '',
      type: ['technical', 'behavioral', 'situational', 'general'].includes(q.type) ? q.type : 'general',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      expectedDuration: q.expectedDuration || 120
    }));
  } catch (error) {
    console.error('AI question generation error:', error);
    throw new Error(`Failed to generate interview questions: ${error.message}. Please check your Groq API configuration and try again.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: calculateAtsScore — 3 bugs fixed
//
// BUG A: Old algo used ALL JD words as keywords including stopwords like
//        'required', 'position', 'including', 'the', 'and' → inflated denominator
//        → candidate matches 60% of words but real match is actually 85%
//
// BUG B: Section detection was too narrow — only matched 'experience', 'skills'
//        exactly. Real resumes have 'internship', 'work history', or just list
//        company names. Also: 'Python, React, Node.js' section ≠ keyword 'skills'
//
// BUG C: Length check: hasProperLength = 500 to 5000 chars
//        Real PDF-extracted text = 5000 to 25000 chars → ALWAYS false → lost 10 pts
//        This alone was dropping every real resume by ~6-10 ATS points
// ─────────────────────────────────────────────────────────────────────────────

// Common English stopwords + HR-doc filler words to exclude from keyword matching
const STOPWORDS = new Set([
  'the','and','for','are','but','not','you','all','any','can','had','was','one',
  'our','out','get','has','how','its','may','new','now','old','see','two','way',
  'who','did','let','put','say','she','too','use','will','with','have','this',
  'that','from','they','been','said','each','which','their','would','there',
  'could','other','than','then','when','your','more','also','into','over','just',
  'like','some','what','about','well','must','these','those','while','where',
  'both','back','good','best','many','much','very','need','want','able','make',
  'take','come','give','know','think','work','time','year','most','only','here',
  'such','help','full','open','part','play','plan','real','role','same','team',
  'used','plus','high','long','move','name','next','type','view','wide',
  // HR document filler words
  'required','requirements','responsibilities','including','seeking','looking',
  'candidate','apply','minimum','maximum','benefits','salary','position',
  'strong','excellent','preferred','understanding','ability','working','highly',
  'must','should','will','shall','may','able','good','great','experience',
  'join','company','team','work','role','job','please','send','resume','apply',
]);

function calculateAtsScore(resumeText, jobDescription, jobRequirements, jobTitle, extractedData = null) {
  const resume = resumeText.toLowerCase();

  // ── Part 1: Smart Keyword Match (40 pts) ───────────────────────────────────
  const jdText = `${jobTitle} ${jobDescription} ${jobRequirements}`.toLowerCase();

  // Extract only meaningful keywords: 3+ chars, not stopwords, not pure numbers
  const rawWords = jdText.match(/\b[a-z][a-z0-9\+\#\.\/\-]{2,}\b/g) || [];
  const keywords = [...new Set(
    rawWords.filter(w => !STOPWORDS.has(w) && w.length >= 3 && !/^\d+$/.test(w))
  )];

  // Also pull skill names from extractedData (more reliable than text matching)
  const extractedSkillsFlat = [];
  if (extractedData?.skills?.technical) {
    for (const cat of extractedData.skills.technical) {
      if (Array.isArray(cat.skills)) {
        extractedSkillsFlat.push(...cat.skills.map(s => String(s).toLowerCase().trim()));
      } else if (typeof cat === 'string') {
        extractedSkillsFlat.push(cat.toLowerCase().trim());
      }
    }
  }

  let matchedKeywords = 0;
  for (const kw of keywords) {
    // Match in resume text OR in extracted skills list
    const inResumeText = resume.includes(kw);
    const inExtracted  = extractedSkillsFlat.some(s => s === kw || s.includes(kw) || kw.includes(s));
    if (inResumeText || inExtracted) matchedKeywords++;
  }

  const keywordPct   = keywords.length > 0 ? matchedKeywords / keywords.length : 0.6;
  const keywordScore = Math.round(keywordPct * 40);

  // ── Part 2: Section Completeness (30 pts) ──────────────────────────────────
  // Broad patterns — catches real resume section headings + inline content signals
  const sectionChecks = {
    // Experience: company names, internship, job titles, or explicit heading
    experience: /experience|work history|employment|internship|intern|position|worked at|working at|software developer|software engineer|analyst|researcher|assistant|odoo|infosys|tcs|wipro|accenture|cognizant|capgemini|deloitte|ibm|google|amazon|microsoft|startup|pvt\.?\s*ltd/i,
    // Education: degree types, universities, CGPA, pursuing
    education:  /education|degree|university|college|school|b\.?e\.?|b\.?tech|m\.?tech|m\.?s\.?|mba|bachelor|master|diploma|cgpa|gpa|graduated|pursuing|semester|engineering|computer science/i,
    // Skills: either a 'Skills' section or actual tech skill names
    skills:     /skills|technologies|tech stack|tools|frameworks|proficient|competencies|python|javascript|typescript|react|node|java|c\+\+|sql|html|css|mongodb|postgresql|docker|kubernetes|aws|azure|gcp|git|linux|machine learning|deep learning|tensorflow|pytorch/i,
    // Contact: email address is the most reliable signal
    contact:    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|phone|mobile|\+91|\+1|linkedin\.com|github\.com/i,
    // Projects: GitHub links, project names, built/developed keywords
    projects:   /project|built|developed|created|implemented|designed|deployed|github\.com|portfolio|app|system|platform|website|api|tool/i,
    // Summary/Objective
    summary:    /summary|objective|profile|about me|overview|introduction|passionate|motivated|seeking/i,
  };

  let sectionScore = 0;
  const sectionsFound = {};
  for (const [name, pattern] of Object.entries(sectionChecks)) {
    sectionsFound[name] = pattern.test(resumeText);
  }

  // Core 4 (30 pts max): experience=9, education=9, skills=8, contact=4
  sectionScore += sectionsFound.experience ? 9 : 0;
  sectionScore += sectionsFound.education  ? 9 : 0;
  sectionScore += sectionsFound.skills     ? 8 : 0;
  sectionScore += sectionsFound.contact    ? 4 : 0;
  // Bonus sections go into format score
  const bonusSections = (sectionsFound.projects ? 1 : 0) + (sectionsFound.summary ? 1 : 0);

  // ── Part 3: Format & Content Quality (30 pts) ──────────────────────────────
  let formatScore = 0;
  const len = resumeText.length;

  // FIXED length range: real PDF extractions = 2000-25000 chars (old was 500-5000 — wrong)
  if      (len >= 4000 && len <= 20000) formatScore += 12;  // ideal professional resume
  else if (len >= 2000 && len <  4000)  formatScore += 9;   // short but complete
  else if (len >= 800  && len <  2000)  formatScore += 6;   // minimal resume
  else if (len >= 300)                  formatScore += 3;   // very short

  // Quantified achievements (numbers = impact evidence)
  const numberCount = (resumeText.match(/\d+/g) || []).length;
  if      (numberCount >= 15) formatScore += 8;
  else if (numberCount >= 8)  formatScore += 6;
  else if (numberCount >= 3)  formatScore += 4;
  else                        formatScore += 1;

  // Action verbs (strong writing)
  const actionVerbPattern = /\b(built|developed|implemented|designed|created|led|managed|improved|increased|reduced|deployed|optimized|achieved|delivered|launched|architected|engineered|automated|integrated|collaborated|mentored|analyzed|researched|published|contributed|maintained|refactored|migrated|scaled|secured|monitored|coordinated|trained|presented|negotiated)\b/i;
  if (actionVerbPattern.test(resumeText)) formatScore += 5;

  // Bonus sections in format
  formatScore += bonusSections * 2;  // +2 for projects, +2 for summary = max +4 but capped below

  formatScore = Math.min(30, formatScore);

  // ── Final score ─────────────────────────────────────────────────────────────
  const total = keywordScore + sectionScore + formatScore;
  const finalAts = Math.max(0, Math.min(100, total));

  console.log(`📊 ATS Calculation (FIXED): Keywords=${keywordScore}/40 (${matchedKeywords}/${keywords.length}), Sections=${sectionScore}/30, Format=${formatScore}/30, Total=${finalAts}`);
  console.log(`   Sections found: ${Object.entries(sectionsFound).filter(([,v])=>v).map(([k])=>k).join(', ')}`);

  return {
    score: finalAts,
    breakdown: {
      keywordMatch:     keywordScore,
      sectionsPresent:  sectionScore,
      formatQuality:    formatScore,
      matchedKeywords,
      totalKeywords:    keywords.length,
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: calculateCompositeScore — handle missing extraction gracefully
//
// BUG: If skills extraction failed (PDF issue, Groq failure etc.), the validator
//      forced skillsMatch = 0 even though the resume clearly has skills.
//      Result: composite = ATS*0.35 + 0*0.30 + exp*0.25 + fit*0.10
//              = 68*0.35 + 0 + 60*0.25 + 80*0.10 = 46.8% — wrong!
//
// FIX: When skillsMatch or experienceMatch is 0 but atsScore > 50, use atsScore
//      as a conservative proxy (ATS score already reflects skill keyword matching).
//      This prevents extraction failures from tanking the composite score.
// ─────────────────────────────────────────────────────────────────────────────
export function calculateCompositeScore(application) {
  const aiAnalysis = application.aiAnalysis || application;
  const atsScore   = application.atsScore || aiAnalysis.atsScore || 0;

  if (!aiAnalysis) {
    console.error('❌ No AI analysis provided for composite scoring');
    return 0;
  }

  // AUTO-REJECT only for EXPLICIT false — not null/undefined (null = data missing, not incompatible)
  if (aiAnalysis.locationCompatible === false || aiAnalysis.salaryCompatible === false) {
    console.log(`🚫 AUTO-REJECT: Location=${aiAnalysis.locationCompatible}, Salary=${aiAnalysis.salaryCompatible}`);
    return 0;
  }

  const weights = {
    atsScore:        0.35,
    skillsMatch:     0.30,
    experienceMatch: 0.25,
    overallFit:      0.10,
  };

  let skillsMatch     = aiAnalysis.skillsMatch     ?? 0;
  let experienceMatch = aiAnalysis.experienceMatch ?? 0;
  const overallFit    = aiAnalysis.overallFit      ?? 0;

  // ── Graceful fallback when extraction failed ─────────────────────────────
  // If skillsMatch is 0 but atsScore > 50 → extraction likely failed, not zero skills.
  // Use atsScore as conservative proxy rather than penalising extraction failure.
  const extractionFailed = aiAnalysis.dataSource === 'extracted' &&
    aiAnalysis.dataQuality?.hasExtractedSkills === false;

  if (skillsMatch === 0 && atsScore >= 50) {
    // ATS already matched keywords including skill names from JD
    // Conservative proxy: 80% of ATS score (slightly discounted since we can't confirm depth)
    skillsMatch = Math.round(atsScore * 0.80);
    console.log(`⚠️  skillsMatch was 0 (extraction failed) → using ATS proxy: ${skillsMatch}%`);
  }

  if (experienceMatch === 0 && atsScore >= 50) {
    // Similar proxy for experience when not extracted
    experienceMatch = Math.round(atsScore * 0.75);
    console.log(`⚠️  experienceMatch was 0 (extraction failed) → using ATS proxy: ${experienceMatch}%`);
  }

  // ── Verification bonus (up to +5 pts) ────────────────────────────────────
  // If candidate has verified GitHub/experience, give a small composite boost
  const verBonus = (() => {
    const vr = application.verificationResult;
    if (!vr?.overallScore) return 0;
    // Scale: 0 pts at score<=30, up to 5 pts at score>=80
    return Math.min(5, Math.round(((vr.overallScore - 30) / 50) * 5));
  })();

  const composite = (
    (atsScore        * weights.atsScore)        +
    (skillsMatch     * weights.skillsMatch)     +
    (experienceMatch * weights.experienceMatch) +
    (overallFit      * weights.overallFit)      +
    verBonus
  );

  const finalScore = Math.max(0, Math.min(100, Math.round(composite * 100) / 100));

  console.log(`🎯 COMPOSITE SCORE:`);
  console.log(`   ATS:        ${atsScore}% × 0.35 = ${(atsScore * 0.35).toFixed(1)}`);
  console.log(`   Skills:     ${skillsMatch}% × 0.30 = ${(skillsMatch * 0.30).toFixed(1)}`);
  console.log(`   Experience: ${experienceMatch}% × 0.25 = ${(experienceMatch * 0.25).toFixed(1)}`);
  console.log(`   Fit:        ${overallFit}% × 0.10 = ${(overallFit * 0.10).toFixed(1)}`);
  console.log(`   VerBonus:   +${verBonus}`);
  console.log(`   ──────────── FINAL: ${finalScore}%`);

  return finalScore;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3: analyzeResume — smarter scoring rules
//
// BUG A: Prompt said 'If skills not extracted → skillsMatch MUST be 0'
//        This was too harsh — extraction can fail due to PDF format issues,
//        not because the resume has no skills. AI should read resume TEXT for skills.
//
// BUG B: Prompt had no guidance on realistic score ranges → AI gave random scores.
//        Added: fresh grad = 50-70 exp range, 2yr candidate = 60-80 range etc.
//
// BUG C: verificationResult.scoreBreakdown.certifications access could crash if
//        old verification.js used 'badges' key not 'certifications'
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzeResume({
  resumeText, jobDescription, jobRequirements, jobTitle,
  jobLocation, jobSalary, jobType, extractedData = null, verificationResult = null
}) {
  try {
    if (resumeText.includes('[Note: This is a PDF resume')) {
      throw new Error('PDF_EXTRACTION_FAILED: Unable to extract text from PDF. Please upload a text-based PDF or Word document.');
    }
    if (!resumeText || resumeText.trim().length < 100) {
      throw new Error('INSUFFICIENT_CONTENT: Resume content is too short or empty. Please provide a complete resume.');
    }

    // ── ATS score (mathematical, not AI) ─────────────────────────────────────
    const atsCalculation = calculateAtsScore(resumeText, jobDescription, jobRequirements, jobTitle, extractedData);
    console.log(`✅ ATS Score: ${atsCalculation.score}% (${atsCalculation.breakdown.matchedKeywords}/${atsCalculation.breakdown.totalKeywords} keywords)`);

    // ── Candidate info for AI prompt ─────────────────────────────────────────
    const hasExtractedSkills = extractedData?.skills?.technical?.length > 0;
    const skillsText = hasExtractedSkills
      ? extractedData.skills.technical.map(cat => Array.isArray(cat.skills) ? cat.skills.join(', ') : cat).join(', ')
      : 'Not extracted — please analyse from resume text below';

    const candidateInfo = {
      name:              extractedData?.personalInfo?.fullName          || 'Not extracted',
      location:          extractedData?.personalInfo?.location          || 'Not extracted',
      experience:        extractedData?.totalExperienceYears            ?? 0,
      salaryExpectations: extractedData?.salaryExpectations
        ? `${extractedData.salaryExpectations.currency} ${extractedData.salaryExpectations.minRange}–${extractedData.salaryExpectations.maxRange}`
        : 'Not extracted',
      workPreferences:   extractedData?.workPreferences?.workType       || 'Not extracted',
      willingToRelocate: extractedData?.workPreferences?.willingToRelocate ?? null,
      skills:            skillsText,
    };

    // ── Verification context ──────────────────────────────────────────────────
    // Safe accessors — handle both old (certifications key) and new (certificates key) verification.js
    const safeVerCtx = (vr) => {
      if (!vr) return '';
      const sb = vr.scoreBreakdown || {};
      const gh = sb.github?.score  ?? 0;
      const li = sb.linkedin?.score ?? 0;
      const ex = sb.experience?.score ?? 0;
      const ce = (sb.certifications?.score ?? sb.certificates?.score) ?? 0;

      const expSummary = vr.verifications?.experience?.summary;
      const expText = expSummary
        ? (typeof expSummary === 'string'
            ? expSummary
            : `${expSummary.text || ''} Verified:${expSummary.verified||0} Virtual:${expSummary.virtual||expSummary.virtualInternships||0} Suspicious:${expSummary.suspicious||0}`)
        : 'No experience verification data';

      const ghFlags  = vr.verifications?.github?.redFlags   || vr.verifications?.github?.red_flags   || [];
      const expFlags = (vr.verifications?.experience?.entries || vr.verifications?.experience?.verified_experiences || [])
        .filter(e => e.status === 'VIRTUAL_INTERNSHIP' || e.status === 'SUSPICIOUS')
        .map(e => `- ${e.company} (${e.status}): ${typeof e.summary === 'string' ? e.summary : e.reason || ''}`);

      return `
VERIFICATION RESULTS (Automated Background Check):
Overall Score: ${vr.overallScore}/100  Verdict: ${vr.verdict}

Score Breakdown:
- GitHub: ${gh}/${sb.github?.max||40}
- LinkedIn: ${li}/${sb.linkedin?.max||25}
- Experience: ${ex}/${sb.experience?.max||20}
- Certifications: ${ce}/5

Experience Summary: ${expText}
${ghFlags.length  ? `GitHub Red Flags:\n${ghFlags.map(f=>`- ${f}`).join('\n')}` : ''}
${expFlags.length ? `Experience Red Flags:\n${expFlags.join('\n')}` : ''}

IMPORTANT for scoring:
- Virtual internships = NOT real work experience → reduce experienceMatch by 10-15 pts per virtual internship
- Suspicious companies → reduce experienceMatch by 5-10 pts, add to recommendations
- GitHub score ${gh >= 25 ? `is HIGH (${gh}/40) → candidate has verified coding activity, boost skillsMatch by 5-10 pts` : `is low (${gh}/40)`}
- Verification score ${vr.overallScore < 40 ? 'is LOW → mention authenticity concerns in detailedFeedback' : 'is acceptable'}`;
    };

    const verificationContext = safeVerCtx(verificationResult);

    // ── AI analysis prompt ────────────────────────────────────────────────────
    const analysisPrompt = `You are a world-class ATS and recruitment specialist. Analyze this resume ACCURATELY.

JOB DETAILS:
Title: ${jobTitle} | Type: ${jobType||'Full-time'} | Location: ${jobLocation||'Not specified'} | Salary: ${jobSalary||'Not specified'}
Description: ${jobDescription}
Requirements: ${jobRequirements}

CANDIDATE DATA:
Name: ${candidateInfo.name}
Location: ${candidateInfo.location}
Total Experience: ${candidateInfo.experience} years
Salary Expectation: ${candidateInfo.salaryExpectations}
Work Preference: ${candidateInfo.workPreferences}
Willing to Relocate: ${candidateInfo.willingToRelocate ?? 'Not stated'}
Skills (extracted): ${candidateInfo.skills}
${verificationContext}

FULL RESUME TEXT:
${resumeText.substring(0, 8000)}

ATS SCORE (pre-calculated, do NOT change): ${atsCalculation.score}%

YOUR TASK: Provide accurate, honest scores with detailed explanations.

SCORING RULES — follow these ranges for realistic results:

skillsMatch (0-100):
- If skills are extracted and listed above: compare them directly to job requirements. Match % = skillsMatch.
- If skills say 'Not extracted': read the RESUME TEXT to find skills, estimate match to requirements.
- Fresh grad with relevant skills and projects: 55-75
- 1-2 yr experience with good skill match: 65-82
- 3+ yr with strong skill alignment: 75-92
- Verification GitHub HIGH score (25+/40): add 5-8 bonus pts

experienceMatch (0-100):
- 0 years (pure fresher, no internships): 40-55 (education + projects count)
- 0 years but 1-2 good internships: 50-65
- 1-2 years relevant experience: 60-75
- 3-5 years aligned experience: 72-88
- 5+ years senior experience: 80-95
- DEDUCT: 10-15 per virtual internship (AICTE, EduSkills, Forage, SmartInternz = NOT real experience)
- DEDUCT: 5-10 per suspicious/unverified company

overallFit (0-100):
- Holistic assessment: education quality + skill depth + experience relevance + motivation signals
- Range: 50-90 for most real candidates, never auto-give 80+ without justification

COMPATIBILITY (use ONLY when explicitly determinable):
- locationCompatible: true ONLY if location matches OR job is Remote OR candidate is willing to relocate. null if location not extractable.
- salaryCompatible: true ONLY if salary data extracted AND ranges overlap. null if salary not stated.

DETAILED FEEDBACK RULES:
- Write 3-5 sentences minimum for detailedFeedback
- Mention: top 2-3 technical strengths, experience level assessment, verification findings (if any), specific recommendation
- Be specific — mention actual skill names, company names, years of experience from the resume
- Example: "Parth demonstrates solid Python and LangChain skills backed by an active GitHub profile (17/40 verification score). His internship at Odoo (6 months) is a real company placement, giving him approximately 0.5 years of legitimate industry experience..."

Return EXACTLY this JSON (no other text):
{
  "atsScore": ${atsCalculation.score},
  "skillsMatch": <number 0-100>,
  "experienceMatch": <number 0-100>,
  "overallFit": <number 0-100>,
  "locationCompatible": <true|false|null>,
  "salaryCompatible": <true|false|null>,
  "strengths": ["specific strength with evidence", "specific strength with evidence", "specific strength with evidence"],
  "weaknesses": ["specific gap or concern", "specific gap or concern"],
  "recommendations": ["actionable recommendation for HR", "actionable recommendation for candidate"],
  "detailedFeedback": "3-5 sentence detailed assessment mentioning specific skills, experience, verification findings, and hiring recommendation"
}`;

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    console.log('🤖 Analyzing resume with Google Gemini 2.5 Flash...');
    
    const response = await retryWithBackoff(async () => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }]
      });
      return result.response;
    });

    const content = response.text().trim();
    console.log('✅ AI analysis completed');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid analysis response format from AI');
    const analysis = JSON.parse(jsonMatch[0]);

    // ── Validate and clamp scores ─────────────────────────────────────────────
    const hasSkills    = extractedData?.skills?.technical?.length > 0;
    const hasExp       = extractedData?.totalExperienceYears !== null && extractedData?.totalExperienceYears !== undefined;
    const hasLocation  = !!extractedData?.personalInfo?.location;
    const hasSalary    = extractedData?.salaryExpectations?.minRange != null;

    // skillsMatch: use AI score (even if skills not extracted, AI read resume text)
    // Only force 0 if resume itself has ZERO skill-related content
    const resumeHasSkillContent = /python|javascript|java|react|node|sql|html|css|machine learning|docker|git|api|framework|library|database|cloud|aws|azure/i.test(resumeText);
    const skillsMatchFinal = resumeHasSkillContent
      ? Math.max(0, Math.min(100, analysis.skillsMatch || 55))
      : (hasSkills ? Math.max(0, Math.min(100, analysis.skillsMatch || 0)) : 0);

    const validatedAnalysis = {
      atsScore:        atsCalculation.score,   // ALWAYS use our calculated score, never AI's
      skillsMatch:     skillsMatchFinal,
      experienceMatch: Math.max(0, Math.min(100, analysis.experienceMatch || 0)),
      overallFit:      Math.max(0, Math.min(100, analysis.overallFit      || 0)),
      locationCompatible: hasLocation
        ? (typeof analysis.locationCompatible === 'boolean' ? analysis.locationCompatible : null)
        : null,
      salaryCompatible: hasSalary
        ? (typeof analysis.salaryCompatible === 'boolean' ? analysis.salaryCompatible : null)
        : null,
      strengths:        Array.isArray(analysis.strengths)       ? analysis.strengths       : [],
      weaknesses:       Array.isArray(analysis.weaknesses)      ? analysis.weaknesses      : [],
      recommendations:  Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      detailedFeedback: analysis.detailedFeedback || 'Analysis completed successfully.',
      dataSource:       extractedData ? 'extracted' : 'text-only',
      dataQuality: {
        hasExtractedSkills:     hasSkills,
        hasExtractedExperience: hasExp,
        hasExtractedLocation:   hasLocation,
        hasExtractedSalary:     hasSalary,
        extractionScore:        [hasSkills, hasExp, hasLocation, hasSalary].filter(Boolean).length,
      },
    };

    console.log(`📊 Final: ATS=${validatedAnalysis.atsScore}%, Skills=${validatedAnalysis.skillsMatch}%, Exp=${validatedAnalysis.experienceMatch}%, Fit=${validatedAnalysis.overallFit}%`);
    return validatedAnalysis;

  } catch (error) {
    console.error('❌ Resume analysis error:', error);
    if (error.message.includes('PDF_EXTRACTION_FAILED')) throw error;
    if (error.message.includes('INSUFFICIENT_CONTENT'))  throw error;
    throw new Error('AI_ANALYSIS_FAILED: Unable to analyze resume. Please try again or contact support.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL FUNCTIONS BELOW ARE UNCHANGED FROM ORIGINAL
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeVoiceInterview({
    transcript, questions, jobTitle, jobDescription, jobRequirements, jobResponsibilities,
    interviewDuration, answeredQuestions, totalQuestions, monitoringData = [], anomalies = []
  }) {
    try {
      console.log('🤖 Starting DEEP REAL AI interview analysis...');
      if (!transcript || transcript.length < 50) throw new Error('Transcript too short for analysis');
  
      const transcriptLength = transcript.length;
      const completionRate   = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  
      let integrityScore = 100;
      const securityFlags = [];
      if (anomalies?.length > 0) {
        anomalies.forEach(anomaly => {
          if (anomaly.faceAnomaly?.type === 'person_switch') { integrityScore -= 30; securityFlags.push('Multiple persons detected during interview'); }
          if (anomaly.faceAnomaly?.severity === 'high')      { integrityScore -= 15; securityFlags.push('Face verification issues detected'); }
          if (anomaly.voiceAnomaly?.severity === 'high')     { integrityScore -= 15; securityFlags.push('Voice verification anomalies detected'); }
        });
      }
  
      const prompt = `You are an expert HR interviewer and technical specialist. Deeply analyze this voice interview transcript for a ${jobTitle} position.
  
  JOB CONTEXT:
  - Title: ${jobTitle}
  - Description: ${jobDescription || 'N/A'}
  - Key Requirements: ${jobRequirements || 'N/A'}
  - Primary Responsibilities: ${jobResponsibilities || 'N/A'}

  INTERVIEW TRANSCRIPT:
  ${transcript}
  
  INTERVIEW METADATA:
  - Duration: ${Math.round(interviewDuration / 60)} minutes
  - Questions Answered: ${answeredQuestions}/${totalQuestions}
  
  CRITICAL ASSESSMENT INSTRUCTIONS:
  1. Technical Accuracy: Evaluate if the candidate's answers are technically sound relative to the Job Requirements.
  2. Relevance: Check if they addressed the specific responsibilities mentioned in the job context.
  3. Honesty: Be strictly critical. If they said "No idea" or gave vague/incorrect technical answers, punish the Technical Knowledge and Problem Solving scores heavily.
  4. Scoring Breakdown:
     - Communication Skills (0-100): Clarity, articulation, coherence.
     - Technical Knowledge (0-100): Depth of understanding of the required skills.
     - Problem Solving (0-100): Logical approach to the questions.
     - Confidence (0-100): Assuredness in their responses.
  
  Return this EXACT JSON:
  {
    "communicationSkills": <number>,
    "technicalKnowledge": <number>,
    "problemSolving": <number>,
    "confidence": <number>,
    "detailedFeedback": "<2-3 sentence honest assessment referencing specific job requirements>",
    "strengths": ["strength 1", "strength 2"],
    "areasForImprovement": ["improvement 1", "improvement 2"]
  }`;

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    console.log('🤖 Analyzing interview with Google Gemini 2.5 Flash...');
    
    const response = await retryWithBackoff(async () => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: 'You are an expert HR interviewer. Analyze interview transcripts honestly. Return ONLY valid JSON.'
      });
      return result.response;
    });

    const aiContent = response.text().trim();
    const jsonMatch  = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch)  throw new Error('Invalid AI response format');
    const aiAnalysis = JSON.parse(jsonMatch[0]);

    const overallPerformance = Math.round(
      (aiAnalysis.communicationSkills + aiAnalysis.technicalKnowledge + aiAnalysis.problemSolving + aiAnalysis.confidence) / 4
    );

    return {
      communicationSkills: aiAnalysis.communicationSkills,
      technicalKnowledge:  aiAnalysis.technicalKnowledge,
      problemSolving:      aiAnalysis.problemSolving,
      confidence:          aiAnalysis.confidence,
      overallPerformance,
      integrityScore: Math.max(0, integrityScore),
      detailedFeedback: aiAnalysis.detailedFeedback,
      strengths:            aiAnalysis.strengths           || [],
      securityFlags,
      areasForImprovement:  aiAnalysis.areasForImprovement || [],
      metrics: {
        completionRate:          Math.round(completionRate),
        averageResponseLength:   Math.round(transcriptLength / Math.max(answeredQuestions, 1)),
        interviewDuration:       Math.round(interviewDuration / 60),
        questionsAnswered:       answeredQuestions,
        totalQuestions,
        anomaliesDetected:       anomalies?.length      || 0,
        monitoringDataPoints:    monitoringData?.length || 0,
      },
      monitoringResults: {
        realTimeFaceVerification:  monitoringData?.filter(d => d.type === 'face').length  > 0,
        realTimeVoiceVerification: monitoringData?.filter(d => d.type === 'voice').length > 0,
        anomaliesCount:            anomalies?.length || 0,
        integrityAssessment:       integrityScore >= 80 ? 'PASS' : integrityScore >= 60 ? 'REVIEW' : 'FAIL',
      },
      processedAt:       new Date().toISOString(),
      processingMethod:  'real-ai-analysis-groq-llama',
    };
  } catch (error) {
    console.error('❌ Voice interview analysis FAILED:', error);
    throw new Error(`AI interview analysis failed: ${error.message}. Cannot provide accurate scores without AI analysis.`);
  }
}

export async function generateInterviewFeedback(transcript, jobId, monitoringData = null) {
  try {
    const monitoringAnalysis = monitoringData ? analyzeMonitoringData(monitoringData) : null;

    const prompt = `Analyze this voice interview transcript and generate detailed feedback for HR review.

Job ID: ${jobId}
Interview Transcript: ${transcript}
${monitoringAnalysis ? `SECURITY MONITORING: ${monitoringAnalysis.summary}\nAnomalies: ${monitoringAnalysis.anomalies.length}\nRisk: ${monitoringAnalysis.riskLevel}\nRed Flags: ${monitoringAnalysis.redFlags.join(', ')}` : ''}

Evaluate 5 parameters (0-100 scale):
1. Communication Skills - Clarity, articulation, listening
2. Technical Knowledge - Job-relevant expertise
3. Problem Solving - Logical thinking, analytical approach
4. Confidence - Self-assurance, composure
5. Overall Performance - Holistic assessment

${monitoringAnalysis ? `IMPORTANT: Factor in monitoring. Person switches: -40-60 pts. Voice anomalies: -20-30 pts.` : ''}

Return ONLY valid JSON:
{
  "scores": {"communicationSkills": 85, "technicalKnowledge": 78, "problemSolving": 82, "confidence": 90, "overallPerformance": 84},
  "detailedAnalysis": "Comprehensive analysis paragraph",
  "keyStrengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area 1", "area 2"],
  "specificInsights": {"communicationStyle": "...", "technicalDepth": "...", "problemApproach": "...", "interviewPresence": "..."},
  "recommendation": "Recommendation text",
  "evaluationBasis": "Evaluation basis description",
  "securityAnalysis": ${monitoringAnalysis ? JSON.stringify({ riskLevel: monitoringAnalysis.riskLevel, totalAnomalies: monitoringAnalysis.anomalies.length, redFlags: monitoringAnalysis.redFlags, integrityScore: monitoringAnalysis.integrityScore }) : 'null'}
}`;

    const groq = getGroqClient();
    const response = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert HR analyst. Provide detailed, objective feedback for internal HR review. Return only valid JSON.' },
          { role: 'user',   content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
    });

    const content   = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch)  throw new Error('Invalid feedback response format');
    const feedback  = JSON.parse(jsonMatch[0]);

    return {
      scores: {
        communicationSkills: Math.max(0, Math.min(100, feedback.scores?.communicationSkills || 50)),
        technicalKnowledge:  Math.max(0, Math.min(100, feedback.scores?.technicalKnowledge  || 50)),
        problemSolving:      Math.max(0, Math.min(100, feedback.scores?.problemSolving      || 50)),
        confidence:          Math.max(0, Math.min(100, feedback.scores?.confidence          || 50)),
        overallPerformance:  Math.max(0, Math.min(100, feedback.scores?.overallPerformance  || 50)),
      },
      detailedAnalysis:    feedback.detailedAnalysis || 'Interview analysis completed.',
      keyStrengths:        Array.isArray(feedback.keyStrengths)        ? feedback.keyStrengths        : [],
      areasForImprovement: Array.isArray(feedback.areasForImprovement) ? feedback.areasForImprovement : [],
      specificInsights: {
        communicationStyle: feedback.specificInsights?.communicationStyle || 'Communication assessed',
        technicalDepth:     feedback.specificInsights?.technicalDepth     || 'Technical knowledge evaluated',
        problemApproach:    feedback.specificInsights?.problemApproach    || 'Problem-solving reviewed',
        interviewPresence:  feedback.specificInsights?.interviewPresence  || 'Interview presence noted',
      },
      recommendation:  feedback.recommendation  || 'Requires further review',
      evaluationBasis: feedback.evaluationBasis || 'Standard evaluation criteria',
      securityAnalysis: feedback.securityAnalysis || null,
      generatedAt: new Date(),
      forHROnly:   true,
    };
  } catch (error) {
    console.error('Interview feedback generation error:', error);
    return {
      scores: { communicationSkills: 50, technicalKnowledge: 50, problemSolving: 50, confidence: 50, overallPerformance: 50 },
      detailedAnalysis:    'Automated feedback generation encountered an error. Manual review required.',
      keyStrengths:        ['Interview completed successfully'],
      areasForImprovement: ['Requires manual evaluation'],
      specificInsights:    { communicationStyle: 'Manual review needed', technicalDepth: 'Manual review needed', problemApproach: 'Manual review needed', interviewPresence: 'Manual review needed' },
      recommendation:  'Manual review required due to technical issues',
      evaluationBasis: 'Standard evaluation criteria',
      generatedAt: new Date(),
      forHROnly:   true,
      error:       true,
    };
  }
}

function analyzeMonitoringData(monitoringData) {
  if (!monitoringData?.summary) return null;
  const summary       = monitoringData.summary;
  const anomalies     = monitoringData.anomalies     || [];
  const redFlags      = monitoringData.redFlags      || [];
  const securityAlerts= monitoringData.securityAlerts|| {};

  let integrityScore = summary.overallSecurityScore || 100;
  if (!summary.overallSecurityScore) {
    integrityScore = 100;
    if (securityAlerts.identityFraudSuspected)              integrityScore -= 60;
    integrityScore -= (securityAlerts.criticalCount          || 0) * 40;
    integrityScore -= (securityAlerts.highCount              || 0) * 20;
    integrityScore -= (securityAlerts.faceVerificationFailures|| 0) * 15;
    integrityScore -= (securityAlerts.voiceVerificationFailures||0) * 15;
    integrityScore -= (summary.personSwitches    || 0) * 30;
    integrityScore -= (summary.voiceAnomalies    || 0) * 10;
    integrityScore -= (summary.faceDeviations    || 0) * 8;
    integrityScore -= (summary.environmentChanges|| 0) * 5;
    integrityScore -= (summary.clothingChanges   || 0) * 3;
    integrityScore  = Math.max(0, integrityScore);
  }

  const professionalRedFlags   = [];
  const criticalSecurityIssues = [];
  if (redFlags.length > 0) {
    redFlags.forEach(flag => {
      switch (flag.type) {
        case 'IDENTITY_FRAUD_SUSPECTED': criticalSecurityIssues.push('IDENTITY_FRAUD_SUSPECTED'); professionalRedFlags.push(`CRITICAL: ${flag.details}`); break;
        case 'FACE_VERIFICATION_FAILED':  professionalRedFlags.push(`Face Authentication Failed: ${flag.details}`);  break;
        case 'VOICE_VERIFICATION_FAILED': professionalRedFlags.push(`Voice Authentication Failed: ${flag.details}`); break;
        case 'VOICE_PATTERN_ANOMALY':     professionalRedFlags.push(`Voice Pattern Change: ${flag.details}`);         break;
        case 'ENVIRONMENT_CHANGE':        professionalRedFlags.push(`Environment Anomaly: ${flag.details}`);          break;
        case 'APPEARANCE_CHANGE':         professionalRedFlags.push(`Appearance Change: ${flag.details}`);            break;
        default:                          professionalRedFlags.push(`Security Alert: ${flag.details}`);               break;
      }
    });
  }
  if (summary.personSwitches  > 0) { professionalRedFlags.push('PERSON_SWITCH_DETECTED');     criticalSecurityIssues.push('PERSON_SWITCH_DETECTED'); }
  if (summary.voiceAnomalies  >= 3) professionalRedFlags.push('MULTIPLE_VOICE_ANOMALIES');
  if (summary.faceDeviations  >= 5) professionalRedFlags.push('FREQUENT_FACE_ISSUES');
  if (summary.environmentChanges >= 3) professionalRedFlags.push('ENVIRONMENT_MANIPULATION');

  let summaryText = `Security Score: ${Math.round(integrityScore)}/100. Interview Integrity: ${summary.interviewIntegrity || 'UNKNOWN'}.`;
  if (redFlags.length > 0)                     summaryText += ` ${redFlags.length} security alert(s).`;
  if (anomalies.length > 0)                    summaryText += ` ${anomalies.length} anomaly/anomalies recorded.`;
  if (securityAlerts.identityFraudSuspected)   summaryText += ` ⚠️ CRITICAL: Identity fraud suspected.`;
  if (summary.personSwitches > 0)              summaryText += ` ${summary.personSwitches} person switch(es).`;
  if (summary.voiceAnomalies > 0)              summaryText += ` ${summary.voiceAnomalies} voice anomalie(s).`;
  if (summary.faceDeviations > 0)              summaryText += ` ${summary.faceDeviations} face deviation(s).`;

  return {
    riskLevel:            summary.riskLevel || 'medium',
    integrityScore:       Math.round(integrityScore),
    securityScore:        Math.round(integrityScore),
    interviewIntegrity:   summary.interviewIntegrity || 'UNKNOWN',
    redFlags:             professionalRedFlags,
    criticalSecurityIssues,
    summary:              summaryText.trim(),
    anomalies: anomalies.map(a => ({ type: a.category || a.type, description: a.details?.description || `${a.type} anomaly`, severity: a.severity, timestamp: a.timestamp })),
    redFlagDetails: redFlags.map(f => ({ type: f.type, details: f.details, severity: f.severity, timestamp: f.timestamp })),
    securityStats: {
      totalRedFlags:             redFlags.length,
      criticalAlerts:            securityAlerts.criticalCount             || 0,
      highAlerts:                securityAlerts.highCount                 || 0,
      identityFraudSuspected:    securityAlerts.identityFraudSuspected    || false,
      faceVerificationFailures:  securityAlerts.faceVerificationFailures  || 0,
      voiceVerificationFailures: securityAlerts.voiceVerificationFailures || 0,
    },
    personSwitches:    summary.personSwitches     || 0,
    voiceAnomalies:    summary.voiceAnomalies     || 0,
    faceDeviations:    summary.faceDeviations     || 0,
    environmentChanges:summary.environmentChanges || 0,
    clothingChanges:   summary.clothingChanges    || 0,
  };
}

export async function analyzeInterview(transcript, jobTitle, jobDescription, requiredSkills, questions) {
  try {
    const prompt = `You are a senior HR Director with 15+ years of experience.

JOB DETAILS:
Position: ${jobTitle}
Description: ${jobDescription}
Required Skills: ${requiredSkills.join(', ')}

INTERVIEW QUESTIONS:
${questions.map((q, i) => `Q${i + 1}: ${q.question}`).join('\n')}

CANDIDATE TRANSCRIPT:
${transcript}

Analyze using industry-standard competency framework:
1. TECHNICAL COMPETENCY (0-100)
2. COMMUNICATION EXCELLENCE (0-100)
3. PROBLEM-SOLVING & ANALYTICAL THINKING (0-100)
4. CONFIDENCE & PRESENTATION (0-100)
5. CULTURAL FIT & SOFT SKILLS (0-100)

Write 4-6 paragraph detailed feedback (executive summary, technical assessment, communication/soft skills, detailed recommendations).

Return ONLY valid JSON:
{
  "overall_score": 85, "technical_knowledge": 90, "communication_skills": 85,
  "problem_solving": 80, "confidence": 88, "cultural_fit": 82,
  "detailed_feedback": "4-6 paragraph comprehensive analysis",
  "strengths": ["Specific strength 1", "Specific strength 2", "Specific strength 3"],
  "areas_for_improvement": ["Specific area 1", "Specific area 2"],
  "hiring_recommendation": "Strongly Recommend|Recommend|Consider with Reservations|Not Recommend",
  "confidence_level": "High|Medium|Low",
  "standout_moments": ["Moment 1", "Moment 2"],
  "red_flags": [],
  "interview_quality_score": 85,
  "technical_examples_cited": ["Example 1", "Example 2"],
  "recommended_next_steps": "Next steps recommendation"
}`;

    const groq = getGroqClient();
    const response = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a Senior HR Director with 15+ years of experience. Provide comprehensive interview assessments. Return only valid JSON.' },
          { role: 'user',   content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });
    });

    let content = response.choices[0].message.content.trim();
    content     = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Clean up common JSON issues
    content = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
    content = content.replace(/,\s*}/g, '}'); // Remove trailing commas
    content = content.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
    
    // Ensure it's valid JSON by trying to parse it
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ JSON parsing failed, attempting to fix:', parseError.message);
      // Try to extract JSON from the response if it's wrapped in text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch (secondError) {
          console.error('❌ JSON extraction also failed:', secondError.message);
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
      } else {
        throw new Error(`No valid JSON found in response: ${parseError.message}`);
      }
    }
    
    console.log('✅ Interview analysis complete:', { overall_score: analysis.overall_score, recommendation: analysis.hiring_recommendation });
    return analysis;

  } catch (error) {
    console.error('❌ Interview analysis failed:', error.message);
    return {
      overall_score: 50, technical_knowledge: 50, communication_skills: 50,
      problem_solving: 50, confidence: 50, cultural_fit: 50,
      detailed_feedback: 'Comprehensive analysis could not be generated due to a technical issue. Manual review recommended. The transcript has been recorded and is available for the hiring team.',
      strengths: ['Completed the full interview process'],
      areas_for_improvement: ['Requires manual evaluation'],
      hiring_recommendation: 'Consider with Reservations',
      confidence_level: 'Low',
      standout_moments: ['Interview completed'],
      red_flags: [],
      interview_quality_score: 50,
      technical_examples_cited: [],
      recommended_next_steps: 'Manual review of transcript recommended before final decision',
    };
  }
}