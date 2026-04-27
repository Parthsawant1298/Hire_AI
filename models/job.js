// models/job.js - SIMPLIFIED RESUME-ONLY HIRING
import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Host',
    required: true
  },

  // Job Details
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  jobDescription: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  jobResponsibilities: {
    type: String,
    required: [true, 'Job responsibilities are required'],
    trim: true,
    maxlength: [3000, 'Job responsibilities cannot exceed 3000 characters']
  },
  jobRequirements: {
    type: String,
    required: [true, 'Job requirements are required'],
    trim: true,
    maxlength: [3000, 'Job requirements cannot exceed 3000 characters']
  },
  jobType: {
    type: String,
    enum: ['internship', 'job'],
    required: true
  },
  jobImage: {
    type: String, // Cloudinary URL
    default: null
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  salary: {
    type: String,
    required: [true, 'Salary is required'],
    trim: true,
    maxlength: [100, 'Salary cannot exceed 100 characters']
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },

  // Selection Criteria - SIMPLIFIED
  targetApplications: {
    type: Number,
    required: true,
    min: 1,
    max: 1000,
    default: 100
  },
  positionsAvailable: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },

  // Interview Round Settings
  firstRoundShortlist: {
    type: Number, // How many to shortlist in resume analysis round
    min: 1,
    max: 500,
    default: 50
  },
  finalRoundShortlist: {
    type: Number, // How many to shortlist for voice interview
    min: 1,
    max: 100,
    default: 10
  },
  voiceInterviewDuration: {
    type: Number, // Duration in minutes
    min: 5,
    max: 60,
    default: 15
  },

  // Voice Interview Data
  interviewQuestions: [{
    question: { type: String },
    type: { type: String }, // technical, behavioral, situational, general
    difficulty: { type: String }, // easy, medium, hard
    expectedDuration: { type: Number } // in seconds
  }],
  vapiAssistantId: {
    type: String,
    default: null
  },
  interviewLink: {
    type: String,
    default: null
  },

  // Status & Tracking
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'completed'],
    default: 'draft'
  },
  currentApplications: {
    type: Number,
    default: 0
  },
  selectedCandidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  rankedApplications: {
    type: Boolean,
    default: false
  },

  // Round Management
  currentRound: {
    type: Number,
    min: 1,
    max: 3,
    default: 1
  },
  roundStatus: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  roundsCompleted: [{
    roundNumber: { type: Number },
    completedAt: { type: Date },
    candidatesProcessed: { type: Number },
    candidatesSelected: { type: Number },
    candidatesRejected: { type: Number }
  }],

  // Dates
  applicationDeadline: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },

  // Analytics
  totalViews: {
    type: Number,
    default: 0
  },
  averageAtsScore: {
    type: Number,
    default: 0
  },
  averageCompositeScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completedInterviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
jobSchema.index({ hostId: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ jobType: 1, status: 1 });

// Validation
jobSchema.pre('save', function (next) {
  if (this.positionsAvailable > this.targetApplications) {
    next(new Error('Positions available cannot be greater than target applications'));
  }
  next();
});

