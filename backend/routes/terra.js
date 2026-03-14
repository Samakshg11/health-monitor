const crypto = require('crypto');
const express = require('express');
const User = require('../models/User');
const HealthReading = require('../models/HealthReading');
const { protect } = require('../middleware/auth');

const router = express.Router();

const TERRA_BASE_URL = process.env.TERRA_API_BASE_URL || 'https://api.tryterra.co';

const getTerraHeaders = () => ({
  accept: 'application/json',
  'content-type': 'application/json',
  'dev-id': process.env.TERRA_DEV_ID,
  'x-api-key': process.env.TERRA_API_KEY,
});

const getSignatureHeader = (headers) =>
  headers['terra-signature'] ||
  headers['x-terra-signature'] ||
  headers['terra-signature-v2'] ||
  headers['x-terra-signature-v2'];

const verifyWebhookSignature = (req) => {
  if (!process.env.TERRA_WEBHOOK_SECRET) return true;
  const header = getSignatureHeader(req.headers);
  if (!header || !req.rawBody) return false;

  const parts = Object.fromEntries(
    header.split(',').map((entry) => {
      const [key, value] = entry.split('=');
      return [key, value];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${req.rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', process.env.TERRA_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

const extractFirstDataPoint = (payload) => {
  if (Array.isArray(payload?.data) && payload.data.length) return payload.data[0];
  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
  return payload;
};

const toHours = (seconds) => {
  if (typeof seconds !== 'number') return undefined;
  return Number((seconds / 3600).toFixed(1));
};

const extractSleepSeconds = (item) =>
  item?.sleep_durations_data?.other?.duration_asleep_state_seconds ??
  item?.sleep_durations_data?.other?.duration_in_bed_seconds ??
  item?.sleep_data?.sleep_durations_data?.other?.duration_asleep_state_seconds;

const extractDistanceKm = (item) => {
  const meters =
    item?.distance_data?.summary?.distance_meters ??
    item?.distance_data?.distance_meters ??
    item?.distance_meters;
  if (typeof meters !== 'number') return undefined;
  return Number((meters / 1000).toFixed(2));
};

const buildReadingFromTerra = (payload, provider) => {
  const item = extractFirstDataPoint(payload);
  if (!item || typeof item !== 'object') return null;

  const steps = item?.steps ?? item?.activity_data?.steps;
  const distanceKm = extractDistanceKm(item);
  const calories =
    item?.calories_data?.total_burned_calories ??
    item?.calories_data?.net_activity_calories ??
    item?.active_calories;
  const heartRate =
    item?.heart_rate_data?.summary?.avg_hr_bpm ??
    item?.heart_rate_data?.summary?.resting_hr_bpm;
  const spo2 =
    item?.oxygen_data?.avg_saturation_percentage ??
    item?.oxygen_saturation_data?.avg_percentage;
  const temperature =
    item?.temperature_data?.avg_temperature_celsius ??
    item?.temperature_data?.body_temperature_celsius;
  const sleepHours = toHours(extractSleepSeconds(item));

  const reading = {
    steps: typeof steps === 'number' ? { value: steps } : undefined,
    distance: typeof distanceKm === 'number' ? { value: distanceKm } : undefined,
    calories: typeof calories === 'number' ? { value: Math.round(calories) } : undefined,
    heartRate: typeof heartRate === 'number' ? { value: Math.round(heartRate) } : undefined,
    spo2: typeof spo2 === 'number' ? { value: Math.round(spo2) } : undefined,
    temperature: typeof temperature === 'number' ? { value: Number(temperature.toFixed(1)) } : undefined,
    sleepHours: typeof sleepHours === 'number' ? { value: sleepHours } : undefined,
    sleepScore: typeof sleepHours === 'number' ? { value: Math.min(100, Math.round(sleepHours * 12)) } : undefined,
    source: 'device',
    sourceDetails: {
      mode: 'band_plus_phone',
      label: 'Terra-connected wearable',
      deviceName: provider || 'Terra provider',
      primarySource: `${provider || 'Wearable'} via Terra`,
      movementSource: 'Provider activity feed',
      recoverySource: 'Provider sleep and body signals',
      contributors: ['terra-api', provider || 'wearable-provider'],
    },
    confidence: {
      overall: 90,
      heartRate: typeof heartRate === 'number' ? 92 : undefined,
      spo2: typeof spo2 === 'number' ? 90 : undefined,
      temperature: typeof temperature === 'number' ? 88 : undefined,
      steps: typeof steps === 'number' ? 94 : undefined,
      distance: typeof distanceKm === 'number' ? 92 : undefined,
      sleepHours: typeof sleepHours === 'number' ? 90 : undefined,
      sleepScore: typeof sleepHours === 'number' ? 82 : undefined,
    },
    notes: `${provider || 'Wearable'} sync via Terra`,
  };

  const hasAtLeastOneMetric = ['steps', 'distance', 'calories', 'heartRate', 'spo2', 'temperature', 'sleepHours']
    .some((key) => reading[key]);

  return hasAtLeastOneMetric ? reading : null;
};

const resolvePayload = async (payload) => {
  if (payload?.type !== 's3_payload' || !payload?.url) return payload;
  const response = await fetch(payload.url);
  if (!response.ok) throw new Error('Unable to download Terra s3 payload');
  return response.json();
};

const upsertConnection = (user, nextConnection) => {
  const existingIndex = user.terraConnections.findIndex(
    (connection) => connection.terraUserId === nextConnection.terraUserId
  );

  if (existingIndex >= 0) {
    user.terraConnections[existingIndex] = {
      ...user.terraConnections[existingIndex].toObject(),
      ...nextConnection,
    };
  } else {
    user.terraConnections.push(nextConnection);
  }
};

router.post('/widget-session', protect, async (req, res) => {
  try {
    if (!process.env.TERRA_API_KEY || !process.env.TERRA_DEV_ID) {
      return res.status(400).json({ success: false, message: 'Terra credentials are not configured' });
    }

    const providers = Array.isArray(req.body.providers) && req.body.providers.length ? req.body.providers : undefined;
    const response = await fetch(`${TERRA_BASE_URL}/v2/auth/generateWidgetSession`, {
      method: 'POST',
      headers: getTerraHeaders(),
      body: JSON.stringify({
        reference_id: String(req.user._id),
        language: 'en',
        ...(providers ? { providers: providers.join(',') } : {}),
        ...(process.env.TERRA_SUCCESS_REDIRECT_URL ? { auth_success_redirect_url: process.env.TERRA_SUCCESS_REDIRECT_URL } : {}),
        ...(process.env.TERRA_FAILURE_REDIRECT_URL ? { auth_failure_redirect_url: process.env.TERRA_FAILURE_REDIRECT_URL } : {}),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: data.message || 'Failed to create Terra widget session', data });
    }

    res.json({ success: true, session: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/connections', protect, async (req, res) => {
  res.json({ success: true, connections: req.user.terraConnections || [] });
});

router.post('/webhook', async (req, res) => {
  try {
    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({ success: false, message: 'Invalid Terra webhook signature' });
    }

    const payload = await resolvePayload(req.body || {});
    const referenceId =
      payload.reference_id ||
      payload.user?.reference_id ||
      payload.user?.referenceId;
    const terraUserId = payload.user?.user_id || payload.user?.terra_user_id || payload.terra_user_id;
    const provider = payload.user?.provider || payload.provider || payload.resource;
    const eventType = payload.type || payload.event || payload.resource || 'unknown';

    let user = referenceId ? await User.findById(referenceId) : null;
    if (!user && terraUserId) {
      user = await User.findOne({ 'terraConnections.terraUserId': terraUserId });
    }

    if (!user) {
      return res.json({ success: true, ignored: true, reason: 'No matching user' });
    }

    if (eventType.toLowerCase().includes('auth')) {
      upsertConnection(user, {
        terraUserId,
        provider,
        scopes: payload.user?.scopes?.join?.(', ') || payload.scopes?.join?.(', ') || '',
        status: payload.status === 'error' ? 'error' : 'connected',
        lastWebhookUpdate: new Date(),
        connectedAt: new Date(),
      });
      await user.save();
      return res.json({ success: true, synced: 'connection' });
    }

    const readingPayload = buildReadingFromTerra(payload, provider);
    if (readingPayload) {
      await HealthReading.create({
        user: user._id,
        ...readingPayload,
      });
    }

    if (terraUserId) {
      upsertConnection(user, {
        terraUserId,
        provider,
        status: 'connected',
        lastWebhookUpdate: new Date(),
      });
      await user.save();
    }

    res.json({ success: true, synced: readingPayload ? 'reading' : 'event' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
