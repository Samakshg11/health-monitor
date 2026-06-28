const express = require('express');
const pool = require('../db/postgres');
const Profile = require('../models/Profile');
const HealthReading = require('../models/HealthReading');
const { protect } = require('../middleware/auth');
const { PLAN_CONFIG, getPlan } = require('../config/plans');

const router = express.Router();

const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getUsage = async (userId, planId) => {
  const plan = getPlan(planId);
  const start = monthStart();

  const readingsThisMonth = await HealthReading.countDocuments({
    user: userId,
    recordedAt: { $gte: start },
  });

  const readingLimit = plan.limits.readingsPerMonth;
  const readingUsagePercent =
    readingLimit === null ? 0 : Math.min(100, Math.round((readingsThisMonth / readingLimit) * 100));

  return {
    period: {
      startsAt: start,
      endsAt: new Date(new Date(start).setMonth(start.getMonth() + 1)),
    },
    readings: {
      used: readingsThisMonth,
      limit: readingLimit,
      percent: readingUsagePercent,
      remaining: readingLimit === null ? null : Math.max(readingLimit - readingsThisMonth, 0),
    },
  };
};

// @GET /api/billing/plans
router.get('/plans', protect, (req, res) => {
  const plans = Object.values(PLAN_CONFIG);
  res.json({ success: true, plans });
});

// @GET /api/billing/current
router.get('/current', protect, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const userRow = rows[0];
    if (!userRow) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      profile = await Profile.create({ userId: req.user.id });
    }

    const subscription = profile.subscription || {};
    const plan = getPlan(subscription.plan);
    const usage = await getUsage(req.user.id, subscription.plan || 'starter');

    res.json({
      success: true,
      customer: {
        name: userRow.name,
        email: userRow.email,
      },
      subscription: {
        ...subscription.toObject?.(),
        planConfig: plan,
      },
      usage,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/billing/subscribe
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly' } = req.body;

    if (!PLAN_CONFIG[planId]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const now = new Date();
    const renewsAt = new Date(now);
    if (billingCycle === 'annual') renewsAt.setFullYear(renewsAt.getFullYear() + 1);
    else renewsAt.setMonth(renewsAt.getMonth() + 1);

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      {
        'subscription.plan': planId,
        'subscription.billingCycle': billingCycle,
        'subscription.status': 'active',
        'subscription.startedAt': now,
        'subscription.renewsAt': renewsAt,
      },
      { new: true, upsert: true }
    );

    const usage = await getUsage(req.user.id, planId);

    res.json({
      success: true,
      message: `Plan upgraded to ${PLAN_CONFIG[planId].label}`,
      subscription: profile.subscription,
      usage,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
