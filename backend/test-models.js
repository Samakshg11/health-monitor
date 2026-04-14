const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  try {
    const result = await genAI.listModels();
    console.log("--- AVAILABLE MODELS ON YOUR KEY ---");
    result.models.forEach(m => {
      console.log(`Model: ${m.name}, Methods: ${m.supportedGenerationMethods}`);
    });
  } catch (err) {
    console.error("❌ ERROR LISTING MODELS:", err.message);
  }
}

listModels();
