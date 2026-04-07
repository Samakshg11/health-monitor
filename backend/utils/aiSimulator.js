const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

/**
 * Simulates a realistic health reading based on user context.
 * @param {Object} context - User profile, current activity, and last reading.
 * @returns {Promise<Object>} - A health reading object.
 */
const generateHealthReadingAI = async (context = {}) => {
  const { lastReading = {}, activity = "normal", goals = {} } = context;

  if (!model) {
    // Fallback to high-quality heuristic if API key is missing
    console.warn("⚠️ GEMINI_API_KEY is missing. Using heuristic AI instead.");
    return generateHeuristicReading(lastReading, activity);
  }

  const prompt = `
    Task: Act as a virtual medical sensor for a real-time health monitor.
    User Context:
    - Last Reading: ${JSON.stringify(lastReading)}
    - Mode: ${activity} (options: sitting, walking, running, sleeping, recovering)
    - Fitness Goals: ${JSON.stringify(goals)}

    Generate the NEXT health reading in JSON format.
    The reading must be realistic, following medical trends (e.g. if running, HR increases; if sleeping, HR and temp drop). 
    Include specific details for:
    - heartRate (value between 40-180)
    - bloodPressure (systolic/diastolic)
    - spo2 (90-100)
    - temperature (35.5-39.0)
    - steps
    - hydration
    - sleepScore
    - stressLevel
    - notes (A short "AI insight" about why this state is currently happening)

    Return ONLY the JSON object. Do not include markdown formatting or explanations.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Strip markdown if AI included it
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("❌ AI Generation Error:", error.message);
    return generateHeuristicReading(lastReading, activity);
  }
};

/**
 * Fallback heuristic simulating an AI model's logic.
 */
const generateHeuristicReading = (lastReading, activity) => {
  const baseHr = lastReading.heartRate?.value || 70;
  let nextHr = baseHr;
  let nextTemp = lastReading.temperature?.value || 36.6;
  let nextStress = lastReading.stressLevel?.value || 30;

  switch (activity) {
    case "running":
      nextHr = Math.min(165, baseHr + Math.floor(Math.random() * 15) + 5);
      nextTemp = Math.min(38.5, nextTemp + 0.1);
      nextStress = Math.min(80, nextStress + 10);
      break;
    case "walking":
      nextHr = clamp(90, 120, baseHr + Math.floor(Math.random() * 5));
      nextTemp = 36.8;
      nextStress = 45;
      break;
    case "sleeping":
      nextHr = Math.max(45, baseHr - 2);
      nextTemp = 36.2;
      nextStress = 10;
      break;
    default:
      nextHr = clamp(65, 85, baseHr + (Math.random() > 0.5 ? 1 : -1));
      nextTemp = 36.6;
      nextStress = 30;
  }

  return {
    heartRate: { value: nextHr },
    bloodPressure: { systolic: 120, diastolic: 80 },
    spo2: { value: 98 },
    temperature: { value: nextTemp },
    stressLevel: { value: nextStress },
    source: "estimated",
    notes: `Simulated state: ${activity}. Trends are following a predictive health model.`
  };
};

/**
 * Generates a response from the AI Health Coach based on user history.
 * @param {string} userMessage - Message from the user.
 * @param {Array} history - Array of recent health readings.
 * @returns {Promise<string>} - The coach's response.
 */
const generateAICoachResponse = async (userMessage, history = [], userProfile = {}) => {
  if (!model) {
    return "I'm currently in offline mode. Please add a GEMINI_API_KEY to my environment to unlock my full clinical-grade coaching capabilities.";
  }

  const prompt = `
    Context: You are "VitalWatch Coach", an elite AI health assistant. 
    User Profile: ${JSON.stringify(userProfile)}
    Recent Health Data: ${JSON.stringify(history.slice(0, 10))}
    
    Guidelines:
    1. Be highly analytical, empathetic, and professional.
    2. Use the provided health data to give specific evidence-based answers. 
    3. If you see a dangerous trend (e.g. consistently high BP), advise the user to consult a professional.
    4. Keep responses concise but information-rich.
    
    User Message: "${userMessage}"
    
    Response:
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("❌ AI Coach Error:", error.message);
    return "I'm having trouble processing your request right now. Let me check my sensors and try again.";
  }
};

/**
 * Detailed analysis of sleep trends.
 */
const generateSleepAnalysis = async (sleepData = []) => {
  if (!model) return { summary: "Offline: Add API key for detailed sleep analysis.", suggestions: [] };

  const prompt = `
    Analyze this user's sleep history and recover state:
    ${JSON.stringify(sleepData)}

    Guidelines:
    1. Assess the balance between Sleep Score and Stress Levels.
    2. Suggest 3 specific biological adjustments based on their data.
    3. Return a clean JSON object: { "summary": "...", "efficiencyScore": 0-100, "recommendations": ["...", "..."] }
  `;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text().replace(/```json|```/g, ""));
  } catch (err) {
    return { summary: "Could not perform sleep analysis loop.", recommendations: ["Keep your tracker stream consistent."] };
  }
};

/**
 * Professional medical document generation context.
 */
const generateMedicalReportMarkdown = async (patientName, readings = []) => {
  if (!model) return "# VitalWatch Snapshot\n\nPlease add an API key for expert clinical report generation.";

  const prompt = `
    Create a formal Clinical Health Summary for: ${patientName}.
    Latest Data: ${JSON.stringify(readings.slice(0, 30))}

    Guidelines:
    1. Organize into: Patient Overview, Vital Signs Summary (with trend analysis), Clinical Observations, and Risk Assessment.
    2. Use professional medical language.
    3. Ensure a clear disclaimer that this is an AI-generated report.
    4. Keep it to about 500 words.
    5. Return in Markdown format.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    return "# Clinical Reporting Error\n\nAI service is currently unavailable.";
  }
};

const clamp = (min, max, val) => Math.max(min, Math.min(max, val));

module.exports = { generateHealthReadingAI, generateAICoachResponse, generateSleepAnalysis, generateMedicalReportMarkdown };
