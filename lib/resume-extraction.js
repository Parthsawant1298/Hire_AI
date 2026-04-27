// lib/resume-extraction.js - Groq-Powered Resume Data Extraction Service (vLLM Optimized)
import Groq from 'groq-sdk';
import { verifyResume, mergeFeedbackWithVerification } from './verification.js';

// Helper function to create Groq client (faster than Groq, better rate limits)
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured. Please add it to .env.local file.');
  }

  return new Groq({ apiKey });
}

// Enhanced URL extraction from resume text AND embedded links
function extractProfileUrls(resumeText, embeddedLinks = []) {
  const urls = {
    github: null,
    linkedin: null,
    email: null,
    portfolio: null,
    certifications: [] // Single array for ALL certification/badge URLs (dynamic)
  };

  // Known social/common domains to exclude from certification detection
  const excludeDomains = [
    'google.com', 'facebook.com', 'twitter.com', 'instagram.com', 
    'youtube.com', 'reddit.com', 'medium.com', 'stackoverflow.com'
  ];

  // Known certification/badge/learning platforms (for priority detection)
  const certificationPlatforms = [
    'credly.com', 'badgr.com', 'acclaim.com', 'openbadges', 'badges.mozilla.org',
    'certmetrics.com', 'aws.training', 'learn.microsoft.com', 'microsoft.com/learn',
    'coursera.org', 'udemy.com', 'edx.org', 'udacity.com', 'pluralsight.com',
    'hackerrank.com', 'leetcode.com', 'codingame.com', 'kaggle.com',
    'google.com/certifi', 'aws.amazon.com/certifi', 'cloud.google.com/certifi',
    'academy.oracle.com', 'cisco.com/go/certifi', 'comptia.org',
    'scrum.org', 'scrumalliance.org', 'pmi.org', 'safe.org',
    'freecodecamp.org', 'datacamp.com', 'codecademy.com'
  ];

  // 1. Process Embedded Links (High Priority)
  if (Array.isArray(embeddedLinks)) {
    for (const link of embeddedLinks) {
      if (!link) continue;
      const lowerLink = link.toLowerCase();

      // GitHub
      if (lowerLink.includes('github.com')) {
        if (!urls.github) urls.github = link;
      }
      // LinkedIn
      else if (lowerLink.includes('linkedin.com/in/') || lowerLink.includes('linkedin.com/pub/')) {
        if (!urls.linkedin) urls.linkedin = link;
      }
      // Email
      else if (lowerLink.startsWith('mailto:')) {
        if (!urls.email) urls.email = link.replace('mailto:', '');
      }
      // DYNAMIC CERTIFICATION DETECTION: Check if URL matches any certification platform
      else if (certificationPlatforms.some(platform => lowerLink.includes(platform))) {
        if (!urls.certifications.includes(link)) {
          urls.certifications.push(link);
        }
      }
      // Portfolio detection (exclude common social media)
      else if (!excludeDomains.some(domain => lowerLink.includes(domain))) {
        // Check if it looks like a portfolio/personal site
        if (lowerLink.includes('.dev') || lowerLink.includes('.io') || 
            lowerLink.includes('.me') || lowerLink.includes('portfolio') ||
            lowerLink.includes('netlify') || lowerLink.includes('vercel') ||
            lowerLink.includes('github.io')) {
          if (!urls.portfolio) urls.portfolio = link;
        } else {
          // Unknown URL that's not social media - could be certification
          // Add to certifications for AI analysis
          if (!urls.certifications.includes(link)) {
            urls.certifications.push(link);
          }
        }
      }
    }
  }

  // 2. regex extraction (Fallback if not found in embedded links)
  // Enhanced regex patterns for profile extraction
  const patterns = {
    github: [
      /https?:\/\/(www\.)?github\.com\/([a-zA-Z0-9-_.]+)/gi,
      /git\.io\/([a-zA-Z0-9-_.]+)/gi,
      /github:\s*([a-zA-Z0-9-_.]+)/gi,
      /github\.com\/([a-zA-Z0-9-_.]+)/gi
    ],
    linkedin: [
      /https?:\/\/(www\.)?linkedin\.com\/in\/([a-zA-Z0-9-_.]+)/gi,
      /https?:\/\/(www\.)?linkedin\.com\/pub\/([a-zA-Z0-9-_.]+)/gi,
      /linkedin:\s*\/in\/([a-zA-Z0-9-_.]+)/gi,
      /linkedin\.com\/in\/([a-zA-Z0-9-_.]+)/gi
    ],
    email: [
      /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ],
    portfolio: [
      /https?:\/\/([a-zA-Z0-9-_.]+\.(dev|io|com|net|org|me|portfolio))/gi
    ]
  };

  // Extract GitHub URLs
  if (!urls.github) {
    for (const pattern of patterns.github) {
      const matches = resumeText.match(pattern);
      if (matches && matches[0]) {
        let url = matches[0];
        if (!url.startsWith('http')) {
          if (url.includes('github:')) {
            const username = url.split(':')[1].trim();
            url = `https://github.com/${username}`;
          } else {
            url = `https://github.com/${url}`;
          }
        }
        urls.github = url;
        break;
      }
    }
  }

  // Extract LinkedIn URLs
  if (!urls.linkedin) {
    for (const pattern of patterns.linkedin) {
      const matches = resumeText.match(pattern);
      if (matches && matches[0]) {
        let url = matches[0];
        if (!url.startsWith('http')) {
          if (url.includes('linkedin:')) {
            const path = url.split(':')[1].trim();
            url = `https://linkedin.com${path.startsWith('/') ? path : '/in/' + path}`;
          } else if (!url.includes('linkedin.com/in/') && !url.includes('linkedin.com/pub/')) {
            url = `https://linkedin.com/in/${url}`;
          } else {
            url = url.startsWith('linkedin.com') ? `https://${url}` : url;
          }
        }
        urls.linkedin = url;
        break;
      }
    }
  }

  // Extract Email
  if (!urls.email) {
    for (const pattern of patterns.email) {
      const matches = resumeText.match(pattern);
      if (matches && matches[0]) {
        urls.email = matches[0].replace('mailto:', '');
        break;
      }
    }
  }

  return urls;
}

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Rate limited. Retrying in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Extract structured data from resume using Qwen-2-VL-8B
 * @param {string} resumeText - The text content of the resume
 * @param {string} resumeUrl - The URL of the resume (for image-based extraction if needed)
 * @param {Array} embeddedLinks - List of hyperlinks extracted from PDF annotations
 * @returns {Promise<Object>} - Structured resume data
 */
