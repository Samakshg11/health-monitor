const PLAN_CONFIG = {
  starter: {
    id: 'starter',
    label: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: {
      readingsPerMonth: 300,
      exportsPerMonth: 2,
      teamMembers: 1,
      liveSessionEnabled: true,
      aiInsightsEnabled: false,
    },
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    monthlyPrice: 39,
    yearlyPrice: 29,
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
    monthlyPrice: 149,
    yearlyPrice: 119,
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
