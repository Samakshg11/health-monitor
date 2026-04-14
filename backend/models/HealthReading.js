const mongoose = require('mongoose');

const healthReadingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    heartRate: {
      value: { type: Number }, // BPM
      status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    },
    bloodPressure: {
      systolic: { type: Number },
      diastolic: { type: Number },
      status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    },
    spo2: {
      value: { type: Number }, // percentage
      status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    },
    temperature: {
      value: { type: Number }, // Celsius
      status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    },
    steps: {
      value: { type: Number, default: 0 },
      status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    },
    calories: {
      value: { type: Number, default: 0 },
    },
    distance: {
      value: { type: Number, default: 0 }, // kilometers
    },
    cadence: {
      value: { type: Number }, // steps per minute
    },
    activeMinutes: {
      value: { type: Number, default: 0 },
    },
    hydration: {
      value: { type: Number }, // percentage
      status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    },
    sleepScore: {
      value: { type: Number }, // percentage
      status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    },
    sleepHours: {
      value: { type: Number }, // hours
    },
    stressLevel: {
      value: { type: Number }, // percentage
      status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },
    },
    source: {
      type: String,
      enum: ['manual', 'estimated', 'device', 'health_connect'],
      default: 'manual',
    },
    sourceDetails: {
      mode: {
        type: String,
        enum: ['manual_entry', 'phone_only', 'band_plus_phone', 'health_connect'],
        default: 'manual_entry',
      },
      label: { type: String },
      deviceName: { type: String },
      deviceBattery: { type: Number },
      primarySource: { type: String },
      movementSource: { type: String },
      recoverySource: { type: String },
      confidenceTier: { type: String, enum: ['low', 'medium', 'high'] },
      supportedMetrics: {
        movement: { type: String },
        vitals: { type: String },
        recovery: { type: String },
      },
      contributors: [{ type: String }],
    },
    confidence: {
      overall: { type: Number }, // 0-100
      heartRate: { type: Number },
      bloodPressure: { type: Number },
      spo2: { type: Number },
      temperature: { type: Number },
      steps: { type: Number },
      distance: { type: Number },
      activeMinutes: { type: Number },
      hydration: { type: Number },
      sleepScore: { type: Number },
      sleepHours: { type: Number },
      stressLevel: { type: Number },
    },
    workoutMode: {
      type: String,
      enum: ['balanced', 'push', 'recovery'],
      default: 'balanced',
    },
    forecast: [
      {
        time: { type: String },
        energy: { type: String },
        label: { type: String },
        action: { type: String },
      },
    ],
    notes: { type: String },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Helper to determine statuses based on medical thresholds
healthReadingSchema.pre('save', function (next) {
  // Heart Rate: normal 60-100, warning 50-59 or 101-120, critical <50 or >120
  if (this.heartRate?.value !== undefined) {
    const hr = this.heartRate.value;
    if (hr < 50 || hr > 120) this.heartRate.status = 'critical';
    else if (hr < 60 || hr > 100) this.heartRate.status = 'warning';
    else this.heartRate.status = 'normal';
  }

  // Blood Pressure: normal <120/80, warning 120-139/80-89, critical >=140/90
  if (this.bloodPressure?.systolic !== undefined) {
    const sys = this.bloodPressure.systolic;
    const dia = this.bloodPressure.diastolic;
    if (sys >= 180 || dia >= 120) this.bloodPressure.status = 'critical';
    else if (sys >= 140 || dia >= 90) this.bloodPressure.status = 'warning';
    else this.bloodPressure.status = 'normal';
  }

  // SpO2: normal >=95, warning 90-94, critical <90
  if (this.spo2?.value !== undefined) {
    const spo2 = this.spo2.value;
    if (spo2 < 90) this.spo2.status = 'critical';
    else if (spo2 < 95) this.spo2.status = 'warning';
    else this.spo2.status = 'normal';
  }

  // Temperature: normal 36.1-37.2, warning 37.3-38.0 or 35.5-36.0, critical <35.5 or >38
  if (this.temperature?.value !== undefined) {
    const temp = this.temperature.value;
    if (temp < 35.5 || temp > 39) this.temperature.status = 'critical';
    else if (temp < 36.1 || temp > 37.2) this.temperature.status = 'warning';
    else this.temperature.status = 'normal';
  }

  // Hydration: normal >=70, warning 50-69, critical <50
  if (this.hydration?.value !== undefined) {
    const hydration = this.hydration.value;
    if (hydration < 50) this.hydration.status = 'critical';
    else if (hydration < 70) this.hydration.status = 'warning';
    else this.hydration.status = 'normal';
  }

  // Sleep score: normal >=75, warning 60-74, critical <60
  if (this.sleepScore?.value !== undefined) {
    const sleep = this.sleepScore.value;
    if (sleep < 60) this.sleepScore.status = 'critical';
    else if (sleep < 75) this.sleepScore.status = 'warning';
    else this.sleepScore.status = 'normal';
  }

  // Stress level: normal <=45, warning 46-69, critical >=70
  if (this.stressLevel?.value !== undefined) {
    const stress = this.stressLevel.value;
    if (stress >= 70) this.stressLevel.status = 'critical';
    else if (stress > 45) this.stressLevel.status = 'warning';
    else this.stressLevel.status = 'normal';
  }

  next();
});

module.exports = mongoose.model('HealthReading', healthReadingSchema);
