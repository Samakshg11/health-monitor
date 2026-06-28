const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Store the UUID string from PostgreSQL
      required: true,
      unique: true,
    },
    age:    { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    weight: { type: Number }, // kg
    height: { type: Number }, // cm
    dailyGoals: {
      steps:         { type: Number, default: 10000 },
      activeMinutes: { type: Number, default: 60 },
      hydration:     { type: Number, default: 100 }, // percentage
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
      startedAt:   { type: Date, default: Date.now },
      renewsAt:    { type: Date },
      trialEndsAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Profile', profileSchema);
