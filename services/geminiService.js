const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generatePaper(prompt) {
  const retryDelays = [3000, 5000, 8000, 12000]; // 3s, 5s, 8s, 12s
  let currentModel = "gemini-2.5-flash";
  let fallbackActivated = false;
  
  const startTime = Date.now();
  console.log("Starting Gemini Generation...");

  for (let attempt = 1; attempt <= 5; attempt++) {
    if (attempt > 1) {
      console.log(`Attempt ${attempt}/5`);
    }

    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
      });

      if (fallbackActivated) {
        console.log("Gemini Success (using Fallback Model)");
      } else {
        console.log("Gemini Success");
      }
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Paper Generated Successfully. Total Generation Time: ${totalTime}s`);
      
      return response.text;
    } catch (error) {
      const isRetryable = error.message?.includes('503') || 
                          error.message?.includes('UNAVAILABLE') || 
                          error.message?.includes('TIMEOUT') || 
                          error.message?.includes('RATE_LIMIT') || 
                          error.message?.includes('RESOURCE_EXHAUSTED');

      if (isRetryable && attempt < 5) {
        // If we fail on 2.5-flash twice, fallback to 2.0-flash
        if (attempt === 2 && currentModel === "gemini-2.5-flash") {
          currentModel = "gemini-2.0-flash";
          fallbackActivated = true;
          console.log("Fallback Activated: Switching to gemini-2.0-flash");
        }

        const waitTime = retryDelays[attempt - 1];
        console.log(`Gemini error (${error.message}). Retrying in ${waitTime/1000}s...`);
        await delay(waitTime);
      } else {
        console.error(`Gemini Generation Failed after ${attempt} attempts:`, error.message);
        throw error;
      }
    }
  }
}

module.exports = { generatePaper };