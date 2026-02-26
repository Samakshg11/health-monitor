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

  next();
});

module.exports = mongoose.model('HealthReading', healthReadingSchema);
