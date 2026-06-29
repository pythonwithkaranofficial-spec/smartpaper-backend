const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generatePaper(prompt) {
  const retryDelays = [0, 3000, 6000, 10000]; // attempt 1 is immediate, then 3s, 6s, 10s
  const modelChain = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
  let modelIndex = 0;
  
  const startTime = Date.now();
  console.log(`[MODEL CHECK] Checking available models for generation.`);

  // Max 4 attempts based on the delays array
  for (let attempt = 1; attempt <= 4; attempt++) {
    const currentModel = modelChain[modelIndex];
    console.log(`[MODEL SELECTED] Attempt ${attempt}/4 using model: ${currentModel}`);

    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
      });

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[GENERATION SUCCESS] Model: ${currentModel} | Retries: ${attempt - 1} | Time: ${totalTime}s`);
      
      return response.text;
    } catch (error) {
      console.log(`[MODEL FAILED] Attempt ${attempt} failed with model ${currentModel}. Error: ${error.message}`);
      const isRetryable = error.message?.includes('503') || 
                          error.message?.includes('UNAVAILABLE') || 
                          error.message?.includes('TIMEOUT') || 
                          error.message?.includes('429') || 
                          error.message?.includes('RATE_LIMIT') || 
                          error.message?.includes('RESOURCE_EXHAUSTED') ||
                          error.message?.includes('DEADLINE_EXCEEDED');

      if (isRetryable && attempt < 4) {
        // Fallback to the next model if available
        if (modelIndex < modelChain.length - 1) {
          modelIndex++;
          console.log(`[FALLBACK ACTIVATED] Switching to model: ${modelChain[modelIndex]}`);
        }

        const waitTime = retryDelays[attempt];
        console.log(`Retrying in ${waitTime/1000}s...`);
        await delay(waitTime);
      } else {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`FATAL FAILURE | Time: ${totalTime}s | Reason:`, error.message);
        throw error;
      }
    }
  }
}

module.exports = { generatePaper };