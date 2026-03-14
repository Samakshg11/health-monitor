const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    weight: { type: Number }, // kg
    height: { type: Number }, // cm
    dailyGoals: {
      steps: { type: Number, default: 10000 },
      activeMinutes: { type: Number, default: 60 },
      hydration: { type: Number, default: 100 }, // percentage
    },
    organization: {
      name: { type: String, trim: true },
      role: { type: String, trim: true },
    },
    onboarding: {
      completed: { type: Boolean, default: false },
      trackingGoal: {
        type: String,
        enum: ['fitness', 'wellness', 'recovery', 'clinical-awareness'],
        default: 'fitness',
      },
      experienceLevel: {
        type: String,
        enum: ['beginner', 'regular', 'advanced'],
        default: 'beginner',
      },
      preferredTrackingMode: {
        type: String,
        enum: ['phone_only', 'future_band', 'both'],
        default: 'phone_only',
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['starter', 'growth', 'enterprise'],
        default: 'starter',
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'annual'],
        default: 'monthly',
      },
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled', 'trialing'],
        default: 'active',
      },
      startedAt: {
        type: Date,
        default: Date.now,
      },
      renewsAt: { type: Date },
      trialEndsAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
