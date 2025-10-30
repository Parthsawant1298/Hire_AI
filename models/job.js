// models/job.js
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['technical', 'behavioral', 'situational', 'general'],
    default: 'general'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  expectedDuration: {
    type: Number, // in seconds
    default: 60
  }
});

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
  
  // Selection Criteria
  maxCandidatesShortlist: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  finalSelectionCount: {
    type: Number,
    required: true,
    min: 1
  },
  targetApplications: {
    type: Number,
    required: true,
    min: 1,
    max: 1000
  },
  voiceInterviewDuration: {
    type: Number, // in minutes
    required: true,
    min: 5,
    max: 60
  },
  
  // AI Generated Content
  interviewQuestions: [questionSchema],
  vapiCallId: {
    type: String,
    default: null
  },
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
    enum: ['draft', 'published', 'applications_open', 'applications_closed', 'interviews_active', 'completed', 'cancelled'],
    default: 'draft'
  },
  currentApplications: {
    type: Number,
    default: 0
  },
  shortlistedCandidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  finalSelectedCandidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  
  // Dates
  applicationDeadline: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },
  interviewStartDate: {
    type: Date,
    default: null
  },
  interviewEndDate: {
    type: Date,
    default: null
  },
  
  // Analytics
  totalViews: {
    type: Number,
    default: 0
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
jobSchema.pre('save', function(next) {
  if (this.finalSelectionCount > this.maxCandidatesShortlist) {
    next(new Error('Final selection count cannot be greater than max candidates for shortlist'));
  }
  if (this.maxCandidatesShortlist > this.targetApplications) {
    next(new Error('Max candidates for shortlist cannot be greater than target applications'));
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
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    detailedFeedback: String
  },
  
  // Interview Results
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
  voiceInterviewFeedback: {
    communicationSkills: {
      type: Number,
      min: 0,
      max: 100
    },
    technicalKnowledge: {
      type: Number,
      min: 0,
      max: 100
    },
    problemSolving: {
      type: Number,
      min: 0,
      max: 100
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    overallPerformance: {
      type: Number,
      min: 0,
      max: 100
    },
    detailedFeedback: String,
    interviewDuration: Number, // in seconds
    answeredQuestions: Number,
    totalQuestions: Number
  },
  
  // Re-interview Support
  interviewAttempts: {
    type: Number,
    default: 0
  },
  interviewHistory: [{
    attemptNumber: Number,
    completedAt: Date,
    score: Number,
    feedback: Object,
    transcript: String,
    callId: String,
    duration: Number,
    superseded: {
      type: Boolean,
      default: false
    }
  }],
  currentInterviewCallId: {
    type: String,
    default: null
  },
  
  // Final Scores & Status
  finalScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'interview_scheduled', 'interview_completed', 'selected', 'rejected', 'offer_sent'],
    default: 'applied'
  },
  ranking: {
    type: Number,
    default: 0
  },
  
  // Notifications
  shortlistEmailSent: {
    type: Boolean,
    default: false
  },
  rejectionEmailSent: {
    type: Boolean,
    default: false
  },
  offerEmailSent: {
    type: Boolean,
    default: false
  },
  
  // Interview Scheduling
  interviewScheduledAt: {
    type: Date,
    default: null
  },
  interviewCompletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });
applicationSchema.index({ jobId: 1, status: 1, finalScore: -1 });
applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1 });

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);
const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);

export { Job, Application };