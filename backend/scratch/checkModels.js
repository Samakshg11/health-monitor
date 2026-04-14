const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function check() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  try {
    // The listModels method is on the genAI object in newer SDKs
    const models = await genAI.listModels();
    console.log("AVAILABLE MODELS:");
    models.models.forEach(m => console.log(`- ${m.name}`));
  } catch (err) {
    console.log("ERROR LISTING MODELS:", err.message);
  }
}
check();