export async function extractResumeData(resumeText, resumeUrl = null, embeddedLinks = []) {
  try {
    console.log('🔍 Starting resume data extraction with Qwen-2-VL-8B...');

    // Validate input
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('INSUFFICIENT_CONTENT: Resume text is too short for extraction.');
    }

    // First, extract URLs directly from resume text + embedded links
    const extractedUrls = extractProfileUrls(resumeText, embeddedLinks);
    
    console.log('🔗 Pre-extracted URLs:', {
      github: extractedUrls.github,
      linkedin: extractedUrls.linkedin,
      certifications: extractedUrls.certifications.length
    });

    const extractionPrompt = `
You are an expert resume parser and data extraction system. Extract structured information from this resume text.

RESUME CONTENT:
${resumeText}

CRITICAL: Extract ALL profile URLs including those in hyperlinked text, badges, and links. Look for:
- GitHub: github.com/username, git.io/username, or text like "GitHub: username"
- LinkedIn: linkedin.com/in/username, linkedin.com/pub/username, or text like "LinkedIn: /in/username"
- Email: Extract from any format including hyperlinked mailto: links
- Portfolio: Any personal website, dev portfolio, or project showcase URL

Extract the following information in EXACT JSON format. If any field is not found or unclear, use null:

{
  "personalInfo": {
    "fullName": "John Smith",
    "email": "john.smith@email.com",
    "phone": "+1-555-123-4567",
    "location": "New York, NY, USA",
    "linkedinUrl": "https://linkedin.com/in/johnsmith",
    "portfolioUrl": "https://johnsmith.dev",
    "githubUrl": "https://github.com/johnsmith"
  },
  "professionalSummary": "Brief 2-3 sentence summary of the candidate's experience and expertise",
  "experience": [
    {
      "jobTitle": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "startDate": "2020-01",
      "endDate": "2023-12",
      "duration": "3 years 11 months",
      "responsibilities": [
        "Led development of microservices architecture",
        "Managed team of 5 developers"
      ],
      "achievements": [
        "Reduced system latency by 40%",
        "Increased team productivity by 25%"
      ]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "Stanford University",
      "location": "Stanford, CA",
      "graduationYear": "2020",
      "gpa": "3.8",
      "relevantCoursework": ["Data Structures", "Algorithms", "Machine Learning"]
    }
  ],
  "skills": {
    "technical": [
      {
        "category": "Programming Languages",
        "skills": ["Python", "JavaScript", "Java", "Go"],
        "proficiency": "Expert"
      },
      {
        "category": "Frameworks",
        "skills": ["React", "Node.js", "Django", "Spring Boot"],
        "proficiency": "Advanced"
      },
      {
        "category": "Databases",
        "skills": ["PostgreSQL", "MongoDB", "Redis"],
        "proficiency": "Intermediate"
      },
      {
        "category": "Cloud/DevOps",
        "skills": ["AWS", "Docker", "Kubernetes", "CI/CD"],
        "proficiency": "Advanced"
      }
    ],
    "soft": ["Leadership", "Communication", "Problem Solving", "Team Management"]
  },
  "certifications": [
    {
      "name": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "issueDate": "2023-06",
      "expiryDate": "2026-06",
      "credentialId": "ABC123XYZ"
    }
  ],
  "achievements": [
    {
      "name": "Hackathon Winner - TechFest 2023",
      "issuer": "University Tech Club",
      "date": "2023-11",
      "type": "Competition",
      "description": "First place in AI/ML category"
    }
  ],
  "projects": [
    {
      "name": "E-commerce Platform",
      "description": "Built scalable e-commerce platform handling 100K+ users",
      "technologies": ["React", "Node.js", "MongoDB", "AWS"],
      "role": "Lead Developer",
      "duration": "6 months",
      "achievements": ["99.9% uptime", "Sub-second response times"]
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "Native"
    },
    {
      "language": "Spanish",
      "proficiency": "Conversational"
    }
  ],
  "salaryExpectations": {
    "currency": "USD",
    "minRange": 120000,
    "maxRange": 150000,
    "negotiable": true
  },
  "workPreferences": {
    "workType": "Remote", // Remote, Hybrid, Onsite
    "willingToRelocate": false,
    "preferredLocations": ["San Francisco", "New York", "Austin"],
    "availabilityDate": "2024-02-01"
  },
  "totalExperienceYears": 5.5
}

CRITICAL INSTRUCTIONS:
1. Extract ACTUAL data from the resume - DO NOT make up information
2. If information is not present, use null (not empty strings)
3. For dates, use YYYY-MM format or YYYY if only year is available
4. For experience duration, calculate from start/end dates
5. Group skills by logical categories (Programming, Frameworks, etc.)
6. Extract salary expectations ONLY if explicitly mentioned
7. For location, include city, state/province, and country if available
8. For work preferences, extract ONLY if explicitly stated
9. Parse phone numbers to standard format
10. CERTIFICATIONS: Extract formal certificates, courses, training programs, study jams, etc.
11. ACHIEVEMENTS: Extract hackathon wins, competition victories, leadership roles, awards, recognitions, etc.
    - Look for terms like: Winner, First Place, Champion, Tech Head, Leader, President, Award
    - Include hackathon victories, coding competitions, leadership positions
    - Extract GDG roles, club positions, volunteer leadership
12. Return ONLY valid JSON - no additional text

Focus on accuracy over completeness. It's better to return null than incorrect information.
Extract ALL achievements and certifications mentioned in the resume - they are critical for verification.
`;

    const groq = getGroqClient();

    console.log('📡 Sending resume to Groq (Llama 3.3 70B) for extraction...');

    const response = await retryWithBackoff(async () => {
      const prompt = `You are an expert resume parser that extracts structured data from resumes. Return only valid JSON with extracted information. Be accurate and thorough.\n\n${extractionPrompt}`;

      return await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume data extraction AI. Extract structured information accurately and return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      });
    }, 5, 2000);

    const content = response.choices[0].message.content.trim();
    console.log('📄 Groq response length:', content.length);

    // Extract JSON from response (handle markdown code blocks)
    let jsonString = content;

    // Remove markdown code blocks if present
    if (content.includes('```json')) {
      jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      jsonString = content.replace(/```\n?/g, '');
    }

    // Extract JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in response:', content.substring(0, 500));
      throw new Error('Invalid extraction response format from Groq 2.5 Flash');
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Try to fix common JSON issues
      console.log('⚠️ JSON parse failed, attempting to fix...');
      let fixedJson = jsonMatch[0]
        .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double quotes
        .replace(/\n/g, ' ')  // Remove newlines
        .replace(/\t/g, ' ');  // Remove tabs

      try {
        extractedData = JSON.parse(fixedJson);
        console.log('✅ Fixed JSON successfully');
      } catch (fixError) {
        console.error('❌ Could not fix JSON:', fixError.message);
        console.error('📄 Original JSON (first 500 chars):', jsonMatch[0].substring(0, 500));
        throw new Error(`JSON parsing failed: ${parseError.message}`);
      }
    }

    // Validate and clean the extracted data
    const cleanedData = validateAndCleanExtractedData(extractedData);

    // Merge with pre-extracted URLs (prioritize direct extraction over AI)
    if (extractedUrls.github && !cleanedData.personalInfo.githubUrl) {
      cleanedData.personalInfo.githubUrl = extractedUrls.github;
    } else if (extractedUrls.github && cleanedData.personalInfo.githubUrl && !cleanedData.personalInfo.githubUrl.includes(extractedUrls.github)) {
      // If both exist but are different, prefer the embedded one (more reliable)
      console.log(`🔗 Retaining embedded GitHub URL: ${extractedUrls.github} over extracted: ${cleanedData.personalInfo.githubUrl}`);
      cleanedData.personalInfo.githubUrl = extractedUrls.github;
    }

    if (extractedUrls.linkedin && !cleanedData.personalInfo.linkedinUrl) {
      cleanedData.personalInfo.linkedinUrl = extractedUrls.linkedin;
    } else if (extractedUrls.linkedin && cleanedData.personalInfo.linkedinUrl && !cleanedData.personalInfo.linkedinUrl.includes(extractedUrls.linkedin)) {
      console.log(`🔗 Retaining embedded LinkedIn URL: ${extractedUrls.linkedin} over extracted: ${cleanedData.personalInfo.linkedinUrl}`);
      cleanedData.personalInfo.linkedinUrl = extractedUrls.linkedin;
    }

    if (extractedUrls.email && !cleanedData.personalInfo.email) {
      cleanedData.personalInfo.email = extractedUrls.email;
    }
    if (extractedUrls.portfolio && !cleanedData.personalInfo.portfolioUrl) {
      cleanedData.personalInfo.portfolioUrl = extractedUrls.portfolio;
    }

    // Attach extra URLs for verification (all badge platforms)
    cleanedData.extractedUrls = {
      credly: extractedUrls.credly || [],
      badgr: extractedUrls.badgr || [],
      acclaim: extractedUrls.acclaim || [],
      openbadges: extractedUrls.openbadges || [],
      certmetrics: extractedUrls.certmetrics || [],
      microsoft: extractedUrls.microsoft || [],
      certifications: extractedUrls.certifications || []
    };

    console.log('✅ Resume data extracted successfully');
    console.log(`📋 Extracted: Name=${cleanedData.personalInfo?.fullName}, Email=${cleanedData.personalInfo?.email}, Skills=${cleanedData.skills?.technical?.length || 0} categories`);

    return cleanedData;

  } catch (error) {
    console.error('❌ Resume extraction failed:', error);

    // Re-throw specific errors
    if (error.message.includes('INSUFFICIENT_CONTENT')) {
      throw error;
    }

    throw new Error(`EXTRACTION_FAILED: Unable to extract resume data - ${error.message}`);
  }
}

/**
 * Validate and clean extracted resume data
 * @param {Object} data - Raw extracted data
 * @returns {Object} - Cleaned and validated data
 */
function validateAndCleanExtractedData(data) {
  const cleaned = {
    personalInfo: {
      fullName: cleanString(data.personalInfo?.fullName),
      email: cleanEmail(data.personalInfo?.email),
      phone: cleanPhone(data.personalInfo?.phone),
      location: cleanString(data.personalInfo?.location),
      linkedinUrl: cleanUrl(data.personalInfo?.linkedinUrl),
      portfolioUrl: cleanUrl(data.personalInfo?.portfolioUrl),
      githubUrl: cleanUrl(data.personalInfo?.githubUrl)
    },
    professionalSummary: cleanString(data.professionalSummary),
    experience: Array.isArray(data.experience) ? data.experience.map(cleanExperience) : [],
    education: Array.isArray(data.education) ? data.education.map(cleanEducation) : [],
    skills: {
      technical: Array.isArray(data.skills?.technical) ? data.skills.technical.map(cleanSkillCategory) : [],
      soft: Array.isArray(data.skills?.soft) ? data.skills.soft.filter(skill => typeof skill === 'string' && skill.trim()) : []
    },
    certifications: Array.isArray(data.certifications) ? data.certifications.map(cleanCertification) : [],
    achievements: Array.isArray(data.achievements) ? data.achievements.map(cleanAchievement) : [],
    projects: Array.isArray(data.projects) ? data.projects.map(cleanProject) : [],
    languages: Array.isArray(data.languages) ? data.languages.map(cleanLanguage) : [],
    salaryExpectations: data.salaryExpectations ? cleanSalaryExpectations(data.salaryExpectations) : null,
    workPreferences: data.workPreferences ? cleanWorkPreferences(data.workPreferences) : null,
    totalExperienceYears: typeof data.totalExperienceYears === 'number' ? data.totalExperienceYears : 0
  };

  return cleaned;
}

// Helper cleaning functions
function cleanString(str) {
  if (!str || typeof str !== 'string') return null;
  const cleaned = str.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function cleanEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : null;
}

function cleanPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  // Remove all non-digit characters except + and -
  const cleaned = phone.replace(/[^\d+\-\s\(\)]/g, '').trim();
  return cleaned.length >= 10 ? cleaned : null;
}

function cleanUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const cleaned = url.trim();
  try {
    new URL(cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

function cleanExperience(exp) {
  return {
    jobTitle: cleanString(exp.jobTitle),
    company: cleanString(exp.company),
    location: cleanString(exp.location),
    startDate: cleanString(exp.startDate),
    endDate: cleanString(exp.endDate),
    duration: cleanString(exp.duration),
    responsibilities: Array.isArray(exp.responsibilities) ?
      exp.responsibilities.map(cleanString).filter(Boolean) : [],
    achievements: Array.isArray(exp.achievements) ?
      exp.achievements.map(cleanString).filter(Boolean) : []
  };
}

function cleanEducation(edu) {
  return {
    degree: cleanString(edu.degree),
    institution: cleanString(edu.institution),
    location: cleanString(edu.location),
    graduationYear: cleanString(edu.graduationYear),
    gpa: cleanString(edu.gpa),
    relevantCoursework: Array.isArray(edu.relevantCoursework) ?
      edu.relevantCoursework.map(cleanString).filter(Boolean) : []
  };
}

function cleanSkillCategory(category) {
  return {
    category: cleanString(category.category),
    skills: Array.isArray(category.skills) ?
      category.skills.map(cleanString).filter(Boolean) : [],
    proficiency: cleanString(category.proficiency)
  };
}

function cleanCertification(cert) {
  return {
    name: cleanString(cert.name),
    issuer: cleanString(cert.issuer),
    issueDate: cleanString(cert.issueDate),
    expiryDate: cleanString(cert.expiryDate),
    credentialId: cleanString(cert.credentialId)
  };
}

function cleanAchievement(achievement) {
  return {
    name: cleanString(achievement.name),
    issuer: cleanString(achievement.issuer),
    date: cleanString(achievement.date),
    type: cleanString(achievement.type),
    description: cleanString(achievement.description)
  };
}

function cleanProject(project) {
  return {
    name: cleanString(project.name),
    description: cleanString(project.description),
    technologies: Array.isArray(project.technologies) ?
      project.technologies.map(cleanString).filter(Boolean) : [],
    role: cleanString(project.role),
    duration: cleanString(project.duration),
    achievements: Array.isArray(project.achievements) ?
      project.achievements.map(cleanString).filter(Boolean) : []
  };
}

function cleanLanguage(lang) {
  return {
    language: cleanString(lang.language),
    proficiency: cleanString(lang.proficiency)
  };
}

function cleanSalaryExpectations(salary) {
  return {
    currency: cleanString(salary.currency),
    minRange: typeof salary.minRange === 'number' ? salary.minRange : null,
    maxRange: typeof salary.maxRange === 'number' ? salary.maxRange : null,
    negotiable: typeof salary.negotiable === 'boolean' ? salary.negotiable : null
  };
}

function cleanWorkPreferences(prefs) {
  return {
    workType: cleanString(prefs.workType),
    willingToRelocate: typeof prefs.willingToRelocate === 'boolean' ? prefs.willingToRelocate : null,
    preferredLocations: Array.isArray(prefs.preferredLocations) ?
      prefs.preferredLocations.map(cleanString).filter(Boolean) : [],
    availabilityDate: cleanString(prefs.availabilityDate)
  };
}

/**
 * Extract contact information from resume (fallback method)
 * @param {string} resumeText - The text content of the resume
 * @returns {Object} - Basic contact information
 */
export function extractBasicContactInfo(resumeText) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

  const emails = resumeText.match(emailRegex) || [];
  const phones = resumeText.match(phoneRegex) || [];

  // Extract name (usually first line or after "Name:" keyword)
  const lines = resumeText.split('\n').map(line => line.trim()).filter(Boolean);
  let name = null;

  for (const line of lines.slice(0, 5)) { // Check first 5 lines
    if (line.length > 5 && line.length < 50 && /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line)) {
      name = line;
      break;
    }
  }

  return {
    fullName: name,
    email: emails[0] || null,
    phone: phones[0] || null,
    allEmails: emails,
    allPhones: phones
  };
}

/**
 * Extract resume data WITH verification and merged feedback
 * @param {string} resumeText - The text content of the resume
 * @param {string} role - Role being applied for (AIML, SDE, DevOps, General)
 * @param {boolean} includeVerification - Whether to run verification (default: true)
 * @param {Array} embeddedLinks - Embedded hyperlinks
 * @returns {Promise<Object>} - Extracted data + verification + merged feedback
 */
export async function extractAndVerifyResume(resumeText, role = 'General', includeVerification = true, embeddedLinks = []) {
  try {
    console.log('\n🚀 Starting Complete Resume Analysis with Verification...\n');
    const startTime = Date.now();

    // Step 1: Extract resume data
    console.log('📄 Step 1: Extracting resume data...');
    const extractedData = await extractResumeData(resumeText, null, embeddedLinks);
    console.log('✅ Extraction complete');

    if (!includeVerification) {
      return {
        extractedData,
        verification: null,
        mergedFeedback: null,
        mode: 'extraction_only'
      };
    }

    // Step 2: Run verification in parallel with AI analysis
    console.log('\n🔍 Step 2: Running verification checks...');
    const verificationResult = await verifyResume(extractedData, role);
    console.log('✅ Verification complete');

    // Step 3: Create basic AI analysis for merging
    console.log('\n🤖 Step 3: Creating AI skills analysis...');
    const aiAnalysis = await generateBasicAIAnalysis(extractedData, role);
    console.log('✅ AI analysis complete');

    // Step 4: Merge both feedbacks
    console.log('\n🔄 Step 4: Merging verification with AI analysis...');
    const mergedFeedback = await mergeFeedbackWithVerification(aiAnalysis, verificationResult);
    console.log('✅ Merge complete');

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Complete analysis finished in ${totalTime}s\n`);

    return {
      extractedData,
      verification: verificationResult,
      aiAnalysis,
      mergedFeedback,
      processingTime: `${totalTime}s`,
      timestamp: new Date().toISOString(),
      mode: 'full_analysis'
    };

  } catch (error) {
    console.error('❌ Extract and verify failed:', error);
    throw new Error(`Complete analysis failed: ${error.message}`);
  }
}

