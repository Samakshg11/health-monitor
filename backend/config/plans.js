const PLAN_CONFIG = {
  starter: {
    id: 'starter',
    label: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: {
      readingsPerMonth: null,
      exportsPerMonth: null,
      teamMembers: 1,
      liveSessionEnabled: true,
      aiInsightsEnabled: true,
    },
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    monthlyPrice: 3299,
    yearlyPrice: 2499,
    limits: {
      readingsPerMonth: 4000,
      exportsPerMonth: 40,
      teamMembers: 5,
      liveSessionEnabled: true,
      aiInsightsEnabled: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    monthlyPrice: 12499,
    yearlyPrice: 9999,
    limits: {
      readingsPerMonth: null,
      exportsPerMonth: null,
      teamMembers: null,
      liveSessionEnabled: true,
      aiInsightsEnabled: true,
    },
  },
};

const getPlan = (planId) => PLAN_CONFIG[planId] || PLAN_CONFIG.starter;

module.exports = {
  PLAN_CONFIG,
  getPlan,
};
