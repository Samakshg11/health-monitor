const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function rawVerify() {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    console.error("❌ ERROR: GEMINI_API_KEY is not defined in your .env!");
    return;
  }

  console.log(`🔍 DIAGNOSTIC: Testing key ending in ...${key.slice(-4)}`);
  const genAI = new GoogleGenerativeAI(key);

  const modelName = "gemini-1.5-flash"; // The most common model
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent("Say 'KEY IS ACTIVE'");
    console.log("✅ SUCCESS! Google responded:", result.response.text());
  } catch (err) {
    console.error("❌ GOOGLE API ERROR:", err.message);
    if (err.message.includes("404")) {
      console.warn("⚠️  DIAGNOSIS: This key is valid but Google says this model is EXPLICITLY NOT FOUND for your account or region.");
    } else if (err.message.includes("403")) {
      console.warn("⚠️  DIAGNOSIS: Permission Denied. Your key is blocked or the API is not enabled in Google Cloud.");
    } else if (err.message.includes("429")) {
      console.warn("⚠️  DIAGNOSIS: Quota Exceeded. You've sent too many requests too fast.");
    }
  }
}

rawVerify();
