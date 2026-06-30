require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function testImagen() {
  try {
    console.log("Calling Imagen 3...");
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: `A clean, black and white educational diagram for Physics. Electric Circuit. Line art style, clear labels if applicable, white background, suitable for printing on a test paper. No watermarks. No decorative elements.`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
        }
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
       console.log("SUCCESS");
    } else {
       console.log("NO IMAGES GENERATED");
    }
  } catch (error) {
    console.error(`[IMAGE GEN ERROR] ${error.message}`);
  }
}

testImagen();
