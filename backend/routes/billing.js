const express = require('express');
const User = require('../models/User');
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
    const user = await User.findById(req.user._id).select('subscription email name');
    const subscription = user.subscription || {};
    const plan = getPlan(subscription.plan);
    const usage = await getUsage(user._id, subscription.plan || 'starter');

    res.json({
      success: true,
      customer: {
        name: user.name,
        email: user.email,
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

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'subscription.plan': planId,
        'subscription.billingCycle': billingCycle,
        'subscription.status': 'active',
        'subscription.startedAt': now,
        'subscription.renewsAt': renewsAt,
      },
      { new: true }
    ).select('subscription');

    const usage = await getUsage(req.user._id, planId);

    res.json({
      success: true,
      message: `Plan upgraded to ${PLAN_CONFIG[planId].label}`,
      subscription: user.subscription,
      usage,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