/**
 * Generate basic AI analysis of skills and qualifications
 * @param {Object} extractedData - Extracted resume data
 * @param {string} role - Role being applied for
 * @returns {Promise<Object>} - AI analysis results
 */
async function generateBasicAIAnalysis(extractedData, role) {
  try {
    const groq = getGroqClient();

    const prompt = `Analyze this candidate's technical qualifications for the ${role} role.

Candidate: ${extractedData.personalInfo?.fullName || 'Unknown'}
Role: ${role}

Skills: ${JSON.stringify(extractedData.skills, null, 2)}
Experience: ${JSON.stringify(extractedData.experience, null, 2)}
Education: ${JSON.stringify(extractedData.education, null, 2)}
Certifications: ${JSON.stringify(extractedData.certifications, null, 2)}

Provide analysis in JSON format:
{
  "overallFitScore": <0-100>,
  "technicalSkillsScore": <0-100>,
  "experienceScore": <0-100>,
  "educationScore": <0-100>,
  "keyStrengths": ["top 5 strengths"],
  "skillGaps": ["areas for improvement"],
  "roleMatch": "how well they match the ${role} role",
  "recommendation": "hiring recommendation based on skills only"
}

Return ONLY valid JSON.`;

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      },
    });

    const content = response.response.text().trim();
    let jsonString = content;

    if (content.includes('```json')) {
      jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      jsonString = content.replace(/```\n?/g, '');
    }

    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('⚠️ AI analysis failed:', error.message);
    // Return basic fallback
    return {
      overallFitScore: 50,
      technicalSkillsScore: 50,
      experienceScore: 50,
      educationScore: 50,
      keyStrengths: ['Evaluation pending'],
      skillGaps: ['Analysis unavailable'],
      roleMatch: 'Could not assess',
      recommendation: 'Manual review required',
      error: error.message
    };
  }
}
