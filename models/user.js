// models/user.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    // Removed index: true to avoid duplicate index warning
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v.replace(/\D/g, ''));
      },
      message: 'Please provide a valid 10-digit phone number'
    }
  },
  branch: {
    type: String,
    trim: true,
    maxlength: [100, 'Branch cannot exceed 100 characters']
  },
  profilePicture: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Face and Voice Verification Data
  verificationFaceImage: {
    type: String, // Cloudinary URL or base64
    default: null
  },
  verificationVoiceAudio: {
    type: String, // Cloudinary URL or base64
    default: null
  },
  verificationTextRead: {
    type: String, // The text that was read during voice recording
    default: null
  },
  verificationSetupCompleted: {
    type: Boolean,
    default: false
  },
  verificationSetupDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for performance - email already has unique: true, so no need to duplicate
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Don't create multiple models
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;