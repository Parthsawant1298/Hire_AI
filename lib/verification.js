// lib/verification.js - Resume Verification Service with Groq (vLLM Optimized)
import Groq from 'groq-sdk';

// ============================================================================
// CONSTANTS
// ============================================================================

// NO HARDCODED LISTS - AI analyzes everything dynamically
// System can verify ANY certification, badge, or company from ANY platform

// Helper to create Groq client (faster than Gemini, better rate limits)
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured. Please add it to .env.local file.');
  }
  return new Groq({ apiKey });
}

// Retry helper
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Generate AI content using Groq (vLLM optimized - 2-3x faster than Gemini)
async function generateAIContent(prompt, jsonMode = true) {
  try {
    const groq = getGroqClient();

    const response = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert verification AI. Analyze information accurately and return valid JSON responses only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: jsonMode ? { type: 'json_object' } : undefined
      });
    }, 3, 1000); // 3 retries with Groq's better rate limits

    const content = response.choices[0].message.content.trim();

    if (jsonMode) {
      try {
        // Groq with JSON mode returns clean JSON, but still validate
        let jsonString = content.trim();
        
        // Remove any markdown if present (shouldn't be with json_object mode)
        if (jsonString.includes('```json')) {
          jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonString.includes('```')) {
          jsonString = jsonString.replace(/```\n?/g, '');
        }

        return JSON.parse(jsonString);
      } catch (e) {
        console.error('JSON Parse Error in Groq response:', e);
        console.error('Raw content:', content);
        return null;
      }
    }

    return content;
  } catch (error) {
    console.warn('Groq AI generation failed:', error.message);
    return null;
  }
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

async function verifyGitHub(githubUrl, candidateName, role) {
  if (!githubUrl) {
    return {
      status: "SKIPPED",
      score: 0,
      max_score: 35,
      findings: [],
      red_flags: [],
      reason: "No GitHub URL found or provided",
      details: null
    };
  }

  console.log(`🔍 Verifying GitHub: ${githubUrl}`);

  // Since we cannot scrape GitHub easily without authentication/API limiting on the server,
  // we will simulate the verification using Gemini's knowledge if it's a very famous profile,
  // OR we rely on the fact that the URL exists.
  // Ideally, we would fetch the GitHub API here.
  // For this environment, we will assume if it's a valid public URL we give partial score,
  // and ask Gemini to evaluate the "likelihood" of authenticity based on URL structure?
  // NO, `all.py` calls `fetch_github_data`.
  // Here we will try to fetch publicly observable data if possible, or just simulate for now 
  // until we have a proper GitHub utility.
  // Wait, `all.py` has `fetch_github_data` which uses `httpx`. We can use `fetch`.

  let githubData = null;
  try {
    // Extract username
    const username = githubUrl.split('github.com/')[1]?.split('/')[0];
    if (username) {
      const apiResponse = await fetch(`https://api.github.com/users/${username}`, {
        headers: { 'User-Agent': 'HireAI-Verifier' }
      });
      if (apiResponse.ok) {
        githubData = await apiResponse.json();
        // Fetch repos to check language stats
        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`, {
          headers: { 'User-Agent': 'HireAI-Verifier' }
        });
        if (reposResponse.ok) {
          githubData.repos = await reposResponse.json();
        }
      }
    }
  } catch (e) {
    console.log('GitHub fetch failed:', e.message);
  }

  if (!githubData) {
    // Fallback: Just Valid URL
    return {
      status: "PARTIALLY_VERIFIED",
      score: 10, // Minimal score for just having a link
      max_score: 35,
      findings: ["GitHub profile link present but could not fetch API details"],
      red_flags: [],
      reason: "API access failed",
      details: null
    };
  }

  // Use Gemini to score based on fetched data
  const prompt = `
  Verify this GitHub profile for a ${role} role.
  Candidate: ${candidateName}
  Profile Data: ${JSON.stringify({
    login: githubData.login,
    public_repos: githubData.public_repos,
    followers: githubData.followers,
    created_at: githubData.created_at,
    repos: githubData.repos?.map(r => ({ name: r.name, language: r.language, stars: r.stargazers_count }))
  })}
  
  Rules:
  - Check for activity, real projects, reasonable follower/following ratio.
  - Score out of 35. 
  - <10: Empty/New profile
  - 10-20: Basic profile, school projects
  - 20-30: Good open source or solid personal projects
  - 30-35: Exceptional (popular repos, high activity)
  
  Return in JSON: { "score": number, "findings": string[], "red_flags": string[] }
  `;

  const analysis = await generateAIContent(prompt) || { score: 15, findings: ["Profile exists"], red_flags: [] };

  return {
    status: "VERIFIED",
    score: Math.min(analysis.score, 35),
    max_score: 35,
    findings: analysis.findings,
    red_flags: analysis.red_flags,
    details: { username: githubData.login, repos: githubData.public_repos }
  };
}

async function verifyLinkedIn(linkedinUrl, candidateName, experienceData) {
  if (!linkedinUrl) {
    return {
      status: "SKIPPED",
      score: 0,
      max_score: 25,
      findings: [],
      red_flags: [],
      reason: "No LinkedIn URL found",
      details: null
    };
  }

  // We can't scrape LinkedIn easily. We rely on AI analysis of consistency with resume data
  // plus the existence of the URL.

  const prompt = `
  Analyze the consistency of this candidate's LinkedIn claim.
  Candidate: ${candidateName}
  LinkedIn URL: ${linkedinUrl}
  Resume Experience: ${JSON.stringify(experienceData).substring(0, 1000)}
  
  Does the URL look legitimate for this person?
  Return JSON: { "score": number (0-25), "findings": string[], "red_flags": string[] }
  Score 25 if it looks valid and professional.
  `;

  const analysis = await generateAIContent(prompt) || { score: 20, findings: ["URL valid format"], red_flags: [] };

  return {
    status: "PARTIALLY_VERIFIED", // Can't fully verify without login
    score: Math.min(analysis.score, 25),
    max_score: 25,
    findings: analysis.findings,
    red_flags: analysis.red_flags,
    reason: "URL analysis only (No scraping)",
    details: { url: linkedinUrl }
  };
}

// Web Search Utility (Google Serper API)
async function searchWeb(query) {
  try {
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    
    if (!SERPER_API_KEY) {
      console.warn('⚠️ SERPER_API_KEY not found, skipping web search');
      return { success: false, links: [], has_results: false };
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: 5
      })
    });

    if (!response.ok) {
      console.warn(`Serper API error: ${response.status}`);
      return { success: false, links: [], has_results: false };
    }

    const data = await response.json();
    const links = [];

    // Extract links from organic results
    if (data.organic && Array.isArray(data.organic)) {
      for (const result of data.organic) {
        if (result.link) {
          links.push(result.link);
        }
      }
    }

    // Also check knowledge graph for company info
    const hasKnowledgeGraph = data.knowledgeGraph && Object.keys(data.knowledgeGraph).length > 0;
    const hasResults = links.length > 0 || hasKnowledgeGraph;

    return { 
      success: true, 
      links: links.slice(0, 5),
      has_results: hasResults
    };

  } catch (error) {
    console.error('Web search failed:', error.message);
    return { success: false, links: [], has_results: false };
  }
}

async function verifyExperience(experienceData) {
  if (!experienceData || experienceData.length === 0) {
    return {
      status: "SKIPPED",
      verified_experiences: [],
      summary: { total: 0, verified: 0, virtual: 0, suspicious: 0, unverified: 0 }
    };
  }

  const verifiedExperiences = [];

  for (const exp of experienceData) {
    const company = exp.company || "Unknown";
    const role = exp.jobTitle || exp.role || "Unknown";
    const duration = exp.duration || "";

    // 0. Check for future dates FIRST (Critical Red Flag)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 0-based month

    let hasFutureDates = false;
    if (exp.startDate || exp.endDate) {
      const checkDate = (dateStr) => {
        if (!dateStr) return false;
        // Handle various date formats: 2025-01, Jan 2025, January 2025, 2025, etc.
        const year = parseInt(dateStr.match(/20\d{2}/)?.[0]);
        const monthMatch = dateStr.match(/(\d{1,2})[-\/]20\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i);
        let month = currentMonth;

        if (monthMatch) {
          const monthStr = monthMatch[0];
          if (/^\d+$/.test(monthStr)) {
            month = parseInt(monthStr);
          } else {
            // Parse month names
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            month = monthNames.findIndex(m => monthStr.toLowerCase().includes(m)) + 1;
          }
        }

        return year && (year > currentYear || (year === currentYear && month > currentMonth));
      };

      hasFutureDates = checkDate(exp.startDate) || checkDate(exp.endDate);
    }

    // Also check duration string for future years and month patterns
    if (!hasFutureDates && duration) {
      const futureYearInDuration = duration.match(/20(2[5-9]|[3-9]\d)/); // 2025 onwards
      hasFutureDates = !!futureYearInDuration;
    }

    // Check the raw company/role/duration text for common future patterns
    const allText = `${company} ${role} ${duration} ${exp.startDate || ''} ${exp.endDate || ''}`.toLowerCase();
    if (!hasFutureDates) {
      const futurePatterns = [
        /dec\s*2025|december\s*2025/,
        /jan\s*2026|january\s*2026/,
        /feb\s*2026|february\s*2026/,
        /202[5-9]|20[3-9]\d/,  // 2025 and beyond
        /2025.*2026|2026.*2027/  // Ranges with future years
      ];
      hasFutureDates = futurePatterns.some(pattern => pattern.test(allText));
    }

    if (hasFutureDates) {
      verifiedExperiences.push({
        company, role, duration,
        status: "SUSPICIOUS",
        experienceType: "future_dates",
        reason: "Contains impossible future dates - major red flag",
        confidence: "high",
        sources: ["Date validation failed"],
        shouldCountAsExperience: false,
        experienceWeight: 0,
        redFlag: "FUTURE_DATES"
      });
      continue;
    }

    // 1. AI-Powered Experience Type Detection (100% Dynamic - NO hardcoded keywords)
    console.log(`🤖 AI analyzing experience: ${company} - ${role}...`);
    
    const experienceTypePrompt = `Analyze this employment entry and classify its type:

Company: ${company}
Role: ${role}
Duration: ${duration}

Classify this experience into ONE of these categories:
1. VIRTUAL_INTERNSHIP - Online educational/simulation programs (AICTE, EduSkills, Forage, SmartInternz, Coursera projects, edX capstones, etc.)
2. REAL_INTERNSHIP - Actual internship at a real company (can be remote/onsite, but NOT educational simulation)
3. FULL_TIME - Full-time employment, part-time job, freelance, contract work
4. UNKNOWN - Cannot determine from available information

Consider:
- Virtual internships are educational programs that simulate work (NOT real employment)
- Real internships are actual positions at companies (even if unpaid/short-term)
- Full-time includes permanent roles, contract work, freelancing, part-time jobs

Return JSON: { 
  "type": "VIRTUAL_INTERNSHIP|REAL_INTERNSHIP|FULL_TIME|UNKNOWN",
  "confidence": "high|medium|low",
  "reason": "detailed explanation why you classified it this way"
}`;

    const experienceType = await generateAIContent(experienceTypePrompt);
    
    // Handle VIRTUAL INTERNSHIPS (Educational programs, not real work)
    if (experienceType?.type === "VIRTUAL_INTERNSHIP") {
      verifiedExperiences.push({
        company, role, duration,
        status: "VIRTUAL_INTERNSHIP",
        experienceType: "virtual_internship",
        reason: experienceType.reason || "AI detected virtual/simulated internship program",
        confidence: experienceType.confidence || "high",
        sources: ["Virtual internships are educational programs, not employment"],
        shouldCountAsExperience: false // Don't count as real work experience
      });
      continue;
    }

    // Handle REAL INTERNSHIPS (Actual internships at companies)
    if (experienceType?.type === "REAL_INTERNSHIP") {
      console.log(`📋 Detected real internship at: ${company}`);
      // Continue to company verification for real internships
      // (We'll verify the company exists, then mark as INTERNSHIP)
    }

    // 2. Multi-Level Dynamic Verification (Web Search + AI Analysis)
    // NO HARDCODED COMPANY NAMES - verifies ANY company from ANY country/industry
    
    console.log(`🔍 Searching web for company: ${company}...`);
    const searchRes = await searchWeb(`${company} company`);
    let status = "UNVERIFIED";
    let reason = "Could not verify public presence";
    let sources = [];

    if (searchRes.has_results) {
      // Web presence found - Ask AI to verify legitimacy
      const verifyPrompt = `Company found in search results: ${company}

Search results: ${searchRes.links.slice(0, 3).join(', ')}

Is this a legitimate, real company or a suspicious/fake entity? Consider:
- Does it have professional web presence?
- Is it a known company in any industry?
- Could it be a fake/scam company?

Return JSON: { "isLegitimate": true/false, "reason": "explanation", "companyType": "startup/enterprise/consulting/etc" }`;
      
      const aiVerify = await generateAIContent(verifyPrompt);
      
      if (aiVerify?.isLegitimate) {
        status = "VERIFIED";
        reason = `${aiVerify.reason} (${aiVerify.companyType || 'company'})`;
        sources = searchRes.links;
      } else {
        status = "SUSPICIOUS";
        reason = aiVerify?.reason || "AI flagged potential issues with company";
        sources = searchRes.links;
      }
    } else {
      // No web results - Ask AI if it's a known company
      const knownPrompt = `Is "${company}" a known company in any industry worldwide? Even if it's:
- A startup
- A small business
- A regional company
- A consulting firm
- A non-tech company

Return JSON: { "isKnown": true/false, "reason": "explanation", "industry": "industry if known" }`;
      
      const aiKnown = await generateAIContent(knownPrompt);
      
      if (aiKnown?.isKnown) {
        status = "PARTIALLY_VERIFIED";
        reason = `${aiKnown.reason} (${aiKnown.industry || 'industry unknown'})`;
        sources = ["AI knowledge base"];
      } else {
        status = "SUSPICIOUS";
        reason = "No online presence found and not recognized by AI";
        sources = [];
      }
    }

    // Add experience type classification to the result
    const finalStatus = experienceType?.type === "REAL_INTERNSHIP" 
      ? (status === "VERIFIED" || status === "PARTIALLY_VERIFIED" ? "REAL_INTERNSHIP" : status)
      : status;

    verifiedExperiences.push({
      company, role, duration,
      status: finalStatus,
      experienceType: experienceType?.type === "REAL_INTERNSHIP" ? "real_internship" : "full_time",
      reason: reason,
      sources: sources,
      confidence: experienceType?.confidence || "medium",
      shouldCountAsExperience: true, // Both real internships and full-time count as experience
      experienceWeight: experienceType?.type === "REAL_INTERNSHIP" ? 0.6 : 1.0 // Internships weighted at 60%
    });
  }

  // Enhanced summary with ALL experience types
  const verifiedCount = verifiedExperiences.filter(e => e.status === 'VERIFIED').length;
  const realInternshipCount = verifiedExperiences.filter(e => e.status === 'REAL_INTERNSHIP').length;
  const virtualCount = verifiedExperiences.filter(e => e.status === 'VIRTUAL_INTERNSHIP').length;
  const suspiciousCount = verifiedExperiences.filter(e => e.status === 'SUSPICIOUS' && !e.redFlag).length;
  const futureDateCount = verifiedExperiences.filter(e => e.redFlag === 'FUTURE_DATES').length;
  const unverifiedCount = verifiedExperiences.filter(e => e.status === 'UNVERIFIED').length;

  return {
    status: "COMPLETE",
    verified_experiences: verifiedExperiences,
    summary: {
      total: verifiedExperiences.length,
      verified: verifiedCount,
      realInternships: realInternshipCount,
      virtualInternships: virtualCount,
      suspicious: suspiciousCount,
      futureDates: futureDateCount,
      unverified: unverifiedCount,
      // Calculate weighted experience (virtual internships = 0, real internships = 60%, full-time = 100%)
      weightedExperienceCount: verifiedExperiences.reduce((sum, exp) => {
        if (exp.status === 'VIRTUAL_INTERNSHIP' || exp.redFlag === 'FUTURE_DATES') return sum; // Don't count virtual or future dates
        return sum + (exp.experienceWeight || 1.0);
      }, 0)
    }
  };
}

async function verifyCertificationsAndBadges(extractedUrls = {}, certifications = [], achievements = []) {
  // Collect ALL URLs - now from the single dynamic certifications array
  const allCertUrls = extractedUrls.certifications || [];

  const uniqueUrls = [...new Set(allCertUrls)];
  const certTexts = certifications || [];
  const achievementTexts = achievements || [];

  // Combine certifications and achievements for comprehensive analysis
  const allCertTexts = [
    // Convert certification objects to strings
    ...certTexts.map(c => {
      if (typeof c === 'string') return c;
      if (c && typeof c === 'object') {
        return c.name || c.certification || c.title || JSON.stringify(c);
      }
      return String(c);
    }),
    // Convert achievement objects to strings
    ...achievementTexts.map(a => {
      if (typeof a === 'string') return a;
      if (a && typeof a === 'object') {
        return a.name || a.title || a.certification || JSON.stringify(a);
      }
      return String(a);
    })
  ];

  console.log('🔍 All cert texts for analysis:', allCertTexts);

  if (uniqueUrls.length === 0 && allCertTexts.length === 0) {
    return {
      cert_verification: { status: "SKIPPED", score: 0, max_score: 10, findings: [], red_flags: [] },
      badge_verification: { status: "SKIPPED", score: 0, max_score: 5, findings: [], red_flags: [] }
    };
  }

  // ============================================================================
  // AI-POWERED URL ANALYSIS (Dynamic - checks ANY certification/badge URL)
  // ============================================================================
  let urlAnalyses = [];
  
  if (uniqueUrls.length > 0) {
    console.log(`🔍 Analyzing ${uniqueUrls.length} certification URL(s) with AI...`);
    
    const urlPrompt = `You are an expert certification verifier. Analyze these certification/badge URLs and determine their credibility.

URLs:
${uniqueUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

IMPORTANT: You have the freedom to verify ANY certification from ANY platform worldwide. Do NOT limit analysis to known platforms.

For EACH URL, determine:
1. Type: "badge", "certification", "course_certificate", "achievement", or "license"
2. Issuer: What organization issued it? (Can be ANY company, university, platform, or professional body)
3. Platform: What platform hosts it? (Can be ANY website - known or unknown)
4. Is Official: Is this from a legitimate/recognized organization globally? (true/false)
   - Consider: Major tech companies, universities, government bodies, industry associations
   - Consider: Emerging platforms, regional certifications, international bodies
   - Consider: Professional organizations from ANY country/industry
   - RED FLAG: Personal websites, self-hosted PDFs, unverifiable domains
5. Credibility Score (0-10) - ANALYZE THE ACTUAL PLATFORM/ISSUER:
   - 10: Government certifications, Major tech (AWS/Google/Microsoft/Oracle), Top universities
   - 9: Professional bodies (PMI/CISSP/CFA/etc), Industry leaders (Cisco/SAP/Adobe)
   - 8: Established badge platforms (Credly/Badgr), Industry certifications, Recognized institutions
   - 7: Universities, edX/Coursera verified certificates, Regional professional bodies
   - 6: Legitimate online platforms (known or emerging), Corporate training programs
   - 4-5: Course completion from reputable sources, Unverified but legitimate platforms
   - 1-3: Suspicious domains, self-claimed, no verification possible, potential fake certificates
6. Can Verify Across Pages: If this is a multi-page certificate or requires navigation, set "needsDeepScan": true

If you encounter an UNKNOWN platform:
- Analyze the domain reputation
- Check if URL structure looks professional
- Consider if issuer is recognizable
- Assign credibility based on analysis, not just "unknown = low score"

Return VALID JSON object with "certifications" array:
{
  "certifications": [
    {
      "url": "full URL",
      "type": "badge|certification|course_certificate|achievement",
      "issuer": "organization name",
      "isOfficial": true/false,
      "credibilityScore": 0-10,
      "platform": "platform name"
    }
  ]
}`;

    const aiUrlResult = await generateAIContent(urlPrompt);
    
    if (aiUrlResult && aiUrlResult.certifications && Array.isArray(aiUrlResult.certifications)) {
      urlAnalyses = aiUrlResult.certifications.map(item => {
        // Safely extract issuer
        let issuerName = "Unknown";
        if (typeof item.issuer === 'string') {
          issuerName = item.issuer;
        } else if (item.issuer && typeof item.issuer === 'object') {
          issuerName = item.issuer.name || item.issuer.organization || item.issuer.issuer || "Unknown Issuer";
        }

        // Safely extract platform
        let platformName = "Unknown";
        if (typeof item.platform === 'string') {
          platformName = item.platform;
        } else if (item.platform && typeof item.platform === 'object') {
          platformName = item.platform.name || item.platform.platform || "Unknown Platform";
        }
        
        return {
          url: item.url || "",
          type: item.type || "unknown",
          issuer: issuerName,
          isOfficial: item.isOfficial || false,
          credibilityScore: Math.max(0, Math.min(10, item.credibilityScore || 5)),
          platform: platformName
        };
      });
      console.log(`✅ AI analyzed ${urlAnalyses.length} certification URL(s)`);
    } else {
      // Fallback: minimal scoring if AI fails
      console.warn('⚠️ AI certification analysis failed - using minimal scoring');
      console.warn('AI response:', aiUrlResult);
      urlAnalyses = uniqueUrls.map(url => ({
        url,
        type: "unknown",
        issuer: "Unknown (AI analysis failed)",
        isOfficial: false,
        credibilityScore: 3, // Low score if we can't verify
        platform: "Unknown"
      }));
    }
  }

  // ============================================================================
  // AI-POWERED CERTIFICATION TEXT ANALYSIS (Dynamic)
  // ============================================================================
  let certAnalyses = [];
  
  if (allCertTexts.length > 0) {
    const prompt = `Analyze these certifications and achievements. For EACH item, determine:
1. Issuer/Organization (Google, AWS, Microsoft, Coursera, Hackathon name, etc.)
2. Is it an official/legitimate certification? (true/false)
3. Credibility score (0-10):
   - 10: Major tech companies (Google, AWS, Microsoft, Meta, etc.)
   - 8-9: Industry certifications (Cisco, Oracle, IBM), Hackathon winners, GDG leadership roles
   - 6-7: Recognized online platforms (Coursera, edX, Udacity), Study jams, Participants
   - 4-5: Course completion certificates (Udemy, etc.)
   - 1-3: Unverifiable or self-claimed achievements

IMPORTANT: Pay special attention to:
- Hackathon victories (Winner, First Place) = HIGH credibility (8-9)
- Leadership roles (Tech Head, GDG positions) = HIGH credibility (8-9)
- Google/Microsoft/AWS study jams = MEDIUM credibility (6-7)
- Competition participation = MEDIUM credibility (5-6)

Certifications and Achievements:
${allCertTexts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Return VALID JSON object with "certifications" array:
{
  "certifications": [
    {
      "certification": "exact certification text",
      "issuer": "organization name",
      "isOfficial": true/false,
      "credibilityScore": 0-10,
      "category": "Professional Certification|Online Course|Hackathon|Achievement|Competition"
    }
  ]
}`;

    const aiResult = await generateAIContent(prompt);

    if (aiResult && aiResult.certifications && Array.isArray(aiResult.certifications)) {
      certAnalyses = aiResult.certifications.map((item, index) => {
        // Get the original certification text for fallback
        const originalText = allCertTexts[index] || '';

        // Safely extract certification name (handle both string and object responses)
        let certName = "";
        if (typeof item.certification === 'string') {
          certName = item.certification;
        } else if (item.certification && typeof item.certification === 'object') {
          certName = item.certification.name || item.certification.title || item.certification.certification || originalText || 'Unknown Certification';
        } else if (item.name) {
          certName = item.name;
        } else if (item.title) {
          certName = item.title;
        } else {
          certName = originalText || 'Unknown Certification';
        }

        // Safely extract issuer (handle both string and object)
        let issuerName = "Unknown";
        if (typeof item.issuer === 'string') {
          issuerName = item.issuer;
        } else if (item.issuer && typeof item.issuer === 'object') {
          issuerName = item.issuer.name || item.issuer.organization || item.issuer.issuer || "Unknown Issuer";
        }

        return {
          certification: certName || originalText || "Unknown Certification",
          originalText: originalText, // Preserve original text for UI fallback
          issuer: issuerName,
          isOfficial: item.isOfficial || false,
          credibilityScore: Math.max(0, Math.min(10, item.credibilityScore || 5)),
          category: item.category || "Achievement"
        };
      });
      console.log(`✅ AI analyzed ${certAnalyses.length} certification text(s)`);
    } else {
      // Fallback: Use generic scoring if AI fails
      console.warn('⚠️ AI certification text analysis failed - using fallback');
      certAnalyses = allCertTexts.map(cert => ({
        certification: cert || "Unknown Certification",
        originalText: cert, // Preserve original text
        issuer: "Unknown",
        isOfficial: false,
        credibilityScore: 1, // Low score for unanalyzed certs
        category: "Achievement"
      }));
    }
  }

  // ============================================================================
  // DYNAMIC SCORING - Based on AI analysis, not hardcoded platforms
  // ============================================================================
  
  // Calculate URL credibility scores
  const urlCredibilityTotal = urlAnalyses.reduce((sum, a) => sum + a.credibilityScore, 0);
  const officialUrlCount = urlAnalyses.filter(a => a.isOfficial).length;
  const highCredibilityUrls = urlAnalyses.filter(a => a.credibilityScore >= 8);
  
  // Calculate certification text scores
  const officialCertCount = certAnalyses.filter(a => a.isOfficial).length;
  const totalCredibilityScore = certAnalyses.reduce((sum, a) => sum + a.credibilityScore, 0);
  const highCredibilityCerts = certAnalyses.filter(a => a.credibilityScore >= 8);
  
  // Detect red flags dynamically
  const certRedFlags = [];
  const lowCredibilityCerts = certAnalyses.filter(a => a.credibilityScore < 4);
  const lowCredibilityUrls = urlAnalyses.filter(a => a.credibilityScore < 4);
  
  if (lowCredibilityCerts.length > 0) {
    certRedFlags.push(`${lowCredibilityCerts.length} low-credibility certifications detected`);
  }
  if (lowCredibilityUrls.length > 0) {
    certRedFlags.push(`${lowCredibilityUrls.length} questionable URLs found`);
  }
  
  const unofficialCerts = certAnalyses.filter(a => !a.isOfficial && a.credibilityScore < 6);
  if (unofficialCerts.length > certAnalyses.length / 2 && certAnalyses.length > 2) {
    certRedFlags.push("Majority of certifications are from non-official sources");
  }
  
  // Certification score: AI-powered credibility scoring
  const certScore = Math.min(10, 
    Math.floor(urlCredibilityTotal / 2) +           // URL credibility contribution
    Math.floor(totalCredibilityScore / 3) +         // Text cert credibility
    (officialUrlCount * 2) +                        // Official URLs bonus
    (officialCertCount * 2)                         // Official certs bonus
  );
  
  // Badge score: Dynamic AI-powered badge detection (no hardcoded platforms)
  const badgeUrls = urlAnalyses.filter(a => 
    a.type === "badge" || 
    a.type === "achievement" ||
    a.platform.toLowerCase().includes('badge') ||
    a.issuer.toLowerCase().includes('badge')
  );
  
  const badgeScore = Math.min(5, 
    badgeUrls.reduce((sum, badge) => sum + (badge.credibilityScore / 2), 0)
  );
  
  // Findings - Dynamic based on actual analysis
  const certFindings = [];
  
  if (highCredibilityCerts.length > 0) {
    highCredibilityCerts.slice(0, 3).forEach(cert => {
      const issuerStr = typeof cert.issuer === 'string' ? cert.issuer : 'Unknown';
      const certStr = typeof cert.certification === 'string' ? cert.certification : 'Certification';
      certFindings.push(`${issuerStr}: ${certStr.substring(0, 60)}`);
    });
  }
  
  if (highCredibilityUrls.length > 0) {
    certFindings.push(`${highCredibilityUrls.length} verified certification URL(s)`);
  }
  
  if (officialCertCount > 0) {
    certFindings.push(`${officialCertCount} official certifications verified`);
  }
  
  if (certFindings.length === 0 && (certAnalyses.length > 0 || urlAnalyses.length > 0)) {
    certFindings.push(`Analyzed ${certAnalyses.length} certifications and ${urlAnalyses.length} URLs`);
  }
  
  // Badge findings - Dynamic
  const badgeFindings = [];
  
  if (badgeUrls.length > 0) {
    const badgePlatforms = [...new Set(badgeUrls.map(b => b.platform))];
    badgePlatforms.forEach(platform => {
      const count = badgeUrls.filter(b => b.platform === platform).length;
      badgeFindings.push(`${count} ${platform} badge(s) verified`);
    });
  }

  return {
    cert_verification: {
      status: certScore > 0 ? "VERIFIED" : "SKIPPED",
      score: certScore,
      max_score: 10,
      findings: certFindings.length > 0 ? certFindings : ['No certifications found'],
      red_flags: certRedFlags,
      details: {
        analyzed: certAnalyses.map(c => ({ ...c, source: 'text' })),
        urls: urlAnalyses.filter(a => a.type !== "badge").map(u => ({ ...u, source: 'url' }))
      }
    },
    badge_verification: {
      status: badgeScore > 0 ? "VERIFIED" : "SKIPPED",
      score: Math.round(badgeScore),
      max_score: 5,
      findings: badgeFindings.length > 0 ? badgeFindings : ['No digital badges found'],
      red_flags: [],
      details: {
        badges: badgeUrls,
        totalCount: badgeUrls.length
      }
    }
  };
}

async function analyzeRoleSuitability(extractedData) {
  const prompt = `Analyze this candidate's profile and determine their best-suited role(s).

Skills: ${JSON.stringify(extractedData.skills)}
Experience: ${JSON.stringify(extractedData.experience).substring(0, 800)}
Certifications: ${JSON.stringify(extractedData.certifications || []).substring(0, 300)}

Analyze their technical skills, experience, and determine:
1. The SINGLE best-suited role for this candidate
2. Why this role fits best (specific skills/experience)
3. 2-3 alternative roles they could excel in
4. Why the alternatives are also suitable

Consider ANY tech role, not limited to predefined options. Examples include but not limited to:
Frontend Developer, Backend Developer, Full Stack Developer, Mobile Developer, 
AI/ML Engineer, Data Scientist, Data Engineer, DevOps Engineer, Cloud Engineer,
Security Engineer, QA Engineer, Product Manager, Technical Writer, Solutions Architect, etc.

Return JSON:
{
    "best_suited_role": "specific role name",
    "best_role_reason": "2-3 sentences explaining why, referencing specific skills",
    "alternative_roles": ["role1", "role2", "role3"],
    "alternative_reason": "brief explanation for alternatives"
}`;

  const result = await generateAIContent(prompt);
  
  if (result && result.best_suited_role) {
    return result;
  }
  
  // If AI fails, use advanced skill-based analysis with NO hardcoded defaults
  const skills = extractedData.skills || {};
  const allSkills = [
    ...(skills.technical || []),
    ...(skills.languages || []),
    ...(skills.frameworks || []),
    ...(skills.tools || [])
  ].map(s => typeof s === 'string' ? s.toLowerCase() : (s.skill || s.name || '').toLowerCase());
  
  const experience = extractedData.experience || [];
  const certifications = extractedData.certifications || [];
  
  // Only proceed with fallback if we have meaningful data
  if (allSkills.length === 0 && experience.length === 0 && certifications.length === 0) {
    // Absolutely no data - return minimal result
    return {
      best_suited_role: "Entry-Level Software Engineer",
      best_role_reason: "Limited technical profile data available for detailed role analysis",
      alternative_roles: ["Junior Developer", "Technical Support", "QA Tester"],
      alternative_reason: "General technical roles suitable for candidates building their experience"
    };
  }
  
  // Advanced role detection from skills, experience, and certifications
  const roleMapping = [
    {
      role: "AI/ML Engineer",
      keywords: ['ml', 'machine learning', 'tensorflow', 'pytorch', 'keras', 'neural network', 'deep learning', 'ai', 'artificial intelligence', 'data science'],
      weight: 10
    },
    {
      role: "Data Scientist",
      keywords: ['data science', 'statistics', 'r', 'python', 'jupyter', 'pandas', 'numpy', 'scikit', 'analytics'],
      weight: 9
    },
    {
      role: "Data Engineer",
      keywords: ['data engineering', 'spark', 'hadoop', 'etl', 'airflow', 'kafka', 'data pipeline', 'bigquery', 'snowflake'],
      weight: 9
    },
    {
      role: "DevOps Engineer",
      keywords: ['devops', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible', 'infrastructure'],
      weight: 9
    },
    {
      role: "Cloud Engineer",
      keywords: ['aws', 'azure', 'gcp', 'cloud', 'lambda', 's3', 'ec2', 'cloudformation', 'cloud architecture'],
      weight: 9
    },
    {
      role: "Security Engineer",
      keywords: ['security', 'cybersecurity', 'penetration testing', 'vulnerability', 'encryption', 'firewall', 'owasp'],
      weight: 8
    },
    {
      role: "Mobile Developer",
      keywords: ['android', 'ios', 'react native', 'flutter', 'swift', 'kotlin', 'mobile', 'app development'],
      weight: 8
    },
    {
      role: "Frontend Developer",
      keywords: ['react', 'vue', 'angular', 'frontend', 'html', 'css', 'javascript', 'typescript', 'ui/ux'],
      weight: 7
    },
    {
      role: "Backend Developer",
      keywords: ['backend', 'api', 'node.js', 'django', 'flask', 'spring boot', 'express', 'rest', 'graphql', 'microservices'],
      weight: 7
    },
    {
      role: "Full Stack Developer",
      keywords: ['full stack', 'fullstack', 'mern', 'mean', 'lamp'],
      weight: 6
    },
    {
      role: "QA Engineer",
      keywords: ['testing', 'qa', 'quality assurance', 'selenium', 'automation testing', 'test automation', 'jest', 'cypress'],
      weight: 7
    },
    {
      role: "Blockchain Developer",
      keywords: ['blockchain', 'ethereum', 'solidity', 'smart contract', 'web3', 'crypto', 'defi'],
      weight: 8
    },
    {
      role: "Game Developer",
      keywords: ['unity', 'unreal', 'game development', 'game engine', 'c++', '3d graphics'],
      weight: 8
    }
  ];
  
  // Score each role based on keyword matches
  const roleScores = roleMapping.map(roleData => {
    let score = 0;
    
    roleData.keywords.forEach(keyword => {
      // Check skills
      if (allSkills.some(s => s.includes(keyword))) {
        score += roleData.weight;
      }
      
      // Check experience job titles/descriptions
      const expText = experience.map(e => `${e.jobTitle || ''} ${e.description || ''}`).join(' ').toLowerCase();
      if (expText.includes(keyword)) {
        score += roleData.weight * 0.5;
      }
      
      // Check certifications
      const certText = certifications.map(c => `${c.name || ''}`).join(' ').toLowerCase();
      if (certText.includes(keyword)) {
        score += roleData.weight * 0.3;
      }
    });
    
    return { role: roleData.role, score };
  });
  
  // Sort by score
  roleScores.sort((a, b) => b.score - a.score);
  
  const topRole = roleScores[0];
  
  // Use top scored role if it has ANY matches, otherwise analyze job titles from experience
  let finalRole = topRole.score > 0 ? topRole.role : null;
  
  if (!finalRole && experience.length > 0) {
    // Analyze job titles from experience
    const jobTitles = experience.map(e => e.jobTitle || e.role || '').filter(Boolean);
    const mostRecentTitle = jobTitles[0];
    
    if (mostRecentTitle) {
      finalRole = mostRecentTitle.includes('Engineer') || mostRecentTitle.includes('Developer')
        ? mostRecentTitle
        : `${mostRecentTitle} Specialist`;
    }
  }
  
  // Final fallback: Generic technical role based on ANY skills found
  if (!finalRole) {
    finalRole = allSkills.length > 5 ? "Software Engineer" : "Technical Associate";
  }
  
  const alternatives = roleScores
    .filter(r => r.score > 0 && r.role !== finalRole)
    .slice(0, 3)
    .map(r => r.role);
  
  // Generate intelligent alternatives if none found
  if (alternatives.length === 0) {
    const baseAlternatives = [];
    if (finalRole.includes('Engineer')) {
      baseAlternatives.push("Developer", "Technical Consultant", "Solutions Architect");
    } else if (finalRole.includes('Developer')) {
      baseAlternatives.push("Software Engineer", "Technical Lead", "Full Stack Developer");
    } else {
      baseAlternatives.push("Software Developer", "Technical Specialist", "Junior Engineer");
    }
    alternatives.push(...baseAlternatives.slice(0, 3));
  }
  
  const reason = topRole.score > 0 
    ? `Technical skills and experience align with ${finalRole} role requirements`
    : `Based on ${experience.length > 0 ? 'work experience' : 'technical background'} analysis`;
  
  return {
    best_suited_role: finalRole,
    best_role_reason: reason,
    alternative_roles: alternatives.slice(0, 3),
    alternative_reason: "Alternative career paths based on transferable skills and experience"
  };
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function verifyResume(extractedData, role = 'General') {
  console.log('🏁 Starting Enhanced Verification Logic...');
  const candidateName = extractedData.personalInfo?.fullName || "Unknown";

  const extractedUrls = extractedData.extractedUrls || { credly: [], certifications: [] };
  const githubUrl = extractedData.personalInfo?.githubUrl;
  const linkedinUrl = extractedData.personalInfo?.linkedinUrl;
  const certifications = extractedData.certifications || []; // Get certification texts
  const achievements = extractedData.achievements || []; // Get achievements

  // Parallel Verification Steps
  const [githubRes, linkedinRes, experienceRes, certsRes, roleSuitability] = await Promise.all([
    verifyGitHub(githubUrl, candidateName, role),
    verifyLinkedIn(linkedinUrl, candidateName, extractedData.experience),
    verifyExperience(extractedData.experience),
    verifyCertificationsAndBadges(extractedUrls, certifications, achievements), // Pass both certifications and achievements
    analyzeRoleSuitability(extractedData)
  ]);

  // Calculate Experience Score with weighted experience
  // Full-time verified: 10 points each
  // Real internships: 6 points each (60% weight)
  // Virtual internships: 0 points (educational, not experience)
  // Suspicious/Future dates: -10 points each (major red flag)
  // Unverified: 2 points each (benefit of doubt)
  const verifiedCount = experienceRes.summary.verified || 0;
  const realInternshipCount = experienceRes.summary.realInternships || 0;
  const virtualCount = experienceRes.summary.virtualInternships || 0;
  const suspiciousCount = experienceRes.summary.suspicious || 0;
  const unverifiedCount = experienceRes.summary.unverified || 0;

  // Count future date entries separately for severe penalty
  const futureDateCount = experienceRes.verified_experiences?.filter(exp => exp.redFlag === 'FUTURE_DATES').length || 0;

  const expScore = Math.max(0, Math.min(25,
    (verifiedCount * 10) +          // Full-time jobs
    (realInternshipCount * 6) +     // Real internships (60% of full-time)
    (unverifiedCount * 2) -         // Unverified (small credit)
    (suspiciousCount * 5) -         // Suspicious (penalty)
    (futureDateCount * 10)          // Future dates (major penalty)
    // Virtual internships = 0 (not counted as experience)
  ));

  // Total Score
  const totalScore = Math.min(100,
    githubRes.score +
    linkedinRes.score +
    expScore +
    certsRes.cert_verification.score +
    certsRes.badge_verification.score
  );

  // Verdict
  let verdict = "REJECT";
  if (totalScore >= 80) verdict = "HIGHLY_RECOMMENDED";
  else if (totalScore >= 60) verdict = "RECOMMENDED";
  else if (totalScore >= 40) verdict = "PROCEED_WITH_CAUTION";
  else if (totalScore >= 20) verdict = "NOT_RECOMMENDED";

  // Generate Report Analysis for Frontend
  const reportPrompt = `
  Generate a verification report summary.
  Candidate: ${candidateName}
  Role: ${role}
  Scores: GitHub=${githubRes.score}, LinkedIn=${linkedinRes.score}, Exp=${expScore}, Certs=${certsRes.cert_verification.score}
  Total: ${totalScore}/100
  
  IMPORTANT: Do NOT mention verdict keywords like "PROCEED_WITH_CAUTION", "RECOMMENDED", etc. in your summary. Focus only on factual findings.
  
  Return JSON:
  {
      "summary": "Professional executive summary focusing on verified qualifications and areas of strength without mentioning verdict",
      "strengths": ["List of verified strong points"],
      "concerns": ["List of unverified items or red flags"],
      "red_flags_summary": ["Critical issues"],
      "interview_focus_areas": ["What to ask in interview"]
  }
  `;

  const reportData = await generateAIContent(reportPrompt) || {
    summary: "Verification complete.",
    strengths: [],
    concerns: [],
    red_flags_summary: [],
    interview_focus_areas: []
  };

  const finalReport = {
    candidate_name: candidateName,
    role_applied: role,
    overallScore: Math.round(totalScore) || 0, // Ensure number, not NaN
    score: Math.round(totalScore) || 0, // Duplicate for safety
    verdict: verdict,
    role_suitability: roleSuitability,

    scoreBreakdown: {
      github: { score: Math.round(githubRes.score) || 0, max: 35 },
      linkedin: { score: Math.round(linkedinRes.score) || 0, max: 25 },
      experience: { score: Math.round(expScore) || 0, max: 25 },
      certifications: { score: Math.round(certsRes.cert_verification.score) || 0, max: 10 },
      badges: { score: Math.round(certsRes.badge_verification.score) || 0, max: 5 }
    },

    verifications: {
      github: githubRes,
      linkedin: linkedinRes,
      experience: experienceRes, // contains summary and verified_experiences
      certifications: certsRes.cert_verification,
      badges: certsRes.badge_verification
    },

    summary: reportData.summary,
    strengths: reportData.strengths,
    concerns: reportData.concerns,
    red_flags_summary: reportData.red_flags_summary,
    interview_focus_areas: reportData.interview_focus_areas
  };

  return finalReport;
}

export async function mergeFeedbackWithVerification(aiAnalysis, verificationResult) {
  // Merge logic to enrich AI feedback with hard verification data
  return {
    ...aiAnalysis,
    verification: verificationResult
  };
}
