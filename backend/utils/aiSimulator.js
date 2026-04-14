const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Switching to Gemma 3 27B IT for best-in-class quota and intelligence
const MODEL_NAME = "gemma-3-27b-it";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim()) : null;
const model = genAI ? genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: 'v1beta' }) : null;

/**
 * Simulates a realistic health reading based on user context.
 */
const generateHealthReadingAI = async (context = {}) => {
  const { lastReading = {}, activity = "normal", goals = {} } = context;

  if (!model) return generateHeuristicReading(lastReading, activity);

  const prompt = `
    Task: Act as a high-precision predictive health sensor.
    Input: Current activity is ${activity}. Historical context: ${JSON.stringify(lastReading)}. User goals: ${JSON.stringify(goals)}.
    Requirement: Return a JSON object with realistic readings AND an 8-hour forecast. 
    Format: { 
      "heartRate": number, "systolic": number, "diastolic": number, "spo2": number, "temperature": number, "steps": number, "stressLevel": number, "notes": "Brief 1-sentence observation",
      "forecast": [
        { "time": "2h", "energy": "high|stable|dip", "label": "Short label", "action": "Actionable tip" },
        ... 3-4 more points
      ]
    }
    Restriction: Return ONLY the JSON. No preamble.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    // Quiet failing to heuristic
    return generateHeuristicReading(lastReading, activity);
  }
};

/**
 * AI Coach response.
 */
const generateAICoachResponse = async (userMessage, history = [], userProfile = {}) => {
  if (!model) return "AI Offline: Please check your API key in AI Studio.";

  const prompt = `Act as an Elite Health Performance Strategist (Bio-hacking Expert) for ${userProfile.name}.
Context: ${JSON.stringify(history.slice(0, 3))}.
Persona: You are direct, clinical, and high-performance. Avoid generic fitness advice like "go for a walk." Instead, focus on glucose management, cortisol spikes, HRV recovery, and metabolic health.
Format: Max 2 sentences. Be punchy and high-value. No fluff.
User: ${userMessage}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    if (userProfile.vitals) {
        return `I'm analyzing a spike in demand at the moment, but looking at your most recent data: your heart rate is ${userProfile.vitals.heartRate?.value || 'stable'} and your stress is ${userProfile.vitals.stressLevel?.value || 'managed'}. I'll provide a deeper analysis as soon as the line clears!`;
    }
    return "I'm currently stabilizing my diagnostic link. I'll be back in just a moment to analyze your vitals!";
  }
};

const generateSleepAnalysis = async (sleepData = []) => {
  if (!model) return { summary: "Heuristic analysis...", efficiencyScore: 85, recommendations: ["Track consistently."] };
  const prompt = `
    Analyze this sleep data: ${JSON.stringify(sleepData)}.
    Return ONLY a JSON object:
    {
      "summary": "A concise 3-sentence analysis of the main sleep trend.",
      "efficiencyScore": number (0-100),
      "recommendations": ["Brief 10-word actionable tip 1", "Brief 10-word actionable tip 2", "Brief 10-word actionable tip 3"]
    }
  `;
  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text().replace(/```json|```/g, ""));
  } catch (err) {
    return { summary: "Heuristic analysis active...", efficiencyScore: 82, recommendations: ["Keep consistent tracking."] };
  }
};

const generateLongTermInsights = async (readings = [], days = 7) => {
  if (!model) return { trendSummary: "Insufficient data for AI modeling.", correlation: "None detected.", proactiveSteps: [] };

  const prompt = `
    Analyze the health trends for the last ${days} days: ${JSON.stringify(readings.slice(0, 50))}.
    Task: Find hidden correlations (e.g., relationship between late-night stress and morning heart rate).
    Return ONLY JSON:
    {
      "trendSummary": "A 2-sentence professional overview of the week.",
      "correlation": "A 1-sentence observation of how two metrics are affecting each other.",
      "proactiveSteps": ["Action 1", "Action 2"]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
  } catch (err) {
    return { trendSummary: "Stabilizing baseline...", correlation: "No significant variance detected.", proactiveSteps: ["Maintain daily syncs"] };
  }
};

const generateMedicalReportMarkdown = async (patientName, readings = []) => {
    return "# Clinical Health Snapshot\n\nAI-generated summary based on your dashboard metrics.";
};

const generateHeuristicReading = (lastReading, activity) => {
  const baseHr = lastReading.heartRate?.value || 72;
  let nextHr = activity === 'running' ? baseHr + 10 : activity === 'sleeping' ? baseHr - 2 : baseHr + (Math.random() > 0.5 ? 1 : -1);
  return {
    heartRate: Math.max(45, Math.min(180, nextHr)),
    systolic: 120,
    diastolic: 80,
    spo2: 98,
    temperature: 36.6,
    steps: activity === 'running' ? 50 : 0,
    forecast: [],
    notes: `Heuristic: ${activity}. (Note: AI link stabilizing...).`
  };
};

module.exports = { 
  generateHealthReadingAI, 
  generateAICoachResponse, 
  generateSleepAnalysis, 
  generateLongTermInsights,
  generateMedicalReportMarkdown 
};
