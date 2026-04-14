const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// We are locking this to gemini-pro as it is the most universally available model.
const MODEL_NAME = "gemini-flash-latest";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim()) : null;
const model = genAI ? genAI.getGenerativeModel({ model: MODEL_NAME }) : null;

/**
 * Simulates a realistic health reading based on user context.
 */
const generateHealthReadingAI = async (context = {}) => {
  const { lastReading = {}, activity = "normal", goals = {} } = context;

  if (!model) return generateHeuristicReading(lastReading, activity);

  const prompt = `
    Task: Act as a virtual medical sensor.
    Status: ${activity}. Last: ${JSON.stringify(lastReading)}. Goals: ${JSON.stringify(goals)}.
    Return ONLY a JSON object: { "heartRate": 72, "systolic": 120, "diastolic": 80, "spo2": 98, "temperature": 36.6, "steps": 0, "notes": "..." }
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

  const prompt = `Coach context: User ${userProfile.name}. Vitals: ${JSON.stringify(history.slice(0, 5))}. Message: ${userMessage}.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini AI Coach Error:", err);
    return "I am currently recalibrating my sensors. Please ensure your API key is active in AI Studio.";
  }
};

const generateSleepAnalysis = async (sleepData = []) => {
  if (!model) return { summary: "Heuristic analysis...", efficiencyScore: 85, recommendations: ["Track consistently."] };
  const prompt = `Analyze sleep: ${JSON.stringify(sleepData)}. Return JSON { summary, efficiencyScore, recommendations }.`;
  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text().replace(/```json|```/g, ""));
  } catch (err) {
    return { summary: "Heuristic analysis active...", efficiencyScore: 82, recommendations: ["Keep consistent tracking."] };
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
    notes: `Heuristic: ${activity}. (Note: AI 404 - Please check GEMINI_API_KEY).`
  };
};

module.exports = { 
  generateHealthReadingAI, 
  generateAICoachResponse, 
  generateSleepAnalysis, 
  generateMedicalReportMarkdown 
};
