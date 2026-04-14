const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function list() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  try {
    const list = await genAI.getGenerativeModel({ model: "gemini-pro" }).listModels();
    console.log(JSON.stringify(list, null, 2));
  } catch (err) {
    console.error(err);
  }
}
list();
