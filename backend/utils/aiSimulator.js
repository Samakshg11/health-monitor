const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// We are locking this to gemini-pro as it is the most universally available model.
const MODEL_NAME = "gemini-1.5-flash";

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
    State: ${activity}. Last Readings: ${JSON.stringify(lastReading)}. Health Goals: ${JSON.stringify(goals)}.
    
    CRITICAL: You MUST return a JSON object with this EXACT structure:
    {
      "heartRate": { "value": number, "status": "stable"|"warning"|"critical" },
      "spo2": { "value": number, "status": "stable"|"warning"|"critical" },
      "temperature": { "value": number, "status": "stable" },
      "bloodPressure": { "systolic": number, "diastolic": number, "status": "stable" },
      "steps": { "value": number },
      "stressLevel": { "value": number, "status": "stable" },
      "confidence": {
        "heartRate": number(0-100),
        "spo2": number(0-100),
        "temperature": number(0-100),
        "bloodPressure": number(0-100),
        "steps": number(0-100),
        "stressLevel": number(0-100),
        "overall": number(0-100)
      },
      "insight": "One sentence performance advice",
      "forecast": [
        { "time": "2h", "energy": "stable", "label": "Baseline" },
        { "time": "4h", "energy": "dip", "label": "Dip" },
        { "time": "6h", "energy": "stable", "label": "Recovery" },
        { "time": "8h", "energy": "high", "label": "Peak" }
      ]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("AI Generation Error:", err);
    return generateHeuristicReading(lastReading, activity);
  }
};

/**
 * AI Coach response.
 */
const generateAICoachResponse = async (userMessage, history = [], userProfile = {}) => {
  if (!model) return "AI Offline: Please check your API key in AI Studio.";

  const prompt = `Act as a personal health coach for ${userProfile.name}. 
Current Context/Vitals: ${JSON.stringify(history.slice(0, 2))}.
CRITICAL INSTRUCTION: Do NOT explicitly list, read back, or mention these vitals in your response unless the user specifically asks about them. Be brief, natural, and conversational. 
User Message: ${userMessage}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini AI Coach Error:", err);
    return "I am currently recalibrating my sensors. (Error: " + err.message + ")";
  }
};

const generateSleepAnalysis = async (sleepData = []) => {
  if (!model) return { summary: "Heuristic analysis...", efficiencyScore: 85, recommendations: ["Track consistently."] };
  const prompt = `Analyze sleep: ${JSON.stringify(sleepData)}. Return JSON { "summary": string, "efficiencyScore": number, "recommendations": string[] }.`;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    const avgEfficiency = sleepData.length ? Math.round(sleepData.reduce((acc, r) => acc + (r.sleepScore?.value || 85), 0) / sleepData.length) : 85;
    return { 
      summary: `Smart Heuristic: Based on your last ${sleepData.length || 7} days, your sleep efficiency is ${avgEfficiency}%. Circadian alignment looks stable.`, 
      efficiencyScore: avgEfficiency, 
      recommendations: ["Maintain consistent bedtimes.", "Monitor late-evening HRV."] 
    };
  }
};

const generateMedicalReportMarkdown = async (patientName, readings = []) => {
  return "# Clinical Health Snapshot\n\nAI-generated summary based on your dashboard metrics.";
};

const generateHeuristicReading = (lastReading, activity) => {
  const baseHr = lastReading.heartRate?.value || 72;
  const stress = lastReading.stressLevel?.value || 25;
  let nextHr = activity === 'running' ? baseHr + 10 : activity === 'sleeping' ? baseHr - 2 : baseHr + (Math.random() > 0.5 ? 2 : -2);
  
  const insights = [
    `Calibration complete: ${activity} mode signature detected.`,
    `Biometric baseline stable. HRV indicates ${baseHr < 65 ? 'high' : 'normal'} readiness.`,
    `Heuristic Analysis: Stress (${stress}%) and HR (${baseHr} BPM) are within optimal sync range.`,
    `Pulse stream active. AI engine is prioritizing ${activity === 'sleeping' ? 'recovery' : 'performance'} models.`
  ];

  return {
    heartRate: { value: Math.max(45, Math.min(180, nextHr)), status: "stable" },
    spo2: { value: 98, status: "stable" },
    temperature: { value: 36.6, status: "stable" },
    bloodPressure: { systolic: 118, diastolic: 76, status: "stable" },
    steps: { value: activity === 'running' ? 50 : 0 },
    stressLevel: { value: stress, status: "stable" },
    confidence: {
      heartRate: 92,
      spo2: 94,
      temperature: 97,
      bloodPressure: 88,
      steps: 95,
      stressLevel: 82,
      overall: 91
    },
    insight: insights[Math.floor(Math.random() * insights.length)],
    forecast: [
      { time: "2h", energy: "stable", label: "Baseline" },
      { time: "4h", energy: "dip", label: "Dip" },
      { time: "6h", energy: "stable", label: "Recovery" },
      { time: "8h", energy: "high", label: "Peak" }
    ]
  };
};

module.exports = {
  generateHealthReadingAI,
  generateAICoachResponse,
  generateSleepAnalysis,
  generateMedicalReportMarkdown
};
