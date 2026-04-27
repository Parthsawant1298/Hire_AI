// models/course.js
import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  videoUrl: {
    type: String,
    required: true,
    trim: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  duration: {
    type: String,
    default: '10 min'
  }
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true,
    maxlength: [1000, 'Course description cannot exceed 1000 characters']
  },
  topic: {
    type: String,
    required: [true, 'Course topic is required'],
    trim: true,
    maxlength: [100, 'Course topic cannot exceed 100 characters']
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  duration: {
    type: String,
    default: '2 Hours'
  },
  thumbnail: {
    type: String,
    default: ''
  },
  totalLessons: {
    type: Number,
    default: 0
  },
  lessons: [lessonSchema],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      return ret;
    }
  }
});

// Indexes for performance
courseSchema.index({ userId: 1, createdAt: -1 });
courseSchema.index({ topic: 1 });

// Pre-save middleware to set totalLessons and thumbnail
courseSchema.pre('save', function(next) {
  this.totalLessons = this.lessons.length;

  // Set course thumbnail from first lesson if available
  if (this.lessons.length > 0 && this.lessons[0].thumbnail && !this.thumbnail) {
    this.thumbnail = this.lessons[0].thumbnail;
  }

  next();
});

// Don't create multiple models
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

export default Course;