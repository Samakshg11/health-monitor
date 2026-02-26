const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['heartRate', 'bloodPressure', 'spo2', 'temperature', 'steps'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['warning', 'critical'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    value: { type: String },
    read: {
      type: Boolean,
      default: false,
    },
    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthReading',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