// Application Schema
const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Resume & Application
  resumeUrl: {
    type: String,
    required: true
  },
  resumeFilename: {
    type: String,
    required: true
  },
  coverLetter: {
    type: String,
    maxlength: 2000,
    trim: true
  },

  // EXTRACTED RESUME DATA (from Gemini 2.5 Flash)
  extractedData: {
    personalInfo: {
      fullName: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      phone: { type: String, trim: true },
      location: { type: String, trim: true },
      linkedinUrl: { type: String, trim: true },
      portfolioUrl: { type: String, trim: true },
      githubUrl: { type: String, trim: true }
    },
    professionalSummary: { type: String, trim: true },
    experience: [{
      jobTitle: { type: String, trim: true },
      company: { type: String, trim: true },
      location: { type: String, trim: true },
      startDate: { type: String, trim: true },
      endDate: { type: String, trim: true },
      duration: { type: String, trim: true },
      responsibilities: [{ type: String, trim: true }],
      achievements: [{ type: String, trim: true }]
    }],
    education: [{
      degree: { type: String, trim: true },
      institution: { type: String, trim: true },
      location: { type: String, trim: true },
      graduationYear: { type: String, trim: true },
      gpa: { type: String, trim: true },
      relevantCoursework: [{ type: String, trim: true }]
    }],
    skills: {
      technical: [{
        category: { type: String, trim: true },
        skills: [{ type: String, trim: true }],
        proficiency: { type: String, trim: true }
      }],
      soft: [{ type: String, trim: true }]
    },
    certifications: [{
      name: { type: String, trim: true },
      issuer: { type: String, trim: true },
      issueDate: { type: String, trim: true },
      expiryDate: { type: String, trim: true },
      credentialId: { type: String, trim: true }
    }],
    achievements: [{
      name: { type: String, trim: true },
      issuer: { type: String, trim: true },
      date: { type: String, trim: true },
      type: { type: String, trim: true },
      description: { type: String, trim: true }
    }],
    projects: [{
      name: { type: String, trim: true },
      description: { type: String, trim: true },
      technologies: [{ type: String, trim: true }],
      role: { type: String, trim: true },
      duration: { type: String, trim: true },
      achievements: [{ type: String, trim: true }]
    }],
    languages: [{
      language: { type: String, trim: true },
      proficiency: { type: String, trim: true }
    }],
    salaryExpectations: {
      currency: { type: String, trim: true },
      minRange: { type: Number },
      maxRange: { type: Number },
      negotiable: { type: Boolean }
    },
    workPreferences: {
      workType: { type: String, trim: true }, // Remote, Hybrid, Onsite
      willingToRelocate: { type: Boolean },
      preferredLocations: [{ type: String, trim: true }],
      availabilityDate: { type: String, trim: true }
    },
    totalExperienceYears: { type: Number, default: 0 },
    extractedAt: { type: Date, default: Date.now }
  },

  // VERIFICATION RESULTS (GitHub, LinkedIn, Experience, Certifications)
  verificationResult: {
    candidateName: { type: String, trim: true },
    roleApplied: { type: String, trim: true },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    maxScore: { type: Number, default: 100 },
    verdict: {
      type: String,
      default: null
    },
    scoreBreakdown: {
      github: {
        score: { type: Number, default: 0 },
        max: { type: Number, default: 35 }
      },
      linkedin: {
        score: { type: Number, default: 0 },
        max: { type: Number, default: 25 }
      },
      experience: {
        score: { type: Number, default: 0 },
        max: { type: Number, default: 25 }
      },
      certifications: {
        score: { type: Number, default: 0 },
        max: { type: Number, default: 10 }
      },
      badges: {
        score: { type: Number, default: 0 },
        max: { type: Number, default: 5 }
      }
    },
    verifications: {
      github: {
        status: { type: String, default: 'SKIPPED' },
        score: { type: Number, default: 0 },
        findings: [{ type: String }],
        redFlags: [{ type: String }]
      },
      linkedin: {
        status: { type: String, default: 'SKIPPED' },
        score: { type: Number, default: 0 },
        findings: [{ type: String }],
        redFlags: [{ type: String }]
      },
      certifications: {
        status: { type: String, default: 'SKIPPED' },
        score: { type: Number, default: 0 },
        findings: [{ type: String }],
        redFlags: [{ type: String }],
        details: {
          analyzed: [{
            certification: { type: String },
            issuer: { type: String },
            isOfficial: { type: Boolean },
            credibilityScore: { type: Number, min: 0, max: 10 },
            category: { type: String },
            source: { type: String, enum: ['text', 'url'] }
          }],
          urls: [{
            url: { type: String },
            type: { type: String },
            issuer: { type: String },
            isOfficial: { type: Boolean },
            credibilityScore: { type: Number, min: 0, max: 10 },
            platform: { type: String },
            needsDeepScan: { type: Boolean }
          }]
        }
      },
      badges: {
        status: { type: String, default: 'SKIPPED' },
        score: { type: Number, default: 0 },
        findings: [{ type: String }],
        details: {
          badges: [{
            url: { type: String },
            issuer: { type: String },
            platform: { type: String },
            credibilityScore: { type: Number, min: 0, max: 10 },
            type: { type: String }
          }]
        }
      },
      experience: {
        status: { type: String, default: 'SKIPPED' },
        score: { type: Number, default: 0 },
        verifiedExperiences: [{
          company: { type: String },
          role: { type: String },
          duration: { type: String },
          status: {
            type: String
          },
          reason: { type: String },
          sources: [{ type: String }]
        }],
        summary: {
          total: { type: Number, default: 0 },
          verified: { type: Number, default: 0 },
          virtual: { type: Number, default: 0 },
          suspicious: { type: Number, default: 0 },
          needsReview: { type: Number, default: 0 }
        }
      }
    },
    verificationTime: { type: String },

    // Detailed Analysis (Executive Summary & Role Suitability)
    detailedAnalysis: {
      executiveSummary: { type: String },
      roleSuitability: {
        bestMatch: {
          role: { type: String },
          reason: { type: String }
        },
        alternatives: [{
          title: { type: String },
          reason: { type: String }
        }]
      },
      strengths: [String],
      concerns: [String],
      interviewFocusAreas: [{
        area: { type: String, default: '' },
        question: { type: String, default: '' },
        expectedSignal: { type: String, default: '' }
      }],
      finalRecommendation: String
    },

    timestamp: { type: Date }
  },

  // AI Analysis Results
  atsScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  aiAnalysis: {
    skillsMatch: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    experienceMatch: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    overallFit: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    locationCompatible: {
      type: Boolean,
      default: true
    },
    salaryCompatible: {
      type: Boolean,
      default: true
    },
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    detailedFeedback: String
  },

  // Voice Interview Feedback (Industry Standard Comprehensive Assessment)
  voiceInterviewFeedback: {
    // Core Competency Scores (0-100 scale - Industry Standard)
    communicationSkills: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    technicalKnowledge: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    problemSolving: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    culturalFit: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    overallPerformance: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // Detailed Professional Analysis (4-6 paragraphs)
    detailedFeedback: {
      type: String,
      default: ''
    },
    
    // Strengths & Development Areas
    strengths: [{
      type: String
    }],
    areasForImprovement: [{
      type: String
    }],
    
    // Professional Assessment Metrics
    hiringRecommendation: {
      type: String,
      enum: ['Strongly Recommend', 'Recommend', 'Consider with Reservations', 'Not Recommend'],
      default: 'Consider with Reservations'
    },
    confidenceLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium'
    },
    standoutMoments: [{
      type: String
    }],
    redFlags: [{
      type: String
    }],
    technicalExamples: [{
      type: String
    }],
    
    // Interview Metadata
    interviewDuration: {
      type: Number,
      default: 0
    },
    answeredQuestions: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    interviewQualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    recommendedNextSteps: {
      type: String,
      default: ''
    },
    analyzedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Voice Interview Basic Fields
  voiceInterviewCompleted: {
    type: Boolean,
    default: false
  },
  voiceInterviewScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  voiceTranscript: {
    type: String,
    default: ''
  },
  interviewCompletedAt: {
    type: Date
  },
  interviewAttempts: {
    type: Number,
    default: 0
  },
  interviewFeedback: {
    type: String,
    default: ''
  },
  interviewDuration: {
    type: Number,
    default: 0
  },
  interviewHistory: [{
    attemptNumber: Number,
    completedAt: Date,
    duration: Number,
    transcript: String,
    score: Number,
    feedback: String,
    strengths: [String],
    weaknesses: [String],
    finalScore: Number,
    technicalScore: Number,
    communicationScore: Number,
    problemSolvingScore: Number,
    confidenceScore: Number,
    hiringRecommendation: String
  }],

  // Final Overall Score (Round 1 + Round 2 combined)
  finalScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Ranking & Selection
  ranking: {
    type: Number,
    default: 0
  },
  compositeScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  aiRecommendation: {
    type: String,
    enum: ['applied', 'shortlisted', 'rejected', 'pending', 'interview_completed', 'selected', 'hr_selected', 'hr_rejected', 'offer_sent'],
    default: 'pending'
  },

  // Round Management
  round: {
    type: Number,
    min: 1,
    max: 3,
    default: 1
  },

  // Final Status
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'interview_scheduled', 'interview_completed', 'ai_selected', 'ai_rejected', 'hr_selected', 'hr_rejected', 'offer_sent', 'rejected'],
    default: 'applied'
  },

  // Monitoring & Security Data
  monitoringData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // HR Manual Override
  hrReviewed: {
    type: Boolean,
    default: false
  },
  hrDecision: {
    type: String,
    enum: ['selected', 'rejected', 'pending'],
    default: 'pending'
  },
  hrNotes: {
    type: String,
    maxlength: 500
  },
  hrReviewedAt: {
    type: Date
  },

  // Notifications
  offerEmailSent: {
    type: Boolean,
    default: false
  },
  rejectionEmailSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });
applicationSchema.index({ jobId: 1, status: 1, ranking: 1 });
applicationSchema.index({ jobId: 1, atsScore: -1 });
applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1 });

// Force clear model cache to ensure schema updates (especially enums) are applied during development
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Job;
  delete mongoose.models.Application;
}

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);
const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);

export { Job, Application };